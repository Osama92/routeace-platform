CREATE TABLE IF NOT EXISTS public.coo_ai_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'dispatch_delay','vehicle_grounded','payment_anomaly',
    'sla_breach_risk','cost_spike','fraud_detected',
    'driver_performance','maintenance_due','ai_recommendation'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical','warning','info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  confidence_score NUMERIC(5,2),
  financial_impact NUMERIC(15,2),
  reference_type TEXT,
  reference_id UUID,
  recommended_action TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_by UUID REFERENCES auth.users(id),
  read_at TIMESTAMPTZ,
  escalated_to_super_admin BOOLEAN NOT NULL DEFAULT false,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coo_ai_alerts_org_unread
  ON public.coo_ai_alerts(organization_id, is_read, created_at DESC);

ALTER TABLE public.coo_ai_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_admin and super_admin can manage coo_alerts" ON public.coo_ai_alerts;
CREATE POLICY "org_admin and super_admin can manage coo_alerts"
  ON public.coo_ai_alerts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.coo_ai_alerts;