
-- ============= IMMUTABLE FINANCIAL LEDGER =============
CREATE TABLE IF NOT EXISTS public.immutable_financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  module TEXT NOT NULL,                -- 'expense_approval', 'ar_collection', 'manual', etc
  action_type TEXT NOT NULL,           -- 'approve', 'reject', 'post', 'reverse'
  reference_type TEXT,                 -- 'expense', 'invoice', 'payment'
  reference_id UUID,
  amount NUMERIC(18,2) DEFAULT 0,
  currency_code TEXT DEFAULT 'NGN',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  actor_user_id UUID,
  previous_hash TEXT,
  entry_hash TEXT NOT NULL,
  sequence_number BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iml_tenant ON public.immutable_financial_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_iml_module ON public.immutable_financial_ledger(module);
CREATE INDEX IF NOT EXISTS idx_iml_created ON public.immutable_financial_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iml_seq ON public.immutable_financial_ledger(sequence_number DESC);

-- Hash chain trigger: compute previous_hash and entry_hash before insert
CREATE OR REPLACE FUNCTION public.compute_ledger_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev TEXT;
  v_payload TEXT;
BEGIN
  SELECT entry_hash INTO v_prev
  FROM public.immutable_financial_ledger
  ORDER BY sequence_number DESC
  LIMIT 1;

  NEW.previous_hash := COALESCE(v_prev, 'GENESIS');

  v_payload := COALESCE(NEW.previous_hash,'') || '|' ||
               COALESCE(NEW.tenant_id::text,'') || '|' ||
               NEW.module || '|' ||
               NEW.action_type || '|' ||
               COALESCE(NEW.reference_type,'') || '|' ||
               COALESCE(NEW.reference_id::text,'') || '|' ||
               COALESCE(NEW.amount::text,'0') || '|' ||
               COALESCE(NEW.currency_code,'NGN') || '|' ||
               COALESCE(NEW.description,'') || '|' ||
               COALESCE(NEW.metadata::text,'{}') || '|' ||
               COALESCE(NEW.actor_user_id::text,'') || '|' ||
               COALESCE(NEW.created_at::text, now()::text);

  NEW.entry_hash := encode(digest(v_payload, 'sha256'), 'hex');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_compute_ledger_hash
BEFORE INSERT ON public.immutable_financial_ledger
FOR EACH ROW EXECUTE FUNCTION public.compute_ledger_hash();

-- Block ALL updates and deletes
CREATE OR REPLACE FUNCTION public.block_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable_financial_ledger is append-only. Updates and deletes are forbidden.';
END $$;

CREATE TRIGGER trg_block_ledger_update
BEFORE UPDATE ON public.immutable_financial_ledger
FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutation();

CREATE TRIGGER trg_block_ledger_delete
BEFORE DELETE ON public.immutable_financial_ledger
FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutation();

ALTER TABLE public.immutable_financial_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ledger"
ON public.immutable_financial_ledger FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can insert ledger"
ON public.immutable_financial_ledger FOR INSERT
TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Convenience RPC
CREATE OR REPLACE FUNCTION public.append_ledger_entry(
  p_module TEXT,
  p_action_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'NGN',
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_tenant_id UUID DEFAULT NULL
) RETURNS TABLE(id UUID, entry_hash TEXT, sequence_number BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_hash TEXT;
  v_seq BIGINT;
BEGIN
  INSERT INTO public.immutable_financial_ledger(
    tenant_id, module, action_type, reference_type, reference_id,
    amount, currency_code, description, metadata, actor_user_id
  ) VALUES (
    p_tenant_id, p_module, p_action_type, p_reference_type, p_reference_id,
    p_amount, p_currency, p_description, p_metadata, auth.uid()
  )
  RETURNING immutable_financial_ledger.id, immutable_financial_ledger.entry_hash, immutable_financial_ledger.sequence_number
  INTO v_id, v_hash, v_seq;

  RETURN QUERY SELECT v_id, v_hash, v_seq;
END $$;

-- ============= CFO AUDIT LOG =============
CREATE TABLE IF NOT EXISTS public.cfo_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  module_key TEXT NOT NULL,         -- 'cash_control','ar_enforcement','expense_approval', etc
  event_type TEXT NOT NULL,         -- 'click','view','recommendation_shown','action_taken'
  recommendation TEXT,
  ledger_entry_hash TEXT,           -- links to immutable_financial_ledger.entry_hash when an action is taken
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfo_audit_user ON public.cfo_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cfo_audit_created ON public.cfo_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cfo_audit_module ON public.cfo_audit_log(module_key);

ALTER TABLE public.cfo_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their cfo audit"
ON public.cfo_audit_log FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'finance_manager'));

CREATE POLICY "Users can insert their cfo audit"
ON public.cfo_audit_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============= CFO BRIEF LOG =============
CREATE TABLE IF NOT EXISTS public.cfo_brief_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  recipient_email TEXT NOT NULL,
  brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_position NUMERIC,
  receivables_total NUMERIC,
  receivables_overdue NUMERIC,
  payables_total NUMERIC,
  revenue_mtd NUMERIC,
  status TEXT NOT NULL DEFAULT 'queued',  -- queued|sent|failed
  error TEXT,
  resend_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfo_brief_date ON public.cfo_brief_log(brief_date DESC);

ALTER TABLE public.cfo_brief_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read brief log"
ON public.cfo_brief_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'finance_manager'));
