-- ============================================================
-- Rate card deletion: super_admin or finance_manager only
-- ============================================================
-- rate_cards_finance_delete previously allowed finance_manager, org_admin,
-- admin AND super_admin. Narrowed to super_admin and finance_manager only,
-- per explicit instruction — org_admin and admin can still edit/propose
-- changes (rate_cards_finance_update, propose_rate_card_change), just not
-- delete.
--
-- Unchanged: a rate can only be deleted while status IN ('pending',
-- 'rejected'). An approved rate stays permanently undeletable through this
-- policy — deleting a live rate would silently invalidate whatever it
-- priced, and that guard was not part of this request.
-- ============================================================

DROP POLICY IF EXISTS rate_cards_finance_delete ON public.rate_cards;

CREATE POLICY rate_cards_finance_delete ON public.rate_cards
  FOR DELETE
  TO authenticated
  USING (
    is_org_member(auth.uid(), organization_id)
    AND status = ANY (ARRAY['pending'::text, 'rejected'::text])
    AND (
      has_role(auth.uid(), 'finance_manager'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
