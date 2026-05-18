
-- =======================
-- Storage: expense-receipts
-- =======================
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;

CREATE POLICY "Owner or admin can update expense receipts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'expense-receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- =======================
-- financial_targets
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view targets" ON public.financial_targets;
DROP POLICY IF EXISTS "Auth users read financial_targets" ON public.financial_targets;
DROP POLICY IF EXISTS "Users can view targets" ON public.financial_targets;

CREATE POLICY "Finance roles can view financial targets"
ON public.financial_targets
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

-- =======================
-- sales_accounts
-- =======================
DROP POLICY IF EXISTS "Auth users read sales_accounts" ON public.sales_accounts;
DROP POLICY IF EXISTS "Authenticated users can view sales accounts" ON public.sales_accounts;

CREATE POLICY "Org members can view sales accounts"
ON public.sales_accounts
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND public.is_org_member(auth.uid(), tenant_id)
);

-- =======================
-- fuel_events
-- =======================
DROP POLICY IF EXISTS "Authenticated can read fuel_events" ON public.fuel_events;
DROP POLICY IF EXISTS "Auth users read fuel_events" ON public.fuel_events;
DROP POLICY IF EXISTS "Users can view fuel events" ON public.fuel_events;

CREATE POLICY "Org members can view fuel events"
ON public.fuel_events
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND public.is_org_member(auth.uid(), tenant_id)
);

-- =======================
-- GTM tables
-- =======================
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gtm_credit_wallets','gtm_conversations','gtm_messages',
    'gtm_intent_classifications','gtm_intent_scores',
    'gtm_search_queries','gtm_signals','gtm_meetings',
    'gtm_campaign_insights','gtm_product_signals'
  ]
  LOOP
    -- drop existing SELECT policies on this table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Org members can view gtm credit wallets"
ON public.gtm_credit_wallets FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view gtm conversations"
ON public.gtm_conversations FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

-- gtm_messages -> via conversation
CREATE POLICY "Org members can view gtm messages"
ON public.gtm_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gtm_conversations c
    WHERE c.id = gtm_messages.conversation_id
      AND c.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), c.organization_id)
  )
);

-- intent_classifications/intent_scores -> via signals
CREATE POLICY "Org members can view gtm intent classifications"
ON public.gtm_intent_classifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gtm_signals s
    WHERE s.id = gtm_intent_classifications.signal_id
      AND s.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Org members can view gtm intent scores"
ON public.gtm_intent_scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gtm_signals s
    WHERE s.id = gtm_intent_scores.signal_id
      AND s.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Org members can view gtm search queries"
ON public.gtm_search_queries FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view gtm signals"
ON public.gtm_signals FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view gtm meetings"
ON public.gtm_meetings FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view gtm campaign insights"
ON public.gtm_campaign_insights FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view gtm product signals"
ON public.gtm_product_signals FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

-- =======================
-- kpi_period_snapshots
-- =======================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='kpi_period_snapshots' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.kpi_period_snapshots', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Org members can view kpi period snapshots"
ON public.kpi_period_snapshots FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND public.is_org_member(auth.uid(), tenant_id));

-- =======================
-- blocked_orders
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view blocked orders" ON public.blocked_orders;

CREATE POLICY "Org members can view blocked orders"
ON public.blocked_orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dispatches d
    WHERE d.id = blocked_orders.dispatch_id
      AND d.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), d.organization_id)
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
);

-- =======================
-- vendor_credit_ratings
-- =======================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='vendor_credit_ratings' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.vendor_credit_ratings', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Finance/ops roles can view vendor credit ratings"
ON public.vendor_credit_ratings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'finance_manager'::public.app_role)
  OR public.has_role(auth.uid(), 'ops_manager'::public.app_role)
);

-- =======================
-- agent_profiles
-- =======================
DROP POLICY IF EXISTS "Users can read agent profiles" ON public.agent_profiles;

CREATE POLICY "Owner or admin can view agent profiles"
ON public.agent_profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- =======================
-- invoice_line_items
-- =======================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='invoice_line_items'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.invoice_line_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Org members can view invoice line items"
ON public.invoice_line_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE i.id = invoice_line_items.invoice_id
      AND (
        (c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members can insert invoice line items"
ON public.invoice_line_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE i.id = invoice_line_items.invoice_id
      AND (
        (c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members can update invoice line items"
ON public.invoice_line_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE i.id = invoice_line_items.invoice_id
      AND (
        (c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members can delete invoice line items"
ON public.invoice_line_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE i.id = invoice_line_items.invoice_id
      AND (
        (c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);
