-- =====================================================================
-- RLS HARDENING — Eliminate cross-tenant data exposure
-- Fixes: CROSS_TENANT_PII_EXPOSURE, CROSS_TENANT_OPERATIONAL_DATA,
--        CROSS_TENANT_FINANCIAL_DATA, EXPOSED_SENSITIVE_DATA,
--        REALTIME_CROSS_TENANT_BROADCAST
-- =====================================================================

-- ---------- Helper: combined role + org-membership check ---------------
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, VARIADIC _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR (
      _org_id IS NOT NULL
      AND public.is_org_member(_user_id, _org_id)
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = ANY(_roles)
      )
    );
$$;

-- =====================================================================
-- 1) drivers / partners / customers / staff — drop role-only SELECTs
-- =====================================================================
DROP POLICY IF EXISTS "Role-restricted driver access" ON public.drivers;
DROP POLICY IF EXISTS "Admin/Operations/Dispatcher can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Ops manager can manage drivers" ON public.drivers;

CREATE POLICY "Drivers role+org manage"
ON public.drivers FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
           OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager')
           OR public.has_role(auth.uid(),'operations') OR public.has_role(auth.uid(),'dispatcher')
           OR public.has_role(auth.uid(),'finance_manager')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS "Role-restricted partner access" ON public.partners;
DROP POLICY IF EXISTS "Admin/Operations can manage partners" ON public.partners;

CREATE POLICY "Partners role+org manage"
ON public.partners FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'org_admin')
           OR public.has_role(auth.uid(),'operations') OR public.has_role(auth.uid(),'ops_manager')
           OR public.has_role(auth.uid(),'dispatcher')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS "Role-restricted customer access" ON public.customers;
DROP POLICY IF EXISTS "Admin/Operations can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/Operations/Support can insert customers" ON public.customers;

CREATE POLICY "Customers role+org manage"
ON public.customers FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS "Admin staff full access" ON public.staff;
DROP POLICY IF EXISTS "Admins and ops can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins and ops can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

CREATE POLICY "Staff self read"
ON public.staff FOR SELECT TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Staff role+org manage"
ON public.staff FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'org_admin')
           OR public.has_role(auth.uid(),'operations') OR public.has_role(auth.uid(),'finance_manager')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

-- =====================================================================
-- 2) gtm_entities / gtm_opportunities — drop USING true / uid IS NOT NULL
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated read gtm_entities" ON public.gtm_entities;
DROP POLICY IF EXISTS "Authenticated update gtm_entities" ON public.gtm_entities;
DROP POLICY IF EXISTS "Authenticated insert gtm_entities" ON public.gtm_entities;

CREATE POLICY "GTM entities org-scoped"
ON public.gtm_entities FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS "Authenticated read gtm_opportunities" ON public.gtm_opportunities;
DROP POLICY IF EXISTS "Authenticated update gtm_opportunities" ON public.gtm_opportunities;
DROP POLICY IF EXISTS "Authenticated insert gtm_opportunities" ON public.gtm_opportunities;

CREATE POLICY "GTM opportunities org-scoped"
ON public.gtm_opportunities FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

-- =====================================================================
-- 3) Operational tables with USING true SELECT policies
-- =====================================================================

-- driver_behavior_scores → scope via drivers.organization_id
DROP POLICY IF EXISTS "Authenticated read driver_behavior_scores" ON public.driver_behavior_scores;
CREATE POLICY "Driver behavior scores org-scoped read"
ON public.driver_behavior_scores FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = driver_behavior_scores.driver_id
      AND d.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), d.organization_id)
  )
);

-- warehouse_inventory → scope via warehouses.organization_id
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.warehouse_inventory;
CREATE POLICY "Warehouse inventory org-scoped read"
ON public.warehouse_inventory FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = warehouse_inventory.warehouse_id
      AND w.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), w.organization_id)
  )
);

-- dispatch_state_history → scope via dispatches.organization_id
DROP POLICY IF EXISTS "Authenticated users can view state history" ON public.dispatch_state_history;
CREATE POLICY "Dispatch state history org-scoped read"
ON public.dispatch_state_history FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispatches d
    WHERE d.id = dispatch_state_history.dispatch_id
      AND d.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), d.organization_id)
  )
);

