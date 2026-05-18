-- ============ NEW TABLES ============

CREATE TABLE IF NOT EXISTS public.maintenance_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('ground','schedule_repair','order_parts','inspect','dispose','release_grounding')),
  confidence_score INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'predictive_engine',
  reasoning TEXT,
  recommended_action TEXT,
  related_prediction_id UUID,
  related_inspection_id UUID,
  related_work_order_id UUID,
  approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval','approved','rejected','auto_executed','expired')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  executed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_decisions_status ON public.maintenance_decisions(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_decisions_vehicle ON public.maintenance_decisions(vehicle_id);

CREATE TABLE IF NOT EXISTS public.vehicle_grounding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  grounded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grounded_by UUID,
  ground_reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'critical' CHECK (severity IN ('warning','critical','catastrophic')),
  triggered_by_decision_id UUID REFERENCES public.maintenance_decisions(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  released_by UUID,
  release_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_grounding_active ON public.vehicle_grounding(vehicle_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.alert_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_kind TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','in_app','whatsapp')),
  recipient TEXT NOT NULL,
  recipient_user_id UUID,
  subject TEXT,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed','skipped')),
  provider TEXT,
  provider_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_kind ON public.alert_dispatch_log(alert_kind, created_at DESC);

-- ============ EXTENSIONS TO EXISTING TABLES ============

ALTER TABLE public.vehicle_health_components
  ADD COLUMN IF NOT EXISTS is_injector_critical BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_injector_service_date DATE,
  ADD COLUMN IF NOT EXISTS injector_inefficiency_factor NUMERIC NOT NULL DEFAULT 1.0;

ALTER TABLE public.fleet_maintenance_orders
  ADD COLUMN IF NOT EXISTS workshop_state TEXT NOT NULL DEFAULT 'queued'
    CHECK (workshop_state IN ('queued','in_repair','awaiting_parts','awaiting_qc','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ;

-- ============ TRIGGERS ============

DROP TRIGGER IF EXISTS trg_maintenance_decisions_updated_at ON public.maintenance_decisions;
CREATE TRIGGER trg_maintenance_decisions_updated_at
  BEFORE UPDATE ON public.maintenance_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vehicle_grounding_updated_at ON public.vehicle_grounding;
CREATE TRIGGER trg_vehicle_grounding_updated_at
  BEFORE UPDATE ON public.vehicle_grounding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============

ALTER TABLE public.maintenance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_grounding     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_dispatch_log    ENABLE ROW LEVEL SECURITY;

-- maintenance_decisions: ops/admin can view + propose; only admins/org_admin/ops_manager can approve
DROP POLICY IF EXISTS "ops_admin_view_decisions" ON public.maintenance_decisions;
CREATE POLICY "ops_admin_view_decisions" ON public.maintenance_decisions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "ops_admin_insert_decisions" ON public.maintenance_decisions;
CREATE POLICY "ops_admin_insert_decisions" ON public.maintenance_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
  );

DROP POLICY IF EXISTS "ops_admin_update_decisions" ON public.maintenance_decisions;
CREATE POLICY "ops_admin_update_decisions" ON public.maintenance_decisions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
  );

-- vehicle_grounding: same access tier as decisions
DROP POLICY IF EXISTS "ops_admin_view_grounding" ON public.vehicle_grounding;
CREATE POLICY "ops_admin_view_grounding" ON public.vehicle_grounding
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
    OR public.is_finance_manager(auth.uid())
  );

DROP POLICY IF EXISTS "ops_admin_insert_grounding" ON public.vehicle_grounding;
CREATE POLICY "ops_admin_insert_grounding" ON public.vehicle_grounding
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
  );

DROP POLICY IF EXISTS "ops_admin_update_grounding" ON public.vehicle_grounding;
CREATE POLICY "ops_admin_update_grounding" ON public.vehicle_grounding
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
  );

-- alert_dispatch_log: read-only for admins/ops; inserts via service role only
DROP POLICY IF EXISTS "admin_read_alert_log" ON public.alert_dispatch_log;
CREATE POLICY "admin_read_alert_log" ON public.alert_dispatch_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')
    OR public.is_org_admin(auth.uid()) OR public.is_ops_manager(auth.uid())
  );
