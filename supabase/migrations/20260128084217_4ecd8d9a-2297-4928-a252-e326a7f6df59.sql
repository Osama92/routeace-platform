-- =============================================================================
-- ROUTEACE STATE MACHINE & BILLING ENGINE HARDENING
-- =============================================================================

-- 1. CREATE DISPATCH STATE ENUM (Immutable state transitions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispatch_state') THEN
    CREATE TYPE public.dispatch_state AS ENUM (
      'created',
      'pending_approval',
      'approved',
      'assigned',
      'enroute',
      'picked_up',
      'in_transit',
      'delivered',
      'closed',
      'invoiced',
      'cancelled'
    );
  END IF;
END $$;

-- 2. DISPATCH STATE TRANSITIONS TABLE (Defines allowed transitions)
CREATE TABLE IF NOT EXISTS public.dispatch_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state dispatch_state NOT NULL,
  to_state dispatch_state NOT NULL,
  allowed_roles app_role[] NOT NULL DEFAULT '{admin}',
  requires_reason BOOLEAN DEFAULT FALSE,
  auto_trigger TEXT DEFAULT NULL, -- e.g., 'invoice_on_close'
  sla_hours INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_state, to_state)
);

-- Insert valid transitions
INSERT INTO public.dispatch_state_transitions (from_state, to_state, allowed_roles, requires_reason, auto_trigger, sla_hours) VALUES
  ('created', 'pending_approval', '{admin,operations,dispatcher}', FALSE, NULL, NULL),
  ('pending_approval', 'approved', '{admin,operations}', FALSE, NULL, 24),
  ('pending_approval', 'cancelled', '{admin,operations}', TRUE, NULL, NULL),
  ('approved', 'assigned', '{admin,operations,dispatcher}', FALSE, NULL, 2),
  ('approved', 'cancelled', '{admin,operations}', TRUE, NULL, NULL),
  ('assigned', 'enroute', '{admin,operations,dispatcher,driver}', FALSE, NULL, 1),
  ('assigned', 'cancelled', '{admin,operations}', TRUE, NULL, NULL),
  ('enroute', 'picked_up', '{admin,operations,dispatcher,driver}', FALSE, NULL, 4),
  ('picked_up', 'in_transit', '{admin,operations,dispatcher,driver}', FALSE, NULL, NULL),
  ('in_transit', 'delivered', '{admin,operations,dispatcher,driver}', FALSE, NULL, NULL),
  ('delivered', 'closed', '{admin,operations}', FALSE, 'auto_invoice', 48),
  ('closed', 'invoiced', '{admin,operations}', FALSE, NULL, NULL),
  -- Recovery transitions for dead states
  ('assigned', 'approved', '{admin}', TRUE, NULL, NULL),
  ('enroute', 'assigned', '{admin}', TRUE, NULL, NULL)
ON CONFLICT (from_state, to_state) DO NOTHING;

ALTER TABLE public.dispatch_state_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage state transitions"
ON public.dispatch_state_transitions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view transitions"
ON public.dispatch_state_transitions FOR SELECT TO authenticated
USING (true);

-- 3. DISPATCH STATE HISTORY (Event Sourcing)
CREATE TABLE IF NOT EXISTS public.dispatch_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_state_history_dispatch ON public.dispatch_state_history(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_state_history_created ON public.dispatch_state_history(created_at DESC);

ALTER TABLE public.dispatch_state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view state history"
ON public.dispatch_state_history FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System can insert state history"
ON public.dispatch_state_history FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. SLA TIMERS TABLE
CREATE TABLE IF NOT EXISTS public.dispatch_sla_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  breached BOOLEAN DEFAULT FALSE,
  breached_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_timers_dispatch ON public.dispatch_sla_timers(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_sla_timers_deadline ON public.dispatch_sla_timers(deadline_at) WHERE completed_at IS NULL;

ALTER TABLE public.dispatch_sla_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA timers"
ON public.dispatch_sla_timers FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'dispatcher'::app_role)
);

-- 5. DISPATCH LOCKS TABLE (Prevent duplicate processing)
CREATE TABLE IF NOT EXISTS public.dispatch_locks (
  dispatch_id UUID PRIMARY KEY REFERENCES public.dispatches(id) ON DELETE CASCADE,
  locked_by UUID REFERENCES auth.users(id),
  lock_reason TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispatch_locks_expiry ON public.dispatch_locks(expires_at);

ALTER TABLE public.dispatch_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage dispatch locks"
ON public.dispatch_locks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role)
);

