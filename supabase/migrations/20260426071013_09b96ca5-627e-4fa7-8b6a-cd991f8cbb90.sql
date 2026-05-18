
-- Use extensions.digest explicitly
CREATE OR REPLACE FUNCTION public.compute_ledger_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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

  NEW.entry_hash := encode(extensions.digest(v_payload::bytea, 'sha256'::text), 'hex');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.block_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'immutable_financial_ledger is append-only. Updates and deletes are forbidden.';
END $$;

-- Tighten ledger SELECT: only admins/finance can read all; others can read only their own actions
DROP POLICY IF EXISTS "Authenticated can read ledger" ON public.immutable_financial_ledger;
CREATE POLICY "Privileged can read all ledger entries"
ON public.immutable_financial_ledger FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin')
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'finance_manager')
  OR actor_user_id = auth.uid()
);
