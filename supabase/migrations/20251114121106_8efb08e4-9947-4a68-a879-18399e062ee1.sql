-- Create reactivation_requests table
CREATE TABLE public.reactivation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  broker_name text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text
);

-- Create unique constraint: only one pending request per user
CREATE UNIQUE INDEX idx_reactivation_requests_user_pending 
ON public.reactivation_requests(user_id) 
WHERE status = 'pending';

-- Create indexes for performance
CREATE INDEX idx_reactivation_requests_status ON public.reactivation_requests(status);
CREATE INDEX idx_reactivation_requests_user_id ON public.reactivation_requests(user_id);

-- Enable RLS
ALTER TABLE public.reactivation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own reactivation requests
CREATE POLICY "Users can view their own reactivation requests"
ON public.reactivation_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reactivation requests (unique constraint handles the pending limit)
CREATE POLICY "Users can create reactivation requests"
ON public.reactivation_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Super users can manage all reactivation requests
CREATE POLICY "Super users can manage all reactivation requests"
ON public.reactivation_requests FOR ALL
USING (public.has_role(auth.uid(), 'super_user'::app_role));