
-- Add INSERT policy on profiles so authenticated users can create their own profile
-- This fixes the silent RLS violation when the Google OAuth fallback tries to insert a profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
