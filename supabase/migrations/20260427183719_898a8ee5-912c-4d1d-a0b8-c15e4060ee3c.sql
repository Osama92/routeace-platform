
-- ============ AUDIT FINDINGS ============
CREATE TABLE IF NOT EXISTS public.payroll_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_salary_id uuid NOT NULL REFERENCES public.staff_salaries(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('clean','warning','critical')),
  category text NOT NULL,
  message text NOT NULL,
  anomaly_score integer NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_note text
);

CREATE INDEX IF NOT EXISTS idx_paf_salary ON public.payroll_audit_findings(staff_salary_id);
CREATE INDEX IF NOT EXISTS idx_paf_severity_open ON public.payroll_audit_findings(severity) WHERE resolved_at IS NULL;

ALTER TABLE public.payroll_audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payroll findings"
ON public.payroll_audit_findings FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager')
);

CREATE POLICY "Admins resolve payroll findings"
ON public.payroll_audit_findings FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'finance_manager')
);

-- Block edits to anything other than resolved_* fields
CREATE OR REPLACE FUNCTION public.block_payroll_finding_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.staff_salary_id IS DISTINCT FROM OLD.staff_salary_id
       OR NEW.severity IS DISTINCT FROM OLD.severity
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.anomaly_score IS DISTINCT FROM OLD.anomaly_score
       OR NEW.detail IS DISTINCT FROM OLD.detail
       OR NEW.detected_at IS DISTINCT FROM OLD.detected_at THEN
      RAISE EXCEPTION 'Only resolution fields can be modified on a payroll finding.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_finding_edit ON public.payroll_audit_findings;
CREATE TRIGGER trg_block_finding_edit
BEFORE UPDATE ON public.payroll_audit_findings
FOR EACH ROW EXECUTE FUNCTION public.block_payroll_finding_edit();

-- ============ AUDIT RUNS ============
CREATE TABLE IF NOT EXISTS public.payroll_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid,
  rows_checked integer NOT NULL DEFAULT 0,
  clean_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  prevented_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit runs"
ON public.payroll_audit_runs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'finance_manager')
);

CREATE POLICY "System inserts audit runs"
ON public.payroll_audit_runs FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'finance_manager')
);

-- ============ AUDIT ENGINE (per-row) ============
CREATE OR REPLACE FUNCTION public.audit_staff_salary(p_salary_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sal public.staff_salaries%ROWTYPE;
  v_staff public.staff%ROWTYPE;
  v_avg numeric;
  v_dup int;
  v_leave_days int;
  v_severity text := 'clean';
  v_findings int := 0;
BEGIN
  SELECT * INTO v_sal FROM public.staff_salaries WHERE id = p_salary_id;
  IF v_sal IS NULL THEN
    RETURN jsonb_build_object('error','salary not found');
  END IF;

  SELECT * INTO v_staff FROM public.staff WHERE id = v_sal.staff_id;

  -- Clear previous unresolved findings for this salary so re-runs are idempotent
  DELETE FROM public.payroll_audit_findings
   WHERE staff_salary_id = p_salary_id AND resolved_at IS NULL;

  -- 1. Missing data
  IF v_staff IS NULL THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'missing_data', 'Staff record not found', 100,
            jsonb_build_object('staff_id', v_sal.staff_id));
    v_severity := 'critical'; v_findings := v_findings + 1;
  ELSIF v_staff.full_name IS NULL OR v_staff.full_name = '' OR COALESCE(v_staff.base_salary,0) <= 0 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'missing_data',
            'Staff is missing name or base salary', 90,
            jsonb_build_object('full_name', v_staff.full_name, 'base_salary', v_staff.base_salary));
    v_severity := 'critical'; v_findings := v_findings + 1;
  END IF;

  -- 2. Negative / zero values
  IF COALESCE(v_sal.gross_amount,0) <= 0 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'invalid_amount',
            'Gross amount must be greater than zero', 95,
            jsonb_build_object('gross_amount', v_sal.gross_amount));
    v_severity := 'critical'; v_findings := v_findings + 1;
  END IF;

  IF COALESCE(v_sal.tax_amount,0) < 0 OR COALESCE(v_sal.net_amount,0) < 0 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'invalid_amount',
            'Tax or net amount cannot be negative', 95,
            jsonb_build_object('tax', v_sal.tax_amount, 'net', v_sal.net_amount));
    v_severity := 'critical'; v_findings := v_findings + 1;
  END IF;

  -- 3. Net consistency (gross − tax should equal net within 1.00 tolerance)
  IF abs(COALESCE(v_sal.gross_amount,0) - COALESCE(v_sal.tax_amount,0) - COALESCE(v_sal.net_amount,0)) > 1 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'net_mismatch',
            'Net amount does not equal gross minus tax', 95,
            jsonb_build_object('gross', v_sal.gross_amount, 'tax', v_sal.tax_amount, 'net', v_sal.net_amount,
                               'expected_net', COALESCE(v_sal.gross_amount,0) - COALESCE(v_sal.tax_amount,0)));
    v_severity := 'critical'; v_findings := v_findings + 1;
  END IF;

  -- 4. Duplicate salary in same period
  SELECT COUNT(*) INTO v_dup FROM public.staff_salaries
  WHERE staff_id = v_sal.staff_id
    AND id <> v_sal.id
    AND status IN ('pending','approved','paid')
    AND COALESCE(period_start, '1900-01-01'::date) = COALESCE(v_sal.period_start, '1900-01-01'::date)
    AND COALESCE(period_end, '1900-01-01'::date) = COALESCE(v_sal.period_end, '1900-01-01'::date);

  IF v_dup > 0 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'critical', 'duplicate_payroll',
            format('%s other salary record(s) exist for the same staff and period', v_dup), 100,
            jsonb_build_object('duplicates', v_dup, 'period_start', v_sal.period_start, 'period_end', v_sal.period_end));
    v_severity := 'critical'; v_findings := v_findings + 1;
  END IF;

  -- 5. Leave overlap (warning only — admin may have already adjusted gross)
  IF v_sal.period_start IS NOT NULL AND v_sal.period_end IS NOT NULL AND v_staff.email IS NOT NULL THEN
    SELECT COALESCE(SUM(total_days),0)::int INTO v_leave_days
    FROM public.leave_requests lr
    JOIN public.profiles p ON p.user_id = lr.user_id
    WHERE lower(p.email) = lower(v_staff.email)
      AND lr.status = 'approved'
      AND lr.leave_type IN ('emergency') -- unpaid types
      AND lr.start_date <= v_sal.period_end
      AND lr.end_date   >= v_sal.period_start;

    IF v_leave_days > 0 THEN
      INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
      VALUES (p_salary_id, v_sal.staff_id, 'warning', 'leave_overlap',
              format('%s unpaid leave day(s) overlap this pay period — confirm gross was reduced', v_leave_days), 50,
              jsonb_build_object('unpaid_days', v_leave_days));
      IF v_severity = 'clean' THEN v_severity := 'warning'; END IF;
      v_findings := v_findings + 1;
    END IF;
  END IF;

  -- 6. Historical anomaly: gross > 1.5× the 6-month average for the same staff
  SELECT AVG(gross_amount) INTO v_avg
  FROM public.staff_salaries
  WHERE staff_id = v_sal.staff_id
    AND id <> v_sal.id
    AND status = 'paid'
    AND created_at > now() - interval '180 days';

  IF v_avg IS NOT NULL AND v_avg > 0 AND v_sal.gross_amount > v_avg * 1.5 THEN
    INSERT INTO public.payroll_audit_findings(staff_salary_id, staff_id, severity, category, message, anomaly_score, detail)
    VALUES (p_salary_id, v_sal.staff_id, 'warning', 'historical_spike',
            format('Gross is %.0f%% above 6-month average', ((v_sal.gross_amount / v_avg) - 1) * 100), 70,
            jsonb_build_object('gross', v_sal.gross_amount, 'avg_6m', v_avg));
    IF v_severity = 'clean' THEN v_severity := 'warning'; END IF;
    v_findings := v_findings + 1;
  END IF;

  RETURN jsonb_build_object(
    'salary_id', p_salary_id,
    'severity', v_severity,
    'findings', v_findings
  );
