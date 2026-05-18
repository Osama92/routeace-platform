-- P6: Add organization_id to customers table for tenant isolation
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);

-- Backfill from creator's active org
UPDATE public.customers
SET organization_id = (
  SELECT organization_id FROM public.organization_members
  WHERE user_id = customers.created_by AND is_active = true
  LIMIT 1
)
WHERE organization_id IS NULL AND created_by IS NOT NULL;

-- P9: Performance indexes for org-scoped queries (cannot use CONCURRENTLY in a transaction; plain CREATE is fine in migration)
CREATE INDEX IF NOT EXISTS idx_dispatches_org_created ON public.dispatches(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_org_status ON public.drivers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_org_status ON public.staff(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON public.vehicles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user_active ON public.organization_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_members_org_active ON public.organization_members(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_approval ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_driver_status_date ON public.dispatches(driver_id, status, created_at);