-- 6. STATE TRANSITION VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION public.validate_dispatch_transition(
  p_dispatch_id UUID,
  p_new_state TEXT,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_state TEXT;
  v_transition RECORD;
  v_user_role app_role;
  v_is_locked BOOLEAN;
  v_lock_reason TEXT;
BEGIN
  -- Get current state
  SELECT status INTO v_current_state
  FROM dispatches
  WHERE id = p_dispatch_id;

  IF v_current_state IS NULL THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Dispatch not found');
  END IF;

  -- Check for existing lock
  SELECT TRUE, lock_reason INTO v_is_locked, v_lock_reason
  FROM dispatch_locks
  WHERE dispatch_id = p_dispatch_id
    AND expires_at > now()
    AND locked_by != p_user_id;

  IF v_is_locked THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Dispatch is locked: ' || v_lock_reason);
  END IF;

  -- Get user's role
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = p_user_id;

  -- Check if transition is allowed
  SELECT * INTO v_transition
  FROM dispatch_state_transitions
  WHERE from_state::TEXT = v_current_state
    AND to_state::TEXT = p_new_state;

  IF v_transition IS NULL THEN
    RETURN jsonb_build_object(
      'valid', FALSE, 
      'error', 'Invalid transition from ' || v_current_state || ' to ' || p_new_state
    );
  END IF;

  -- Check role permission
  IF NOT (v_user_role = ANY(v_transition.allowed_roles)) THEN
    RETURN jsonb_build_object(
      'valid', FALSE, 
      'error', 'Role ' || v_user_role || ' not allowed for this transition'
    );
  END IF;

  -- Check if reason is required
  IF v_transition.requires_reason AND (p_reason IS NULL OR p_reason = '') THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Reason required for this transition');
  END IF;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'from_state', v_current_state,
    'to_state', p_new_state,
    'auto_trigger', v_transition.auto_trigger,
    'sla_hours', v_transition.sla_hours
  );
END;
$$;

-- 7. EXECUTE STATE TRANSITION FUNCTION
CREATE OR REPLACE FUNCTION public.execute_dispatch_transition(
  p_dispatch_id UUID,
  p_new_state TEXT,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation JSONB;
  v_current_state TEXT;
  v_sla_hours INT;
BEGIN
  -- Validate transition
  v_validation := validate_dispatch_transition(p_dispatch_id, p_new_state, p_user_id, p_reason);
  
  IF NOT (v_validation->>'valid')::BOOLEAN THEN
    RETURN v_validation;
  END IF;

  v_current_state := v_validation->>'from_state';
  v_sla_hours := (v_validation->>'sla_hours')::INT;

  -- Acquire lock
  INSERT INTO dispatch_locks (dispatch_id, locked_by, lock_reason, expires_at)
  VALUES (p_dispatch_id, p_user_id, 'state_transition', now() + interval '30 seconds')
  ON CONFLICT (dispatch_id) DO UPDATE SET
    locked_by = p_user_id,
    lock_reason = 'state_transition',
    locked_at = now(),
    expires_at = now() + interval '30 seconds';

  -- Update dispatch status
  UPDATE dispatches SET
    status = p_new_state,
    updated_at = now(),
    -- Set timestamps based on state
    actual_pickup = CASE WHEN p_new_state = 'picked_up' THEN now() ELSE actual_pickup END,
    actual_delivery = CASE WHEN p_new_state = 'delivered' THEN now() ELSE actual_delivery END
  WHERE id = p_dispatch_id;

  -- Complete previous SLA timer
  UPDATE dispatch_sla_timers SET
    completed_at = now()
  WHERE dispatch_id = p_dispatch_id
    AND state = v_current_state
    AND completed_at IS NULL;

  -- Create new SLA timer if applicable
  IF v_sla_hours IS NOT NULL THEN
    INSERT INTO dispatch_sla_timers (dispatch_id, state, deadline_at)
    VALUES (p_dispatch_id, p_new_state, now() + (v_sla_hours || ' hours')::interval);
  END IF;

  -- Record state change in history (event sourcing)
  INSERT INTO dispatch_state_history (dispatch_id, from_state, to_state, changed_by, reason, metadata)
  VALUES (p_dispatch_id, v_current_state, p_new_state, p_user_id, p_reason, p_metadata);

  -- Release lock
  DELETE FROM dispatch_locks WHERE dispatch_id = p_dispatch_id;

  -- Check for auto-triggers
  IF v_validation->>'auto_trigger' = 'auto_invoice' THEN
    -- Will be handled by edge function or trigger
    PERFORM pg_notify('dispatch_closed', json_build_object('dispatch_id', p_dispatch_id)::text);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'dispatch_id', p_dispatch_id,
    'from_state', v_current_state,
    'to_state', p_new_state,
    'auto_trigger', v_validation->>'auto_trigger'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Release lock on error
    DELETE FROM dispatch_locks WHERE dispatch_id = p_dispatch_id;
    RETURN jsonb_build_object('valid', FALSE, 'error', SQLERRM);
END;
$$;

-- 8. PARTNER TIERS TABLE (for rate limiting and monetization)
CREATE TABLE IF NOT EXISTS public.partner_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  rate_limit_per_day INT NOT NULL DEFAULT 10000,
  monthly_price NUMERIC(10,2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.partner_tiers (name, rate_limit_per_minute, rate_limit_per_day, monthly_price, features) VALUES
  ('starter', 30, 5000, 0, '{"sandbox_only": true, "support": "community"}'),
  ('professional', 120, 50000, 50000, '{"production_access": true, "support": "email", "webhooks": true}'),
  ('enterprise', 600, 500000, 200000, '{"production_access": true, "support": "priority", "webhooks": true, "custom_sla": true}')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tiers"
ON public.partner_tiers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin manages tiers"
ON public.partner_tiers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. ADD TIER TO PARTNERS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'tier_id') THEN
    ALTER TABLE public.partners ADD COLUMN tier_id UUID REFERENCES public.partner_tiers(id);
  END IF;
END $$;

-- 10. WEBHOOK CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.partner_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For signing payloads
  events TEXT[] NOT NULL DEFAULT '{dispatch.status_changed}',
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_response_status INT,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages webhooks"
ON public.partner_webhooks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. WEBHOOK DELIVERY LOG
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.partner_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  attempt_number INT DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views webhook deliveries"
ON public.webhook_deliveries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. INVOICE LOCKS - Enhanced for immutability after payment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'locked_by') THEN
    ALTER TABLE public.invoices ADD COLUMN locked_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'lock_type') THEN
    ALTER TABLE public.invoices ADD COLUMN lock_type TEXT DEFAULT NULL; -- 'payment', 'sync', 'manual'
  END IF;
