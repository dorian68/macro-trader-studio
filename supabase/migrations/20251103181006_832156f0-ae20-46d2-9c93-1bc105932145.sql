-- ÉTAPE 1: Nettoyage des crédits engagés orphelins
-- Nettoyer les crédits engagés pour les jobs complétés/échoués
DELETE FROM public.credits_engaged
WHERE job_id IN (
  SELECT id FROM public.jobs 
  WHERE status IN ('completed', 'failed', 'error')
);

-- Log pour audit
DO $$
DECLARE
  deleted_count INT;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphan engaged credits', deleted_count;
END $$;