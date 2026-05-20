
-- 1. customer_invite_tokens
CREATE TABLE IF NOT EXISTS public.customer_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  used_at TIMESTAMPTZ,
  used_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_invite_tokens_org ON public.customer_invite_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_invite_tokens_email ON public.customer_invite_tokens(email);

ALTER TABLE public.customer_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Managers in the inviting org can create / view / revoke invites
CREATE POLICY "Managers manage org customer invites"
  ON public.customer_invite_tokens
  FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (
      is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (
      is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 2. Public-safe lookup for the accept page
CREATE OR REPLACE FUNCTION public.get_customer_invite_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  customer_id UUID,
  email TEXT,
  full_name TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, organization_id, customer_id, email, full_name, expires_at, used_at
  FROM public.customer_invite_tokens
  WHERE token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_invite_by_token(TEXT) TO anon, authenticated;

-- 3. Allow customer_users to insert CSAT ratings for their own dispatches
DROP POLICY IF EXISTS "org members create csat surveys" ON public.delivery_csat_surveys;

CREATE POLICY "csat insert by org or customer"
  ON public.delivery_csat_surveys
  FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.dispatches d
      JOIN public.customer_users cu ON cu.customer_id = d.customer_id
      WHERE d.id = delivery_csat_surveys.dispatch_id
        AND cu.user_id = auth.uid()
        AND d.organization_id = delivery_csat_surveys.organization_id
    )
  );

-- Allow customers to read their own ratings
CREATE POLICY "csat customer read own"
  ON public.delivery_csat_surveys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.dispatches d
      JOIN public.customer_users cu ON cu.customer_id = d.customer_id
      WHERE d.id = delivery_csat_surveys.dispatch_id
        AND cu.user_id = auth.uid()
    )
  );
