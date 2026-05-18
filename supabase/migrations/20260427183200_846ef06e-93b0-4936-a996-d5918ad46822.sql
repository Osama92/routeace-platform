
-- ============ PAYSLIPS TABLE ============
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_number text NOT NULL UNIQUE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  staff_salary_id uuid NOT NULL REFERENCES public.staff_salaries(id) ON DELETE RESTRICT,
  organization_id uuid,
  period_start date,
  period_end date,
  pay_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Snapshot fields (must match payroll exactly)
  staff_name text NOT NULL,
  staff_email text,
  staff_role text,
  gross_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  net_amount numeric(15,2) NOT NULL DEFAULT 0,
  earnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_reference text,
  currency_code text NOT NULL DEFAULT 'NGN',
  -- Download tracking
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamptz,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_salary_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_staff_id ON public.payslips(staff_id);
CREATE INDEX IF NOT EXISTS idx_payslips_staff_email ON public.payslips(staff_email);
CREATE INDEX IF NOT EXISTS idx_payslips_pay_date ON public.payslips(pay_date DESC);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- Staff can see their own payslips (email match against staff record)
CREATE POLICY "Staff can view own payslips"
ON public.payslips FOR SELECT TO authenticated
USING (
  staff_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = payslips.staff_id
      AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Admins / finance see all payslips
CREATE POLICY "Admins view all payslips"
ON public.payslips FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin')
  OR has_role(auth.uid(), 'finance_manager')
);

-- Only admins / finance can manually insert (the trigger uses SECURITY DEFINER)
CREATE POLICY "Admins can insert payslips"
ON public.payslips FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'finance_manager')
);

-- No UPDATE or DELETE policies => denied by RLS

-- ============ IMMUTABILITY TRIGGER ============
CREATE OR REPLACE FUNCTION public.block_payslip_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow only download tracking fields to change
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.payslip_number IS DISTINCT FROM OLD.payslip_number
       OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
       OR NEW.staff_salary_id IS DISTINCT FROM OLD.staff_salary_id
       OR NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
       OR NEW.earnings IS DISTINCT FROM OLD.earnings
       OR NEW.deductions IS DISTINCT FROM OLD.deductions
       OR NEW.period_start IS DISTINCT FROM OLD.period_start
       OR NEW.period_end IS DISTINCT FROM OLD.period_end
       OR NEW.pay_date IS DISTINCT FROM OLD.pay_date THEN
      RAISE EXCEPTION 'Payslips are immutable. Correct the underlying payroll entry instead.';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Payslips cannot be deleted.';
END $$;

DROP TRIGGER IF EXISTS trg_block_payslip_mutation ON public.payslips;
CREATE TRIGGER trg_block_payslip_mutation
BEFORE UPDATE OR DELETE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.block_payslip_mutation();

-- ============ AUTO-GENERATE PAYSLIP ON PAID ============
CREATE OR REPLACE FUNCTION public.auto_generate_payslip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff public.staff%ROWTYPE;
  v_number text;
  v_earnings jsonb;
  v_deductions jsonb;
BEGIN
  -- Only fire when status transitions to paid
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;

  -- Block if a payslip already exists for this salary record
  IF EXISTS (SELECT 1 FROM public.payslips WHERE staff_salary_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Block if payroll data incomplete
  IF NEW.gross_amount IS NULL OR NEW.gross_amount <= 0 THEN
    RAISE EXCEPTION 'Cannot generate payslip: payroll gross amount missing or zero (salary id %)', NEW.id;
  END IF;

  SELECT * INTO v_staff FROM public.staff WHERE id = NEW.staff_id;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'Cannot generate payslip: staff record missing for salary id %', NEW.id;
  END IF;

  v_number := 'PSL-' || to_char(now(), 'YYYYMM') || '-' || lpad((floor(random()*99999)+1)::text, 5, '0');

  v_earnings := jsonb_build_array(
    jsonb_build_object('label', 'Base Salary', 'amount', v_staff.base_salary)
  );

  v_deductions := jsonb_build_array(
    jsonb_build_object('label', 'PAYE Tax', 'amount', COALESCE(NEW.tax_amount, 0)),
    jsonb_build_object('label', 'Pension', 'amount', COALESCE(v_staff.pension_contribution, 0)),
    jsonb_build_object('label', 'NHF', 'amount', COALESCE(v_staff.nhf_contribution, 0)),
    jsonb_build_object('label', 'NHIS', 'amount', COALESCE(v_staff.nhis_contribution, 0))
  );

  INSERT INTO public.payslips (
    payslip_number, staff_id, staff_salary_id,
    period_start, period_end, pay_date,
    staff_name, staff_email, staff_role,
    gross_amount, tax_amount, net_amount,
    earnings, deductions,
    payment_reference, generated_by
  ) VALUES (
    v_number, NEW.staff_id, NEW.id,
    NEW.period_start, NEW.period_end, CURRENT_DATE,
    v_staff.full_name, v_staff.email, v_staff.job_title,
    NEW.gross_amount, COALESCE(NEW.tax_amount, 0), COALESCE(NEW.net_amount, NEW.gross_amount - COALESCE(NEW.tax_amount, 0)),
    v_earnings, v_deductions,
    NEW.remita_rrr, auth.uid()
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_generate_payslip ON public.staff_salaries;
CREATE TRIGGER trg_auto_generate_payslip
AFTER INSERT OR UPDATE OF status ON public.staff_salaries
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_payslip();

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.payslip_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslip_audit_payslip ON public.payslip_audit_log(payslip_id);
ALTER TABLE public.payslip_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payslip audit"
ON public.payslip_audit_log FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'finance_manager')
);

CREATE POLICY "Authenticated insert audit"
ON public.payslip_audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.block_payslip_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'payslip_audit_log is append-only'; END $$;

DROP TRIGGER IF EXISTS trg_block_payslip_audit ON public.payslip_audit_log;
CREATE TRIGGER trg_block_payslip_audit
BEFORE UPDATE OR DELETE ON public.payslip_audit_log
FOR EACH ROW EXECUTE FUNCTION public.block_payslip_audit_mutation();

-- ============ DOWNLOAD HELPER (RPC) ============
CREATE OR REPLACE FUNCTION public.record_payslip_download(p_payslip_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_can_access boolean := false;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT EXISTS (
    SELECT 1 FROM public.payslips p
    WHERE p.id = p_payslip_id
      AND (
        p.staff_email = v_email
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'super_admin')
        OR has_role(auth.uid(), 'org_admin')
        OR has_role(auth.uid(), 'finance_manager')
      )
  ) INTO v_can_access;

  IF NOT v_can_access THEN
    RAISE EXCEPTION 'Not authorized to download this payslip';
  END IF;

  UPDATE public.payslips
  SET download_count = download_count + 1,
      last_downloaded_at = now()
  WHERE id = p_payslip_id;

  INSERT INTO public.payslip_audit_log(payslip_id, actor_id, action, metadata)
  VALUES (p_payslip_id, auth.uid(), 'download', jsonb_build_object('at', now()));
END $$;