-- dispatch_delay_reasons → scope via dispatches.organization_id
DROP POLICY IF EXISTS "Authenticated users can view delay reasons" ON public.dispatch_delay_reasons;
CREATE POLICY "Dispatch delay reasons org-scoped read"
ON public.dispatch_delay_reasons FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispatches d
    WHERE d.id = dispatch_delay_reasons.dispatch_id
      AND d.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), d.organization_id)
  )
);

-- dispatch_dropoffs → scope via dispatches.organization_id
DROP POLICY IF EXISTS "Authenticated users can view dropoffs" ON public.dispatch_dropoffs;
CREATE POLICY "Dispatch dropoffs org-scoped read"
ON public.dispatch_dropoffs FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispatches d
    WHERE d.id = dispatch_dropoffs.dispatch_id
      AND d.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), d.organization_id)
  )
);

-- fuel_events → drop USING true; org-scoped policy already exists
DROP POLICY IF EXISTS "Authenticated users can view fuel events" ON public.fuel_events;

-- treasury_stress_index → tenant_id-scoped read
DROP POLICY IF EXISTS "Authenticated read treasury stress" ON public.treasury_stress_index;
CREATE POLICY "Treasury stress org-scoped read"
ON public.treasury_stress_index FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.is_org_member(auth.uid(), tenant_id))
);

-- tax_ledger → no org column; restrict to finance roles only
DROP POLICY IF EXISTS "Authenticated can view tax ledger" ON public.tax_ledger;
CREATE POLICY "Tax ledger finance read"
ON public.tax_ledger FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'finance_manager')
);

-- =====================================================================
-- 4) company_settings — add organization_id and scope by membership
-- =====================================================================
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid;

CREATE INDEX IF NOT EXISTS idx_company_settings_org
  ON public.company_settings(organization_id);

DROP POLICY IF EXISTS "Restricted company settings read" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;

CREATE POLICY "Company settings org-scoped read"
ON public.company_settings FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'org_admin')
           OR public.has_role(auth.uid(),'finance_manager')))
);

CREATE POLICY "Company settings org-scoped insert"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'org_admin')))
);

CREATE POLICY "Company settings org-scoped update"
ON public.company_settings FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), organization_id)
      AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'org_admin')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

-- =====================================================================
-- 5) realtime.messages — topic must be prefixed with caller's org_id
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated subscribers must have role" ON realtime.messages;

CREATE POLICY "Realtime org-scoped subscribe"
ON realtime.messages FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.is_active = true
      AND (
        realtime.topic() = om.organization_id::text
        OR realtime.topic() LIKE om.organization_id::text || ':%'
      )
  )
);

-- =====================================================================
-- 6) DRIFT GUARD — prevent future cross-tenant policies
-- =====================================================================
CREATE OR REPLACE FUNCTION public.assert_no_open_rls_policies()
RETURNS TABLE(schema_name text, table_name text, policy_name text, qual text, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT n.nspname::text, c.relname::text, p.polname::text,
         pg_get_expr(p.polqual, p.polrelid)::text AS qual,
         CASE
           WHEN pg_get_expr(p.polqual, p.polrelid) ~* '^\s*true\s*$' THEN 'USING true'
           WHEN pg_get_expr(p.polqual, p.polrelid) ~* 'auth\.uid\(\)\s*IS\s+NOT\s+NULL'
                AND pg_get_expr(p.polqual, p.polrelid) !~* 'is_org_member|is_super_admin|organization_id'
                THEN 'auth.uid() IS NOT NULL without org scope'
           ELSE 'role-only without org scope'
         END AS reason
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND p.polcmd IN ('r','*')                        -- SELECT or ALL
    AND c.relname NOT IN (
      -- Tables intentionally world-readable (public catalog data only)
      'industries','currencies','countries','timezones',
      'logistics_pricing_tiers','industry_os_pricing_tiers',
      'public_brand_assets','geofence_templates'
    )
    AND (
      pg_get_expr(p.polqual, p.polrelid) ~* '^\s*true\s*$'
      OR (
        pg_get_expr(p.polqual, p.polrelid) ~* 'auth\.uid\(\)\s*IS\s+NOT\s+NULL'
        AND pg_get_expr(p.polqual, p.polrelid) !~* 'is_org_member|is_super_admin|organization_id|tenant_id'
      )
    );
$$;

COMMENT ON FUNCTION public.assert_no_open_rls_policies() IS
  'Drift guard: returns any RLS SELECT/ALL policy on a public.* table that uses USING true or auth.uid() IS NOT NULL without org scoping. CI/test must assert this returns zero rows.';