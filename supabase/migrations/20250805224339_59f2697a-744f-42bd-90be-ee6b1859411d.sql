-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  average_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC DEFAULT 0,
  market_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI recommendations table
CREATE TABLE public.ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'BUY', 'SELL', 'HOLD'
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,
  target_price NUMERIC,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolios
CREATE POLICY "Users can view their own portfolios" 
ON public.portfolios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios" 
ON public.portfolios 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" 
ON public.portfolios 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" 
ON public.portfolios 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for positions
CREATE POLICY "Users can view positions in their portfolios" 
ON public.positions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = positions.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create positions in their portfolios" 
ON public.positions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = positions.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update positions in their portfolios" 
ON public.positions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = positions.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete positions in their portfolios" 
ON public.positions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = positions.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

-- Create RLS policies for AI recommendations
CREATE POLICY "Users can view recommendations for their portfolios" 
ON public.ai_recommendations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = ai_recommendations.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create recommendations for their portfolios" 
ON public.ai_recommendations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = ai_recommendations.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recommendations for their portfolios" 
ON public.ai_recommendations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = ai_recommendations.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recommendations for their portfolios" 
ON public.ai_recommendations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE portfolios.id = ai_recommendations.portfolio_id 
    AND portfolios.user_id = auth.uid()
  )
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_portfolios_updated_at
BEFORE UPDATE ON public.portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated_column();

CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated_column();

-- Create indexes for better performance
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX idx_positions_symbol ON public.positions(symbol);
CREATE INDEX idx_ai_recommendations_portfolio_id ON public.ai_recommendations(portfolio_id);
CREATE INDEX idx_ai_recommendations_symbol ON public.ai_recommendations(symbol);