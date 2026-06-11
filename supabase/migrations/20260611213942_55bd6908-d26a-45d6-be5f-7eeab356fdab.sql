
-- 1. Remove user-facing UPDATE on user_credits (allows self-inflation of credits/plan)
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- 2. Storage policies for private buckets (abcg-insights, AlphaLens_PDF)
DROP POLICY IF EXISTS "Authenticated can read abcg-insights" ON storage.objects;
CREATE POLICY "Authenticated can read abcg-insights"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'abcg-insights');

DROP POLICY IF EXISTS "Admins manage abcg-insights" ON storage.objects;
CREATE POLICY "Admins manage abcg-insights"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'abcg-insights'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_user'::app_role))
  )
  WITH CHECK (
    bucket_id = 'abcg-insights'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_user'::app_role))
  );

DROP POLICY IF EXISTS "Authenticated can read AlphaLens_PDF" ON storage.objects;
CREATE POLICY "Authenticated can read AlphaLens_PDF"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'AlphaLens_PDF');

DROP POLICY IF EXISTS "Admins manage AlphaLens_PDF" ON storage.objects;
CREATE POLICY "Admins manage AlphaLens_PDF"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'AlphaLens_PDF'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_user'::app_role))
  )
  WITH CHECK (
    bucket_id = 'AlphaLens_PDF'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_user'::app_role))
  );
