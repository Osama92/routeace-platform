CREATE INDEX IF NOT EXISTS idx_dispatches_org_status
  ON public.dispatches(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_dispatches_org_status_date
  ON public.dispatches(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatches_org_sla
  ON public.dispatches(organization_id, sla_status)
  WHERE sla_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_org_status
  ON public.vehicles(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_ld_jobs_org_status
  ON public.ld_transporter_jobs(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_org_members_triple
  ON public.organization_members(user_id, organization_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles(id);