END $$;

-- ============ BATCH AUDIT ============
CREATE OR REPLACE FUNCTION public.audit_pending_payroll()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record;
  v_clean int := 0; v_warn int := 0; v_crit int := 0; v_total int := 0;
  v_prevented numeric := 0;
  v_run_id uuid;
BEGIN
  IF NOT (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins or finance can run the payroll audit';
  END IF;

  FOR v_row IN SELECT id, gross_amount FROM public.staff_salaries WHERE status = 'pending' LOOP
    v_total := v_total + 1;
    PERFORM public.audit_staff_salary(v_row.id);
    IF EXISTS (SELECT 1 FROM public.payroll_audit_findings
               WHERE staff_salary_id = v_row.id AND severity='critical' AND resolved_at IS NULL) THEN
      v_crit := v_crit + 1;
      v_prevented := v_prevented + COALESCE(v_row.gross_amount,0);
    ELSIF EXISTS (SELECT 1 FROM public.payroll_audit_findings
                  WHERE staff_salary_id = v_row.id AND severity='warning' AND resolved_at IS NULL) THEN
      v_warn := v_warn + 1;
    ELSE
      v_clean := v_clean + 1;
    END IF;
  END LOOP;

  INSERT INTO public.payroll_audit_runs(triggered_by, rows_checked, clean_count, warning_count, critical_count, prevented_amount)
  VALUES (auth.uid(), v_total, v_clean, v_warn, v_crit, v_prevented)
  RETURNING id INTO v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'rows_checked', v_total,
    'clean', v_clean,
    'warning', v_warn,
    'critical', v_crit,
    'prevented_amount', v_prevented
  );
END $$;

-- ============ BLOCK APPROVAL/PAYMENT WHEN CRITICAL FINDINGS OPEN ============
CREATE OR REPLACE FUNCTION public.block_salary_with_critical_findings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_open int;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IN ('approved','paid')
     AND OLD.status NOT IN ('approved','paid') THEN

    -- Always run a fresh audit before changing status
    PERFORM public.audit_staff_salary(NEW.id);

    SELECT COUNT(*) INTO v_open
    FROM public.payroll_audit_findings
    WHERE staff_salary_id = NEW.id
      AND severity = 'critical'
      AND resolved_at IS NULL;

    IF v_open > 0 THEN
      RAISE EXCEPTION 'Payroll blocked: % unresolved critical audit finding(s) on this salary. Resolve them in the Payroll Audit dashboard before approving or paying.', v_open;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_critical_payroll ON public.staff_salaries;
CREATE TRIGGER trg_block_critical_payroll
BEFORE UPDATE OF status ON public.staff_salaries
FOR EACH ROW EXECUTE FUNCTION public.block_salary_with_critical_findings();
