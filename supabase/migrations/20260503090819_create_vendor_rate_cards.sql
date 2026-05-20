-- vendor_rate_cards was referenced but never created — reconstruct from usage
CREATE TABLE IF NOT EXISTS public.vendor_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  vendor_name text NOT NULL,
  vendor_partner_id uuid,
  route_from text NOT NULL,
  route_to text NOT NULL,
  vehicle_type text NOT NULL,
  rate_ngn numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  effective_from date,
  effective_to date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_rate_cards ENABLE ROW LEVEL SECURITY;

-- pod_confirmed was used in triggers before being explicitly defined
ALTER TABLE public.dispatches ADD COLUMN IF NOT EXISTS pod_confirmed boolean DEFAULT false;

CREATE POLICY "Org members can view rate cards"
  ON public.vendor_rate_cards FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Authorized roles can manage rate cards"
  ON public.vendor_rate_cards FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );
