-- Table pour stocker le provider global (TwelveData ou TradingView)
CREATE TABLE IF NOT EXISTS public.chart_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'twelvedata' CHECK (provider IN ('twelvedata', 'tradingview')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS : Lecture pour tous, écriture pour super_user uniquement
ALTER TABLE public.chart_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chart provider"
  ON public.chart_provider_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super users can manage chart provider"
  ON public.chart_provider_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_user'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_user'::app_role));

-- Insérer la valeur par défaut
INSERT INTO public.chart_provider_settings (provider) 
VALUES ('twelvedata')
ON CONFLICT DO NOTHING;