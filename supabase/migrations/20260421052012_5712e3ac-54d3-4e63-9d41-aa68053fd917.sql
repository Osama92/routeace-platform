-- 1. Add mode columns to tenant_config
ALTER TABLE public.tenant_config
  ADD COLUMN IF NOT EXISTS tenant_mode TEXT NOT NULL DEFAULT 'LOGISTICS_COMPANY'
    CHECK (tenant_mode IN ('LOGISTICS_COMPANY', 'LOGISTICS_DEPARTMENT')),
  ADD COLUMN IF NOT EXISTS mode_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_autonomy_mode TEXT NOT NULL DEFAULT 'approval'
    CHECK (ai_autonomy_mode IN ('full', 'approval', 'manual')),
  ADD COLUMN IF NOT EXISTS enable_website_builder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uses_warehouse_dispatch BOOLEAN NOT NULL DEFAULT false;

-- 2. Outbound requests table (warehouse → dispatch bridge)
CREATE TABLE IF NOT EXISTS public.outbound_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  created_by UUID NOT NULL,
  request_number TEXT NOT NULL UNIQUE DEFAULT ('OBR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  warehouse_name TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  internal_stakeholder TEXT,
  goods_description TEXT,
  total_weight_kg NUMERIC,
  total_volume_m3 NUMERIC,
  requested_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_transit','delivered','cancelled')),
  linked_dispatch_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_requests_org ON public.outbound_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_outbound_requests_status ON public.outbound_requests(status);

ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's outbound requests
CREATE POLICY "Org members view outbound requests"
  ON public.outbound_requests FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR created_by = auth.uid()
  );

-- Org admins, ops managers, and super admins can create
CREATE POLICY "Authorized roles create outbound requests"
  ON public.outbound_requests FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND (
      public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

CREATE POLICY "Authorized roles update outbound requests"
  ON public.outbound_requests FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'org_admin')
    OR public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Super admin deletes outbound requests"
  ON public.outbound_requests FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER trg_outbound_requests_updated
  BEFORE UPDATE ON public.outbound_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();