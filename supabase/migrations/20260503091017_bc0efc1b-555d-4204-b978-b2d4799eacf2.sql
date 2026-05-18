
CREATE TABLE IF NOT EXISTS public.dept_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('peak_hour', 'distance_multiplier', 'vendor_surcharge', 'volume_discount')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('percent', 'flat')),
  adjustment_value numeric NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dept_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pricing rules"
  ON public.dept_pricing_rules FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Authorized roles manage pricing rules"
  ON public.dept_pricing_rules FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'ops_manager'::app_role)
      OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    )
  )
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.dept_pricing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  dispatch_id uuid REFERENCES public.dispatches(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.dept_pricing_rules(id) ON DELETE SET NULL,
  base_rate_ngn numeric NOT NULL,
  adjusted_rate_ngn numeric NOT NULL,
  adjustment_amount numeric NOT NULL,
  rule_snapshot jsonb,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dept_pricing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read pricing apps"
  ON public.dept_pricing_applications FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_dept_pricing_rules_updated_at
  BEFORE UPDATE ON public.dept_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dept_pricing_rules_active
  ON public.dept_pricing_rules (organization_id, is_active, priority);
