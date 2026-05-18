-- Workflow + settlement RLS hardening

DO $$ BEGIN
  ALTER TABLE public.approvals
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.approval_policies
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.edit_requests
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.auto_set_approval_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.requested_by IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.organization_members
    WHERE user_id = NEW.requested_by
      AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_org_approval ON public.approvals;
CREATE TRIGGER trg_auto_org_approval
  BEFORE INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_approval_org();

CREATE INDEX IF NOT EXISTS idx_approvals_org ON public.approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_policies_org ON public.approval_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_org ON public.edit_requests(organization_id);

DROP POLICY IF EXISTS "Authenticated users can view approvals" ON public.approvals;
DROP POLICY IF EXISTS "Authenticated users can view policies" ON public.approval_policies;
DROP POLICY IF EXISTS "Authenticated users can view edit requests" ON public.edit_requests;

CREATE POLICY "Org members read own approvals"
  ON public.approvals FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members insert own approvals"
  ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members read own approval policies"
  ON public.approval_policies FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members read own edit requests"
  ON public.edit_requests FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Authenticated users can view settlements" ON public.pan_african_settlement_ledger;
CREATE POLICY "Finance roles read settlements"
  ON public.pan_african_settlement_ledger FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'admin', 'org_admin', 'finance_manager')
    )
  );
