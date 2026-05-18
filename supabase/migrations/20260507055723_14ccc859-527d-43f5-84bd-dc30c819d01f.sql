-- Add missing columns to ld_transporters
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN vehicle_count INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ld_transporters ADD COLUMN self_registered BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Invite tokens
CREATE TABLE IF NOT EXISTS public.transporter_invite_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE DEFAULT substring(encode(gen_random_bytes(9), 'base64'), 1, 12),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  uses_count      INTEGER NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transporter_invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org managers manage invite tokens" ON public.transporter_invite_tokens;
CREATE POLICY "Org managers manage invite tokens"
  ON public.transporter_invite_tokens FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ) AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin','admin','org_admin')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.transporter_invite_tokens(token) WHERE is_active = true;

-- Billing records
CREATE TABLE IF NOT EXISTS public.transporter_billing_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transporter_id        UUID NOT NULL REFERENCES public.ld_transporters(id) ON DELETE CASCADE,
  billing_month         DATE NOT NULL,
  vehicle_count         INTEGER NOT NULL DEFAULT 0,
  drop_count            INTEGER NOT NULL DEFAULT 0,
  vehicle_charge        NUMERIC NOT NULL DEFAULT 0,
  drop_charge           NUMERIC NOT NULL DEFAULT 0,
  total_charge          NUMERIC GENERATED ALWAYS AS (vehicle_charge + drop_charge) STORED,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','billed','paid')),
  deduct_from_transporter BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transporter_id, billing_month)
);
ALTER TABLE public.transporter_billing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read billing records" ON public.transporter_billing_records;
CREATE POLICY "Org members read billing records"
  ON public.transporter_billing_records FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX IF NOT EXISTS idx_billing_org_month ON public.transporter_billing_records(organization_id, billing_month DESC);
