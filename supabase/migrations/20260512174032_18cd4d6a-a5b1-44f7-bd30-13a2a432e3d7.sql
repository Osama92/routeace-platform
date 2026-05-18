
-- 1. Allow new "vendor" link type alongside existing "new" and "access"
ALTER TABLE public.transporter_invite_tokens
  DROP CONSTRAINT IF EXISTS transporter_invite_tokens_link_type_check;

ALTER TABLE public.transporter_invite_tokens
  ADD CONSTRAINT transporter_invite_tokens_link_type_check
  CHECK (link_type = ANY (ARRAY['new'::text, 'access'::text, 'vendor'::text]));

-- 2. Validation trigger now accepts Logistics Company as well
CREATE OR REPLACE FUNCTION public.validate_transporter_invite_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = NEW.organization_id
      AND tenant_mode IN ('LOGISTICS_DEPARTMENT', 'LOGISTICS_COMPANY')
  ) THEN
    RAISE EXCEPTION 'Transporter invite tokens require a Logistics Company or Logistics Department organisation';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. RLS: include ops_manager role for managing invite tokens
DROP POLICY IF EXISTS "Org managers manage invite tokens" ON public.transporter_invite_tokens;

CREATE POLICY "Org managers manage invite tokens"
ON public.transporter_invite_tokens
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'org_admin'::app_role, 'ops_manager'::app_role])
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
