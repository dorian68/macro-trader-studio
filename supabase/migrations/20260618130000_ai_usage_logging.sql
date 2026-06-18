-- Per-request AI usage logging (model + tokens + computed cost).
--
-- Additive and non-breaking: a new table that edge functions write to via a
-- best-effort, error-swallowing logger. Nothing in existing flows depends on it.
-- Captures real usage where it is actually available (AURA, and the AWS engine
-- responses whenever they include a `usage`/`model` field).

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid,
  job_id            uuid,
  feature           text,
  source            text NOT NULL,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  cost_usd          numeric,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_job_id ON public.ai_usage (job_id);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Only super users may read it (service_role bypasses RLS for the writes).
DROP POLICY IF EXISTS "Super users can read ai_usage" ON public.ai_usage;
CREATE POLICY "Super users can read ai_usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_user'));
