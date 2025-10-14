-- Create technical indicators cache table
CREATE TABLE IF NOT EXISTS public.technical_indicators_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument text NOT NULL,
  indicator text NOT NULL,
  interval text NOT NULL,
  time_period integer NOT NULL,
  date text NOT NULL,
  value numeric NOT NULL,
  cached_at timestamptz DEFAULT now(),
  CONSTRAINT technical_indicators_cache_unique UNIQUE (instrument, indicator, interval, time_period, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tech_indicators_lookup 
ON public.technical_indicators_cache(instrument, indicator, interval, time_period, date DESC);

-- RLS policies
ALTER TABLE public.technical_indicators_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technical indicators cache readable by all authenticated users"
ON public.technical_indicators_cache
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Technical indicators cache writable by service role"
ON public.technical_indicators_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);