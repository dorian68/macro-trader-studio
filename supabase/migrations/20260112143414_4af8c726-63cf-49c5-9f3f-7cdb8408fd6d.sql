-- Nettoyage des crédits engagés orphelins pour TOUS les utilisateurs

-- Supprimer les crédits engagés dont les jobs sont terminés, en erreur ou inexistants
DELETE FROM public.credits_engaged
WHERE 
  -- Job n'existe plus
  job_id NOT IN (SELECT id FROM public.jobs)
  OR
  -- Job terminé ou en erreur
  job_id IN (SELECT id FROM public.jobs WHERE status IN ('completed', 'error'))
  OR
  -- Engagé depuis plus d'1 heure (stale)
  engaged_at < NOW() - INTERVAL '1 hour';

-- Marquer les jobs orphelins en pending depuis plus d'1 heure comme 'error' (valeur autorisée)
UPDATE public.jobs 
SET status = 'error', 
    updated_at = NOW()
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';