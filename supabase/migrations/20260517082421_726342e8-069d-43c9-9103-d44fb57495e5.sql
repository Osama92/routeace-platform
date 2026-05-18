ALTER TABLE public.investor_assessments ADD COLUMN IF NOT EXISTS organization_id uuid;
CREATE INDEX IF NOT EXISTS idx_investor_assessments_org ON public.investor_assessments(organization_id);

-- Tighten RLS: only callers in the same org can read assessments (super_admin/internal_team unrestricted)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='investor_assessments') THEN
    EXECUTE 'ALTER TABLE public.investor_assessments ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DROP POLICY IF EXISTS "investor_assessments_select_org" ON public.investor_assessments;
CREATE POLICY "investor_assessments_select_org" ON public.investor_assessments
FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin','core_founder','core_cofounder','internal_team'))
);
