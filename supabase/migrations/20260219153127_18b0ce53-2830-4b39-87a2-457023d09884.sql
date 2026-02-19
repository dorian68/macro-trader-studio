
-- =============================================
-- AURA Conversation Manager: threads + messages
-- =============================================

-- 1. aura_threads
CREATE TABLE public.aura_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_aura_threads_user_last_msg ON public.aura_threads (user_id, last_message_at DESC);

ALTER TABLE public.aura_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
  ON public.aura_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
  ON public.aura_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.aura_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON public.aura_threads FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_aura_threads_updated_at
  BEFORE UPDATE ON public.aura_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. aura_messages
CREATE TABLE public.aura_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.aura_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  seq bigint GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX idx_aura_messages_thread_seq ON public.aura_messages (thread_id, seq ASC);

ALTER TABLE public.aura_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.aura_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.aura_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.aura_threads WHERE id = thread_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own messages"
  ON public.aura_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.aura_messages FOR DELETE
  USING (auth.uid() = user_id);
