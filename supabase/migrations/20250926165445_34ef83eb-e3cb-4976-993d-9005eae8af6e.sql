-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "All authenticated users can read active brokers" ON public.brokers;

-- Créer une nouvelle politique qui permet l'accès aux brokers actifs même aux utilisateurs non authentifiés
CREATE POLICY "Anyone can read active brokers" 
ON public.brokers 
FOR SELECT 
USING (status = 'active'::text);