-- Add soft delete columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.is_deleted IS 'Soft delete flag: true if user is deactivated';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when user was soft deleted';
COMMENT ON COLUMN public.profiles.deleted_by IS 'UUID of the super_user who performed the soft delete';