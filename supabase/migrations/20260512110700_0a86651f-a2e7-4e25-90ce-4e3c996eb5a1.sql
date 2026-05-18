-- gtm_campaign_insights & gtm_credit_wallets: org-scoped writes
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['gtm_campaign_insights','gtm_credit_wallets'] LOOP
    FOR pol IN EXECUTE format('SELECT polname, polcmd FROM pg_policy WHERE polrelid = %L::regclass AND polcmd IN (''a'',''w'')', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "%s_org_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))', t, t);
    EXECUTE format('CREATE POLICY "%s_org_update" ON public.%I FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))) WITH CHECK (is_super_admin(auth.uid()) OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)))', t, t);
  END LOOP;
END $$;

-- immutable_financial_ledger: tighten insert
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid='public.immutable_financial_ledger'::regclass AND polcmd='a' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.immutable_financial_ledger', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "ledger_finance_insert" ON public.immutable_financial_ledger
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id IS NOT NULL AND is_org_member(auth.uid(), tenant_id) AND (
        has_role(auth.uid(), 'finance_manager'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'org_admin'::app_role)
      )
    )
  );