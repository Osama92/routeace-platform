
-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE DEFAULT '',
  channel TEXT NOT NULL CHECK (channel IN ('phone','whatsapp','email','instagram','live_chat')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','escalated','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  tag TEXT NOT NULL DEFAULT 'general',
  customer_name TEXT NOT NULL,
  order_id TEXT,
  assignee TEXT,
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '4 hours'),
  csat INTEGER CHECK (csat BETWEEN 1 AND 5),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer','agent','bot')),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ticket_messages_select" ON public.support_ticket_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_messages_insert" ON public.support_ticket_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS support_ticket_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'TKT-' || LPAD(nextval('support_ticket_ref_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_ref BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_ref();

CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- Global Tax Rules Table
CREATE TABLE IF NOT EXISTS public.global_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('cit','vat','gst','withholding','payroll','digital_services','transfer_pricing')),
  tax_name TEXT NOT NULL,
  rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_rules_select" ON public.global_tax_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "tax_rules_admin_write" ON public.global_tax_rules FOR ALL TO authenticated USING (true);

-- Treasury Risk Log Table
CREATE TABLE IF NOT EXISTS public.treasury_risk_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id TEXT,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_category TEXT NOT NULL CHECK (risk_category IN ('low','moderate','high','critical')),
  fraud_indicators JSONB NOT NULL DEFAULT '[]',
  liquidity_flags JSONB NOT NULL DEFAULT '[]',
  operational_flags JSONB NOT NULL DEFAULT '[]',
  ai_recommendation TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.treasury_risk_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_logs_select" ON public.treasury_risk_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_logs_insert" ON public.treasury_risk_logs FOR INSERT TO authenticated WITH CHECK (true);
