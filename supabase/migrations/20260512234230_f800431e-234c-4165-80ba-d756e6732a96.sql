CREATE TABLE IF NOT EXISTS public.client_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID,
  organization_id UUID,
  recipient_email TEXT,
  dispatch_status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT false,
  provider_message_id TEXT,
  provider_response JSONB,
  error_message TEXT,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnl_org ON public.client_notification_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnl_dispatch ON public.client_notification_log(dispatch_id, created_at DESC);

ALTER TABLE public.client_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their notification logs"
  ON public.client_notification_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );