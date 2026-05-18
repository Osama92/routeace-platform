-- =====================================================
-- SLA ENGINE COMPLETE DATABASE SCHEMA
-- =====================================================

-- SLA Policies Table (Zone-based defaults + client overrides)
CREATE TABLE public.sla_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  zone TEXT NOT NULL, -- Lagos/Southwest, South East, South South, North
  state TEXT, -- Specific state override
  sla_duration_days NUMERIC(4,1) NOT NULL DEFAULT 2, -- Duration in days (e.g., 1.5, 2, 3)
  grace_period_hours INTEGER DEFAULT 0,
  penalty_per_day NUMERIC(12,2) DEFAULT 0, -- ₦ per day of delay
  max_penalty_cap NUMERIC(12,2), -- Maximum penalty limit
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client SLA Contracts (ties SLA to specific clients)
CREATE TABLE public.sla_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  contract_name TEXT NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  sla_duration_days NUMERIC(4,1) NOT NULL,
  penalty_per_day NUMERIC(12,2) NOT NULL DEFAULT 0,
  grace_period_hours INTEGER DEFAULT 0,
  max_penalty_cap NUMERIC(12,2),
  force_majeure_exclusions TEXT[],
  dispute_resolution_clause TEXT,
  contract_pdf_url TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Insurance Policies
CREATE TABLE public.sla_insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('per_route', 'contract_level', 'subscription_bundled')),
  customer_id UUID REFERENCES public.customers(id),
  sla_contract_id UUID REFERENCES public.sla_contracts(id),
  coverage_days_max INTEGER NOT NULL DEFAULT 2, -- Max days covered
  coverage_amount_max NUMERIC(12,2) NOT NULL, -- ₦ cap
  insurance_fee_type TEXT DEFAULT 'percentage' CHECK (insurance_fee_type IN ('percentage', 'fixed')),
  insurance_fee_value NUMERIC(8,2) NOT NULL, -- % or fixed ₦
  exclusions TEXT[], -- force_majeure, customer_delay, etc.
  is_active BOOLEAN DEFAULT true,
  valid_from DATE NOT NULL,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Breach Records (tracks all breaches)
CREATE TABLE public.sla_breach_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  sla_contract_id UUID REFERENCES public.sla_contracts(id),
  sla_policy_id UUID REFERENCES public.sla_policies(id),
  route_id UUID REFERENCES public.routes(id),
  
  -- SLA Timing
  sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_completion TIMESTAMP WITH TIME ZONE,
  days_breached NUMERIC(4,1) DEFAULT 0,
  
  -- Penalty Calculation
  penalty_per_day NUMERIC(12,2) DEFAULT 0,
  total_penalty NUMERIC(12,2) DEFAULT 0,
  grace_period_applied BOOLEAN DEFAULT false,
  
  -- Insurance
  insurance_policy_id UUID REFERENCES public.sla_insurance_policies(id),
  insurance_coverage_applied NUMERIC(12,2) DEFAULT 0,
  net_penalty_after_insurance NUMERIC(12,2) DEFAULT 0,
  
  -- Approval Flow
  breach_status TEXT DEFAULT 'detected' CHECK (breach_status IN ('detected', 'pending_review', 'approved', 'disputed', 'waived', 'invoiced')),
  flagged_by UUID REFERENCES auth.users(id),
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Invoice Link
  invoice_id UUID REFERENCES public.invoices(id),
  invoice_line_item_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Risk Notifications (client notifications)
CREATE TABLE public.sla_risk_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  
  -- Risk Assessment
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB, -- { confidence_score, buffer_remaining, traffic_volatility, etc. }
  
  -- Notification
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'portal', 'whatsapp')),
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_content TEXT,
  notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'delivered', 'failed', 'acknowledged')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Mitigation
  ai_recommendation TEXT,
  mitigation_action_taken TEXT,
  breach_prevented BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Configuration Settings (global settings)
CREATE TABLE public.sla_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default zone SLA policies
INSERT INTO public.sla_policies (name, zone, sla_duration_days, penalty_per_day, is_default, description) VALUES
('Lagos / Southwest Standard', 'Southwest', 2, 50000, true, 'Default SLA for Lagos and Southwest zone: 1-2 days'),
('South East Standard', 'South East', 3, 50000, true, 'Default SLA for South East zone: 3 days'),
('South South Standard', 'South South', 3, 50000, true, 'Default SLA for South South zone: 3 days'),
('North Standard', 'North', 5, 50000, true, 'Default SLA for North zone: 4-5 days (configurable by state)');

-- Insert default SLA settings
INSERT INTO public.sla_settings (setting_key, setting_value, description) VALUES
('auto_notify_enabled', '{"enabled": true, "risk_threshold": 60}'::jsonb, 'Auto-notify clients when SLA risk exceeds threshold'),
('default_grace_period', '{"hours": 6}'::jsonb, 'Default grace period before penalties apply'),
('insurance_enabled', '{"enabled": true}'::jsonb, 'Enable SLA insurance features');

-- Enable RLS
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breach_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_risk_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SLA tables
CREATE POLICY "Admins can manage SLA policies" ON public.sla_policies
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Ops managers can view SLA policies" ON public.sla_policies
  FOR SELECT USING (
    public.is_ops_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'operations'::app_role)
  );

CREATE POLICY "Admins can manage SLA contracts" ON public.sla_contracts
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Ops and finance can view SLA contracts" ON public.sla_contracts
  FOR SELECT USING (
    public.is_ops_manager(auth.uid()) OR
    public.is_finance_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'operations'::app_role)
  );

CREATE POLICY "Admins can manage insurance policies" ON public.sla_insurance_policies
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Finance can view insurance policies" ON public.sla_insurance_policies
  FOR SELECT USING (public.is_finance_manager(auth.uid()));

CREATE POLICY "Admins can manage breach records" ON public.sla_breach_records
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Ops can view and flag breaches" ON public.sla_breach_records
  FOR SELECT USING (public.is_ops_manager(auth.uid()));

CREATE POLICY "Finance can view breach records" ON public.sla_breach_records
  FOR SELECT USING (public.is_finance_manager(auth.uid()));

CREATE POLICY "Admins can manage risk notifications" ON public.sla_risk_notifications
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.is_ops_manager(auth.uid())
  );

CREATE POLICY "Admins can manage SLA settings" ON public.sla_settings
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    public.is_org_admin(auth.uid())
  );

-- Add SLA fields to dispatches table
ALTER TABLE public.dispatches 
ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES public.sla_policies(id),
ADD COLUMN IF NOT EXISTS sla_contract_id UUID REFERENCES public.sla_contracts(id),
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_track' CHECK (sla_status IN ('on_track', 'at_risk', 'breached')),
ADD COLUMN IF NOT EXISTS sla_risk_score INTEGER DEFAULT 0;

-- Add SLA penalty fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS sla_penalty_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_insurance_coverage NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_breach_record_id UUID REFERENCES public.sla_breach_records(id);

