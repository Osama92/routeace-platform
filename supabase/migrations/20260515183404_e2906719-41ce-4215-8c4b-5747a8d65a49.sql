-- RPC to safely resolve approver/rejecter identities for the approval history UI.
-- Returns name/email ONLY for users who share an organization with the caller.
-- Prevents cross-tenant data leakage.

CREATE OR REPLACE FUNCTION public.get_org_member_identities(_user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members caller
      JOIN public.organization_members target
        ON target.organization_id = caller.organization_id
      WHERE caller.user_id = auth.uid()
        AND caller.is_active = true
        AND target.user_id = p.user_id
        AND target.is_active = true
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_member_identities(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_member_identities(uuid[]) TO authenticated;