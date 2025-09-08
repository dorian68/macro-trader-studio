-- Fix infinite recursion in profiles policies
DROP POLICY IF EXISTS "Admins and super users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super users can update all profiles" ON public.profiles;

-- Create a security definer function to check admin/super_user roles
CREATE OR REPLACE FUNCTION public.is_admin_or_super_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_admin_or_super_user.user_id 
    AND role IN ('admin', 'super_user')
  );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Admins and super users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_or_super_user(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins and super users can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin_or_super_user(auth.uid()) OR auth.uid() = user_id);