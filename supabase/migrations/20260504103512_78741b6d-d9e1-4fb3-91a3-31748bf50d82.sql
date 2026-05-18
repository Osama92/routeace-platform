-- 1. Add organization_id columns
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2. Backfill expenses from linked dispatch
UPDATE public.expenses e
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE e.organization_id IS NULL
  AND e.dispatch_id = d.id
  AND d.organization_id IS NOT NULL;

-- 3. Backfill expenses by created_by/submitted_by -> organization_members
UPDATE public.expenses e
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE e.organization_id IS NULL
  AND om.user_id = COALESCE(e.created_by, e.submitted_by)
  AND om.is_active = true;

-- 4. Backfill bills by created_by -> organization_members
UPDATE public.bills b
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE b.organization_id IS NULL
  AND om.user_id = b.created_by
  AND om.is_active = true;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_bills_organization_id ON public.bills(organization_id);

-- 6. Trigger to auto-assign organization_id on insert when null
CREATE OR REPLACE FUNCTION public.set_expense_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    -- prefer dispatch link
    IF NEW.dispatch_id IS NOT NULL THEN
      SELECT organization_id INTO NEW.organization_id FROM public.dispatches WHERE id = NEW.dispatch_id;
    END IF;
    IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
      SELECT organization_id INTO NEW.organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_expense_organization_id ON public.expenses;
CREATE TRIGGER trg_set_expense_organization_id
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_expense_organization_id();

CREATE OR REPLACE FUNCTION public.set_bill_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_bill_organization_id ON public.bills;
CREATE TRIGGER trg_set_bill_organization_id
BEFORE INSERT ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.set_bill_organization_id();

-- 7. Tighten RLS — drop existing read policies & add org-scoped ones
DROP POLICY IF EXISTS "Expenses are viewable by authenticated users with roles" ON public.expenses;
DROP POLICY IF EXISTS "Role-restricted expense access" ON public.expenses;

CREATE POLICY "Org-scoped expense read"
ON public.expenses FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = public.get_user_organization(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'org_admin'::app_role)
      OR has_role(auth.uid(), 'finance_manager'::app_role)
      OR has_role(auth.uid(), 'ops_manager'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Finance roles can view bills" ON public.bills;
DROP POLICY IF EXISTS "Finance/admin can read bills" ON public.bills;
DROP POLICY IF EXISTS "Finance/admin select bills" ON public.bills;

CREATE POLICY "Org-scoped bills read"
ON public.bills FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    organization_id IS NOT NULL
    AND organization_id = public.get_user_organization(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'org_admin'::app_role)
      OR has_role(auth.uid(), 'finance_manager'::app_role)
      OR has_role(auth.uid(), 'ops_manager'::app_role)
    )
  )
);

-- 8. Cost centre summary RPC (scoped to caller's organization)
CREATE OR REPLACE FUNCTION public.dept_cost_centre_summary(
  p_start date DEFAULT (date_trunc('month', now()))::date,
  p_end date DEFAULT (now())::date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_total_expenses numeric := 0;
  v_total_bills numeric := 0;
  v_dispatch_count int := 0;
  v_dispatch_distance numeric := 0;
  v_by_category jsonb;
  v_top_vendors jsonb;
  v_monthly jsonb;
BEGIN
  v_org := public.get_user_organization(auth.uid());
  IF v_org IS NULL AND NOT has_role(auth.uid(),'super_admin'::app_role) THEN
    RETURN jsonb_build_object('error','no_organization');
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_total_expenses
  FROM public.expenses
  WHERE organization_id = v_org
    AND expense_date BETWEEN p_start AND p_end
    AND COALESCE(approval_status,'approved') <> 'rejected';

  SELECT COALESCE(SUM(total_amount),0) INTO v_total_bills
  FROM public.bills
  WHERE organization_id = v_org
    AND bill_date BETWEEN p_start AND p_end;

  SELECT COUNT(*), COALESCE(SUM(COALESCE(total_distance_km, distance_km, 0)),0)
  INTO v_dispatch_count, v_dispatch_distance
  FROM public.dispatches
  WHERE organization_id = v_org
    AND COALESCE(dispatch_date, created_at::date) BETWEEN p_start AND p_end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', category,
    'total', total,
    'count', cnt
  ) ORDER BY total DESC), '[]'::jsonb) INTO v_by_category
  FROM (
    SELECT category::text AS category, SUM(amount) AS total, COUNT(*) AS cnt
    FROM public.expenses
    WHERE organization_id = v_org
      AND expense_date BETWEEN p_start AND p_end
      AND COALESCE(approval_status,'approved') <> 'rejected'
    GROUP BY category
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'vendor', vendor_name,
    'total', total,
    'count', cnt
  ) ORDER BY total DESC), '[]'::jsonb) INTO v_top_vendors
  FROM (
    SELECT vendor_name, SUM(total_amount) AS total, COUNT(*) AS cnt
    FROM public.bills
    WHERE organization_id = v_org
      AND bill_date BETWEEN p_start AND p_end
    GROUP BY vendor_name
    ORDER BY SUM(total_amount) DESC
    LIMIT 10
  ) v;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', month,
    'expenses', expenses,
    'bills', bills
  ) ORDER BY month), '[]'::jsonb) INTO v_monthly
  FROM (
    SELECT to_char(d, 'YYYY-MM') AS month,
      (SELECT COALESCE(SUM(amount),0) FROM public.expenses
        WHERE organization_id=v_org
          AND date_trunc('month',expense_date) = d) AS expenses,
      (SELECT COALESCE(SUM(total_amount),0) FROM public.bills
        WHERE organization_id=v_org
          AND date_trunc('month',bill_date) = d) AS bills
    FROM generate_series(
      date_trunc('month', p_start::timestamp),
      date_trunc('month', p_end::timestamp),
      '1 month'::interval
    ) d
  ) m;

  RETURN jsonb_build_object(
    'organization_id', v_org,
    'period_start', p_start,
    'period_end', p_end,
    'total_expenses', v_total_expenses,
    'total_bills', v_total_bills,
    'total_spend', v_total_expenses + v_total_bills,
    'dispatch_count', v_dispatch_count,
    'dispatch_distance_km', v_dispatch_distance,
    'cost_per_delivery', CASE WHEN v_dispatch_count > 0
      THEN ROUND(((v_total_expenses + v_total_bills) / v_dispatch_count)::numeric, 2)
      ELSE 0 END,
    'cost_per_km', CASE WHEN v_dispatch_distance > 0
      THEN ROUND(((v_total_expenses + v_total_bills) / v_dispatch_distance)::numeric, 2)
      ELSE 0 END,
    'by_category', v_by_category,
    'top_vendors', v_top_vendors,
    'monthly_trend', v_monthly
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dept_cost_centre_summary(date, date) TO authenticated;