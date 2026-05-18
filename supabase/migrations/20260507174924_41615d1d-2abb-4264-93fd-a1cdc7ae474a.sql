-- Capital Funding & Repayments: org isolation
DO $$ BEGIN
  ALTER TABLE public.capital_funding
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.capital_repayments
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE public.capital_repayments r
SET organization_id = f.organization_id
FROM public.capital_funding f
WHERE r.funding_id = f.id
  AND r.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_capital_funding_org
  ON public.capital_funding(organization_id);
CREATE INDEX IF NOT EXISTS idx_capital_repayments_org
  ON public.capital_repayments(organization_id);

DROP POLICY IF EXISTS "Allow finance access to capital_funding"    ON public.capital_funding;
DROP POLICY IF EXISTS "Role-restricted view capital funding"       ON public.capital_funding;
DROP POLICY IF EXISTS "Authenticated users can view capital funding" ON public.capital_funding;
DROP POLICY IF EXISTS "Allow finance access to capital_repayments" ON public.capital_repayments;
DROP POLICY IF EXISTS "Role-restricted view capital repayments"    ON public.capital_repayments;

CREATE POLICY "Org members read own capital funding"
  ON public.capital_funding FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members manage own capital funding"
  ON public.capital_funding FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members update own capital funding"
  ON public.capital_funding FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members read own capital repayments"
  ON public.capital_repayments FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members manage own capital repayments"
  ON public.capital_repayments FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));