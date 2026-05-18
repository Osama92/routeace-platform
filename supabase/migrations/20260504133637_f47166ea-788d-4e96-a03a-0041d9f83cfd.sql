-- Add organization_id columns where missing
ALTER TABLE public.invoices             ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.accounts_receivable  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.accounts_payable     ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.accounting_ledger    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.ar_payments          ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.waybills             ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Backfill invoices from dispatches first, then customers
UPDATE public.invoices i
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE i.dispatch_id = d.id AND i.organization_id IS NULL AND d.organization_id IS NOT NULL;

UPDATE public.invoices i
SET organization_id = c.organization_id
FROM public.customers c
WHERE i.customer_id = c.id AND i.organization_id IS NULL AND c.organization_id IS NOT NULL;

-- Backfill AR from invoices
UPDATE public.accounts_receivable ar
SET organization_id = i.organization_id
FROM public.invoices i
WHERE ar.invoice_id = i.id AND ar.organization_id IS NULL AND i.organization_id IS NOT NULL;

-- Backfill AR_payments from invoices
UPDATE public.ar_payments p
SET organization_id = i.organization_id
FROM public.invoices i
WHERE p.invoice_id = i.id AND p.organization_id IS NULL AND i.organization_id IS NOT NULL;

-- Backfill AP from bills (if bill_id exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='accounts_payable' AND column_name='bill_id') THEN
    EXECUTE 'UPDATE public.accounts_payable ap SET organization_id = b.organization_id FROM public.bills b WHERE ap.bill_id = b.id AND ap.organization_id IS NULL AND b.organization_id IS NOT NULL';
  END IF;
END $$;

-- Backfill ledger via reference
UPDATE public.accounting_ledger l
SET organization_id = i.organization_id
FROM public.invoices i
WHERE l.reference_type = 'invoice' AND l.reference_id = i.id AND l.organization_id IS NULL AND i.organization_id IS NOT NULL;

UPDATE public.accounting_ledger l
SET organization_id = b.organization_id
FROM public.bills b
WHERE l.reference_type = 'bill' AND l.reference_id = b.id AND l.organization_id IS NULL AND b.organization_id IS NOT NULL;

UPDATE public.accounting_ledger l
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE l.reference_type = 'dispatch' AND l.reference_id = d.id AND l.organization_id IS NULL AND d.organization_id IS NOT NULL;

-- Backfill waybills from dispatches
UPDATE public.waybills w
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE w.dispatch_id = d.id AND w.organization_id IS NULL AND d.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_ar_org ON public.accounts_receivable(organization_id);
CREATE INDEX IF NOT EXISTS idx_ap_org ON public.accounts_payable(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_org ON public.accounting_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_arpay_org ON public.ar_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_waybills_org ON public.waybills(organization_id);

-- ============================================================
-- DROP legacy permissive policies + recreate org-scoped ones
-- ============================================================

-- DISPATCHES
DROP POLICY IF EXISTS "Authenticated users can view dispatches" ON public.dispatches;
DROP POLICY IF EXISTS "Org members read own dispatches" ON public.dispatches;
CREATE POLICY "Org members read own dispatches"
  ON public.dispatches FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- DRIVERS
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Org members read own drivers" ON public.drivers;
CREATE POLICY "Org members read own drivers"
  ON public.drivers FOR SELECT TO authenticated
  USING ((organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true)) OR user_id = auth.uid());

-- VEHICLES
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Org members read own vehicles" ON public.vehicles;
CREATE POLICY "Org members read own vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- CUSTOMERS
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Org members read own customers" ON public.customers;
CREATE POLICY "Org members read own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')));

-- AR / AP / LEDGER / AR_PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can view AR" ON public.accounts_receivable;
DROP POLICY IF EXISTS "Authenticated users can view AP" ON public.accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can view ledger" ON public.accounting_ledger;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.ar_payments;

DROP POLICY IF EXISTS "Org members read own AR" ON public.accounts_receivable;
CREATE POLICY "Org members read own AR"
  ON public.accounts_receivable FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Org members read own AP" ON public.accounts_payable;
CREATE POLICY "Org members read own AP"
  ON public.accounts_payable FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Org members read own ledger" ON public.accounting_ledger;
CREATE POLICY "Org members read own ledger"
  ON public.accounting_ledger FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Org members read own AR payments" ON public.ar_payments;
CREATE POLICY "Org members read own AR payments"
  ON public.ar_payments FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- BILLS — drop legacy permissive policies
DROP POLICY IF EXISTS "Authenticated users can view bills" ON public.bills;
DROP POLICY IF EXISTS "Authenticated users can create bills" ON public.bills;
DROP POLICY IF EXISTS "Authenticated users can update bills" ON public.bills;
DROP POLICY IF EXISTS "Authenticated users can delete bills" ON public.bills;

-- WAYBILLS
DROP POLICY IF EXISTS "Allow access to waybills" ON public.waybills;
DROP POLICY IF EXISTS "Org members access own waybills" ON public.waybills;
CREATE POLICY "Org members access own waybills"
  ON public.waybills FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- Cross-mode org membership prevention
CREATE OR REPLACE FUNCTION public.enforce_single_tenant_mode()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_mode TEXT; v_existing_mode TEXT;
BEGIN
  SELECT tenant_mode INTO v_new_mode FROM public.organizations WHERE id = NEW.organization_id;
  SELECT o.tenant_mode INTO v_existing_mode
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = NEW.user_id AND om.is_active = true
    AND om.organization_id != NEW.organization_id
    AND o.tenant_mode IS DISTINCT FROM v_new_mode
  LIMIT 1;
  IF v_existing_mode IS NOT NULL THEN
    RAISE EXCEPTION 'User is already a member of a % organisation. Cannot join a % organisation simultaneously.', v_existing_mode, v_new_mode;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_single_tenant_mode ON public.organization_members;
CREATE TRIGGER trg_enforce_single_tenant_mode
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.enforce_single_tenant_mode();

-- Auto-suspend orphan orgs
CREATE OR REPLACE FUNCTION public.cleanup_orphan_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = OLD.organization_id
      AND is_active = true AND user_id != OLD.user_id
  ) THEN
    UPDATE public.organizations
    SET status = 'suspended', updated_at = now()
    WHERE id = OLD.organization_id AND status != 'suspended';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_cleanup_orphan_org ON public.organization_members;
CREATE TRIGGER trg_cleanup_orphan_org
  AFTER UPDATE OF is_active ON public.organization_members
  FOR EACH ROW WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION public.cleanup_orphan_org();