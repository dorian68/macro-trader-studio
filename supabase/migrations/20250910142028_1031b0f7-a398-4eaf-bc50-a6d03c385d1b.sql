-- Create table for user request history
CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('ai_trade_setup', 'macro_commentary', 'reports')),
  instrument TEXT NOT NULL,
  parameters JSONB,
  request_content TEXT NOT NULL,
  response_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user requests
CREATE POLICY "Users can view their own requests" 
ON public.user_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" 
ON public.user_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests" 
ON public.user_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_requests_updated_at
BEFORE UPDATE ON public.user_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();