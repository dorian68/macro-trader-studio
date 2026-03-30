
-- Table for audit trail of deleted accounts
CREATE TABLE public.deleted_accounts_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  email_hash TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  deletion_type TEXT NOT NULL DEFAULT 'admin' CHECK (deletion_type IN ('admin', 'self_service')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only super_user/admin can read
ALTER TABLE public.deleted_accounts_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super users can view audit trail"
  ON public.deleted_accounts_audit
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_user'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service role can manage audit trail"
  ON public.deleted_accounts_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for lookups by original user
CREATE INDEX idx_deleted_accounts_audit_user_id ON public.deleted_accounts_audit(original_user_id);
CREATE INDEX idx_deleted_accounts_audit_email_hash ON public.deleted_accounts_audit(email_hash);
