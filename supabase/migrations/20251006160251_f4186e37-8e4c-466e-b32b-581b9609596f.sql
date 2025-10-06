-- Drop ancien trigger et fonction
DROP TRIGGER IF EXISTS trigger_auto_release_credits ON public.jobs;
DROP FUNCTION IF EXISTS public.auto_release_credits();

-- Nouvelle fonction qui débite conditionnellement
CREATE OR REPLACE FUNCTION public.auto_manage_credits()
RETURNS TRIGGER AS $$
DECLARE
  engaged_feature TEXT;
  credit_column TEXT;
BEGIN
  -- Récupérer la feature depuis l'engagement
  SELECT feature INTO engaged_feature 
  FROM public.credits_engaged 
  WHERE job_id = NEW.id 
  LIMIT 1;
  
  -- Mapper la feature vers la colonne de crédit
  credit_column := CASE engaged_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE 'credits_ideas_remaining'
  END;

  IF NEW.status = 'completed' AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    -- Job réussi : DÉBITER le crédit dans user_credits
    EXECUTE format('
      UPDATE public.user_credits
      SET %I = %I - 1, updated_at = now()
      WHERE user_id = $1 AND %I > 0
    ', credit_column, credit_column, credit_column)
    USING NEW.user_id;
    
    -- Libérer l'engagement
    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
    
    RAISE LOG 'Job % completed: 1 credit debited from % and engagement released', NEW.id, credit_column;
    
  ELSIF NEW.status IN ('failed', 'error') AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    -- Job échoué : JUSTE libérer l'engagement, AUCUN débit
    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
    
    RAISE LOG 'Job % failed: engagement released, NO credit debited', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Créer le nouveau trigger
CREATE TRIGGER trigger_auto_manage_credits
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_manage_credits();