END $$;

-- 13. INVOICE MUTATION PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_locked_invoice_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If invoice is locked and trying to modify financial fields
  IF OLD.is_locked = TRUE THEN
    -- Allow only specific updates (status changes, notes)
    IF NEW.amount != OLD.amount OR
       NEW.tax_amount != OLD.tax_amount OR
       NEW.total_amount != OLD.total_amount OR
       NEW.customer_id != OLD.customer_id OR
       NEW.dispatch_id IS DISTINCT FROM OLD.dispatch_id THEN
      RAISE EXCEPTION 'Cannot modify locked invoice. Reason: %', COALESCE(OLD.locked_reason, 'Invoice is finalized');
    END IF;
  END IF;
  
  -- Auto-lock on payment
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.is_locked := TRUE;
    NEW.locked_at := now();
    NEW.locked_reason := 'Paid invoice - financial records immutable';
    NEW.lock_type := 'payment';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_invoice_mutation ON public.invoices;
CREATE TRIGGER trg_prevent_locked_invoice_mutation
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_invoice_mutation();

-- 14. DUPLICATE DISPATCH PREVENTION
CREATE OR REPLACE FUNCTION public.prevent_duplicate_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INT;
BEGIN
  -- Check for duplicate dispatch in same day with same customer, pickup, delivery
  SELECT COUNT(*) INTO v_existing_count
  FROM dispatches
  WHERE customer_id = NEW.customer_id
    AND pickup_address = NEW.pickup_address
    AND delivery_address = NEW.delivery_address
    AND DATE(created_at) = DATE(NEW.created_at)
    AND status NOT IN ('cancelled')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Duplicate dispatch detected for same customer, route, and date. Use existing dispatch or cancel it first.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_dispatch ON public.dispatches;
CREATE TRIGGER trg_prevent_duplicate_dispatch
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_dispatch();

