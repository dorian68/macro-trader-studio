-- Add user_plan column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_plan plan_type DEFAULT 'free_trial'::plan_type;

-- Create index for better performance on user_plan queries  
CREATE INDEX idx_profiles_user_plan ON public.profiles(user_plan);

-- Update RLS policies to allow SuperUsers to view and update user_plan
-- The existing RLS policies already allow admins and super users to view/update profiles