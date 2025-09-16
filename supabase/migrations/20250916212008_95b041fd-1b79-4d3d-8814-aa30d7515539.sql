-- Allow admins and super users to view all jobs, not just their own
CREATE POLICY "Admins and super users can view all jobs"
ON public.jobs
FOR SELECT
USING (is_admin_or_super_user(auth.uid()));