-- Persist Zaza AI chat history per user per organization.
-- Each row is a single message (user or assistant turn).
-- conversation_id groups turns into a session.

CREATE TABLE IF NOT EXISTS public.zaza_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL,
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              text NOT NULL CHECK (role IN ('user', 'assistant')),
  content           text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zaza_conversations_org_user_idx
  ON public.zaza_conversations (organization_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS zaza_conversations_conv_idx
  ON public.zaza_conversations (conversation_id, created_at ASC);

ALTER TABLE public.zaza_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only read their own org's conversations
CREATE POLICY "Org members can view zaza conversations"
  ON public.zaza_conversations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
      )
      AND (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- Edge function (service role) inserts; regular users cannot insert directly
CREATE POLICY "Service role can insert zaza conversations"
  ON public.zaza_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversation history
CREATE POLICY "Users can delete their own zaza conversations"
  ON public.zaza_conversations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
