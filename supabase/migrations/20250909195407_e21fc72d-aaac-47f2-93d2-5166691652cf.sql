-- Activer RLS sur les tables manquantes
ALTER TABLE public.abcg_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abcg_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices_tv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators_tv ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour les tables publiques (lecture seule pour utilisateurs authentifiés)
CREATE POLICY "Authenticated users can read chunks" ON public.abcg_chunks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read documents" ON public.abcg_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read TV prices" ON public.prices_tv
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read TV indicators" ON public.indicators_tv
  FOR SELECT TO authenticated USING (true);