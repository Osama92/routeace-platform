
-- 1) Fix api_keys: allow super_admin to manage/select (not just admin)
DROP POLICY IF EXISTS "Admins can manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Role-restricted view api keys" ON public.api_keys;

CREATE POLICY "Admins or Super Admins manage API keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Reseller access audit log
CREATE TABLE IF NOT EXISTS public.reseller_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  org_id uuid,
  table_name text NOT NULL,
  action text NOT NULL,             -- 'read' | 'failed_access' | 'self_check'
  target_org_id uuid,
  outcome text NOT NULL,            -- 'allowed' | 'denied'
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reseller_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads all reseller access logs"
  ON public.reseller_access_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "User reads own reseller access logs"
  ON public.reseller_access_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated insert own reseller access log"
  ON public.reseller_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_reseller_access_log_user ON public.reseller_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reseller_access_log_outcome ON public.reseller_access_log(outcome, created_at DESC);

-- 3) Harden reseller tables: additional restrictive tenant-join policies
-- reseller_payouts: must be reseller's own org
ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_tenant_join_strict" ON public.reseller_payouts;
CREATE POLICY "rp_tenant_join_strict"
  ON public.reseller_payouts AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR reseller_org_id = public._lc_user_org()
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR reseller_org_id = public._lc_user_org()
  );

-- commission_ledger: caller's org must own one of the sides
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cl_tenant_join_strict" ON public.commission_ledger;
CREATE POLICY "cl_tenant_join_strict"
  ON public.commission_ledger AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR source_org_id = public._lc_user_org()
    OR reseller_org_id = public._lc_user_org()
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR source_org_id = public._lc_user_org()
    OR reseller_org_id = public._lc_user_org()
  );

-- reseller_relationships: each side limited to its own org
ALTER TABLE public.reseller_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rr_tenant_join_strict" ON public.reseller_relationships;
CREATE POLICY "rr_tenant_join_strict"
  ON public.reseller_relationships AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR reseller_org_id = public._lc_user_org()
    OR client_org_id = public._lc_user_org()
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR reseller_org_id = public._lc_user_org()
  );

-- white_label_resellers: own listing only
ALTER TABLE public.white_label_resellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wlr_tenant_join_strict" ON public.white_label_resellers;
CREATE POLICY "wlr_tenant_join_strict"
  ON public.white_label_resellers AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR onboarded_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR onboarded_by = auth.uid()
  );

-- reseller_sales: must trace to a listing owned by caller
ALTER TABLE public.reseller_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs_tenant_join_strict" ON public.reseller_sales;
CREATE POLICY "rs_tenant_join_strict"
  ON public.reseller_sales AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.white_label_resellers w
      WHERE w.id = reseller_sales.reseller_id
        AND w.onboarded_by = auth.uid()
    )
  )
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