-- 15. DUPLICATE INVOICE PREVENTION
CREATE OR REPLACE FUNCTION public.prevent_duplicate_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INT;
BEGIN
  -- Check for duplicate invoice for same dispatch
  IF NEW.dispatch_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM invoices
    WHERE dispatch_id = NEW.dispatch_id
      AND status NOT IN ('cancelled', 'draft')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'Invoice already exists for this dispatch. Cannot create duplicate.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_invoice ON public.invoices;
CREATE TRIGGER trg_prevent_duplicate_invoice
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_invoice();

-- 16. AUTO-INVOICE ON DELIVERY CLOSE
CREATE OR REPLACE FUNCTION public.auto_create_invoice_on_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_invoice UUID;
  v_invoice_number TEXT;
  v_dispatch RECORD;
BEGIN
  -- Only trigger when status changes to 'closed' or 'delivered'
  IF NEW.status IN ('closed', 'delivered') AND OLD.status NOT IN ('closed', 'delivered', 'invoiced') THEN
    -- Check if invoice already exists
    SELECT id INTO v_existing_invoice
    FROM invoices
    WHERE dispatch_id = NEW.id
      AND status NOT IN ('cancelled');

    IF v_existing_invoice IS NULL AND NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      -- Generate invoice number
      v_invoice_number := 'RA-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
      
      -- Get dispatch details
      SELECT * INTO v_dispatch FROM dispatches WHERE id = NEW.id;
      
      -- Create draft invoice
      INSERT INTO invoices (
        invoice_number,
        customer_id,
        dispatch_id,
        amount,
        tax_amount,
        total_amount,
        status,
        created_by
      ) VALUES (
        v_invoice_number,
        NEW.customer_id,
        NEW.id,
        NEW.cost,
        NEW.cost * 0.075, -- 7.5% VAT
        NEW.cost * 1.075,
        'draft',
        NEW.created_by
      );
      
      -- Update dispatch to invoiced
      -- Note: this is handled by the main flow, not here to avoid recursion
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_on_close ON public.dispatches;
CREATE TRIGGER trg_auto_invoice_on_close
  AFTER UPDATE ON public.dispatches
  FOR EACH ROW
  WHEN (NEW.status IN ('closed', 'delivered') AND OLD.status NOT IN ('closed', 'delivered', 'invoiced'))
  EXECUTE FUNCTION public.auto_create_invoice_on_close();

-- 17. FINANCIAL AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'invoice', 'expense', 'payment'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_entity ON public.financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created ON public.financial_audit_log(created_at DESC);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views financial audit"
ON public.financial_audit_log FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts financial audit"
ON public.financial_audit_log FOR INSERT TO authenticated
WITH CHECK (true);

-- 18. INVOICE CHANGE AUDIT TRIGGER
CREATE OR REPLACE FUNCTION public.log_invoice_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO financial_audit_log (entity_type, entity_id, action, old_values, new_values, changed_by)
    VALUES (
      'invoice',
      NEW.id,
      'update',
      jsonb_build_object(
        'amount', OLD.amount,
        'tax_amount', OLD.tax_amount,
        'total_amount', OLD.total_amount,
        'status', OLD.status
      ),
      jsonb_build_object(
        'amount', NEW.amount,
        'tax_amount', NEW.tax_amount,
        'total_amount', NEW.total_amount,
        'status', NEW.status
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO financial_audit_log (entity_type, entity_id, action, old_values, changed_by)
    VALUES ('invoice', OLD.id, 'delete', to_jsonb(OLD), auth.uid());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_invoice_changes ON public.invoices;
CREATE TRIGGER trg_log_invoice_changes
  AFTER UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_changes();

-- 19. DEAD STATE RECOVERY VIEW
CREATE OR REPLACE VIEW public.dispatch_dead_states AS
SELECT 
  d.id,
  d.dispatch_number,
  d.status,
  d.created_at,
  d.updated_at,
  EXTRACT(EPOCH FROM (now() - d.updated_at)) / 3600 AS hours_in_state,
  st.sla_hours,
  CASE 
    WHEN st.sla_hours IS NOT NULL AND EXTRACT(EPOCH FROM (now() - d.updated_at)) / 3600 > st.sla_hours THEN TRUE
    ELSE FALSE
  END AS is_stale
FROM dispatches d
LEFT JOIN dispatch_state_transitions st 
  ON st.from_state::TEXT = d.status
WHERE d.status NOT IN ('delivered', 'closed', 'invoiced', 'cancelled')
  AND d.updated_at < now() - interval '24 hours';

-- Grant access to the view
GRANT SELECT ON public.dispatch_dead_states TO authenticated;