-- Function to calculate SLA deadline
CREATE OR REPLACE FUNCTION public.calculate_sla_deadline(
  p_dispatch_date TIMESTAMP WITH TIME ZONE,
  p_sla_duration_days NUMERIC
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN p_dispatch_date + (p_sla_duration_days || ' days')::interval;
END;
$$;

-- Function to detect and record SLA breaches
CREATE OR REPLACE FUNCTION public.detect_sla_breach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sla_deadline TIMESTAMP WITH TIME ZONE;
  v_days_breached NUMERIC;
  v_penalty_per_day NUMERIC;
  v_total_penalty NUMERIC;
  v_insurance_coverage NUMERIC := 0;
  v_insurance_policy_id UUID;
BEGIN
  -- Only trigger when status changes to delivered/closed
  IF NEW.status IN ('delivered', 'closed') AND OLD.status NOT IN ('delivered', 'closed') THEN
    v_sla_deadline := NEW.sla_deadline;
    
    -- Check if SLA was breached
    IF v_sla_deadline IS NOT NULL AND NEW.actual_delivery > v_sla_deadline THEN
      -- Calculate days breached
      v_days_breached := EXTRACT(EPOCH FROM (NEW.actual_delivery - v_sla_deadline)) / 86400;
      
      -- Get penalty rate from contract or policy
      SELECT COALESCE(sc.penalty_per_day, sp.penalty_per_day, 50000)
      INTO v_penalty_per_day
      FROM dispatches d
      LEFT JOIN sla_contracts sc ON sc.id = d.sla_contract_id
      LEFT JOIN sla_policies sp ON sp.id = d.sla_policy_id
      WHERE d.id = NEW.id;
      
      v_total_penalty := v_days_breached * v_penalty_per_day;
      
      -- Check for insurance
      SELECT ip.id, LEAST(v_total_penalty, ip.coverage_amount_max)
      INTO v_insurance_policy_id, v_insurance_coverage
      FROM sla_insurance_policies ip
      WHERE ip.customer_id = NEW.customer_id
        AND ip.is_active = true
        AND ip.valid_from <= CURRENT_DATE
        AND (ip.valid_until IS NULL OR ip.valid_until >= CURRENT_DATE)
      LIMIT 1;
      
      -- Update dispatch SLA status
      NEW.sla_status := 'breached';
      
      -- Create breach record
      INSERT INTO sla_breach_records (
        dispatch_id, customer_id, sla_contract_id, sla_policy_id,
        sla_deadline, actual_completion, days_breached,
        penalty_per_day, total_penalty,
        insurance_policy_id, insurance_coverage_applied, net_penalty_after_insurance,
        breach_status
      ) VALUES (
        NEW.id, NEW.customer_id, NEW.sla_contract_id, NEW.sla_policy_id,
        v_sla_deadline, NEW.actual_delivery, v_days_breached,
        v_penalty_per_day, v_total_penalty,
        v_insurance_policy_id, COALESCE(v_insurance_coverage, 0), v_total_penalty - COALESCE(v_insurance_coverage, 0),
        'detected'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for SLA breach detection
DROP TRIGGER IF EXISTS trigger_detect_sla_breach ON public.dispatches;
CREATE TRIGGER trigger_detect_sla_breach
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_sla_breach();

-- Function to calculate SLA risk score
CREATE OR REPLACE FUNCTION public.calculate_sla_risk_score(
  p_dispatch_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_dispatch RECORD;
  v_risk_score INTEGER := 0;
  v_buffer_hours NUMERIC;
  v_confidence_penalty INTEGER;
BEGIN
  SELECT d.*, 
    EXTRACT(EPOCH FROM (d.sla_deadline - now())) / 3600 as hours_remaining
  INTO v_dispatch
  FROM dispatches d
  WHERE d.id = p_dispatch_id;
  
  IF v_dispatch IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Base risk from time remaining
  v_buffer_hours := v_dispatch.hours_remaining;
  IF v_buffer_hours < 0 THEN
    v_risk_score := 100; -- Already breached
  ELSIF v_buffer_hours < 6 THEN
    v_risk_score := 85;
  ELSIF v_buffer_hours < 12 THEN
    v_risk_score := 70;
  ELSIF v_buffer_hours < 24 THEN
    v_risk_score := 50;
  ELSIF v_buffer_hours < 48 THEN
    v_risk_score := 30;
  ELSE
    v_risk_score := 10;
  END IF;
  
  -- Adjust for drop density (more drops = higher risk)
  IF v_dispatch.total_drops > 10 THEN
    v_risk_score := LEAST(100, v_risk_score + 15);
  ELSIF v_dispatch.total_drops > 5 THEN
    v_risk_score := LEAST(100, v_risk_score + 8);
  END IF;
  
  -- Adjust for status
  IF v_dispatch.status = 'in_transit' THEN
    v_risk_score := GREATEST(0, v_risk_score - 10);
  ELSIF v_dispatch.status IN ('draft', 'pending') THEN
    v_risk_score := LEAST(100, v_risk_score + 20);
  END IF;
  
  RETURN v_risk_score;
END;
$$;

-- Enable realtime for SLA tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_breach_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_risk_notifications;