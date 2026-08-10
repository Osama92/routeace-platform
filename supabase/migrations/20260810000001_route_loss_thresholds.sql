-- ============================================================
-- ROUTE PROFITABILITY THRESHOLDS (per organization)
-- ============================================================
-- The Loss-Making Route Detector previously hardcoded what counts as a
-- loss. What a business treats as unacceptable differs — a haulier
-- running high-volume/low-margin lanes has a very different floor from
-- one running specialist freight — so the threshold must be the
-- business owner's setting, not a developer's assumption.
--
-- margin_protection_rules already exists but carries no organization_id,
-- so it cannot express a per-tenant rule. This table is org-scoped.
--
-- Three independent tests, any of which can flag a route. All are
-- optional; a NULL means "do not apply this test".
--   min_margin_percent  - flag when gross margin falls below this
--   min_profit_per_trip - flag when average profit per trip falls below
--   min_naira_per_km    - flag when revenue per km falls below
-- ============================================================

CREATE TABLE IF NOT EXISTS public.route_profitability_settings (
  organization_id     uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  min_margin_percent  numeric,
  min_profit_per_trip numeric,
  min_naira_per_km    numeric,
  updated_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_profitability_settings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation. The platform-wide tenant_isolation_gate targets
-- tables with an organization_id, but this table is created after that
-- migration ran, so the policy is declared explicitly here.
DROP POLICY IF EXISTS route_profit_settings_tenant ON public.route_profitability_settings;
CREATE POLICY route_profit_settings_tenant
  ON public.route_profitability_settings
  AS RESTRICTIVE FOR ALL TO public
  USING (
    organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    OR public.is_platform_owner(auth.uid())
  );

-- Anyone in the org may read the threshold (analytics screens need it);
-- only owners/admins/finance may change it.
DROP POLICY IF EXISTS route_profit_settings_read ON public.route_profitability_settings;
CREATE POLICY route_profit_settings_read
  ON public.route_profitability_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS route_profit_settings_write ON public.route_profitability_settings;
CREATE POLICY route_profit_settings_write
  ON public.route_profitability_settings FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'org_admin')
    OR public.has_role(auth.uid(), 'finance_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'org_admin')
    OR public.has_role(auth.uid(), 'finance_manager')
  );

DROP TRIGGER IF EXISTS trg_route_profit_settings_updated ON public.route_profitability_settings;
CREATE TRIGGER trg_route_profit_settings_updated
  BEFORE UPDATE ON public.route_profitability_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed every existing organization with a conservative default: a route
-- is a loss when gross margin is negative. This is the least opinionated
-- starting point — it flags only routes genuinely losing money, rather
-- than imposing a margin target the business has not agreed to.
INSERT INTO public.route_profitability_settings (organization_id, min_margin_percent)
SELECT id, 0 FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;
