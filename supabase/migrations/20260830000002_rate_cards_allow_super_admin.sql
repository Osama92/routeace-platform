-- ============================================================
-- RATE CARDS — let super_admin write, matching the UI
-- ============================================================
-- Saving a rate card failed with "new row violates row-level security policy
-- for table rate_cards".
--
-- The write policies allowed finance_manager, org_admin and admin, but NOT
-- super_admin. The Rate Cards page gates its Add button on
-- hasAnyRole(["finance_manager","org_admin","admin","super_admin"]) — so a
-- super admin was shown a form they could fill in and then rejected on save.
--
-- super_admin is an organisation role here (16 such accounts span 15
-- different customer organisations), so this does NOT widen tenant access:
-- the restrictive rate_cards_tenant_gate still confines every one of them to
-- their own organisation. This only fixes who may write within it.
--
-- Approval remains separate: approve_rate_card() is what promotes a rate to
-- 'approved', and the BEFORE INSERT trigger still forces every new row to
-- 'pending' regardless of role. A super admin creating a rate still has to
-- approve it as a distinct, audited action.
-- ============================================================

DROP POLICY IF EXISTS rate_cards_finance_insert ON public.rate_cards;
CREATE POLICY rate_cards_finance_insert
  ON public.rate_cards FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

DROP POLICY IF EXISTS rate_cards_finance_update ON public.rate_cards;
CREATE POLICY rate_cards_finance_update
  ON public.rate_cards FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status IN ('pending', 'rejected')
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (status IN ('pending', 'rejected'));

DROP POLICY IF EXISTS rate_cards_finance_delete ON public.rate_cards;
CREATE POLICY rate_cards_finance_delete
  ON public.rate_cards FOR DELETE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status IN ('pending', 'rejected')
    AND (
      public.has_role(auth.uid(), 'finance_manager')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );
