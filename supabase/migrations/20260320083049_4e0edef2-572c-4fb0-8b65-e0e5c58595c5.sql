
-- Tenant configuration table for governance
CREATE TABLE public.tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Business Identity
  company_name TEXT NOT NULL DEFAULT '',
  business_email TEXT,
  admin_phone TEXT,
  country TEXT DEFAULT 'Nigeria',
  operating_cities TEXT[] DEFAULT '{}',
  company_size TEXT,
  
  -- Operating Model
  operating_model TEXT NOT NULL DEFAULT 'haulage' CHECK (operating_model IN ('haulage', 'multidrop', 'hybrid')),
  
  -- Fleet Structure
  fleet_count INTEGER DEFAULT 1,
  vehicle_count INTEGER DEFAULT 1,
  vehicle_classes TEXT[] DEFAULT '{}',
  ownership_type TEXT DEFAULT 'owned',
  branch_count INTEGER DEFAULT 1,
  
  -- Order Intake
  order_channels TEXT[] DEFAULT '{manual}',
  
  -- Billing
  billing_currency TEXT DEFAULT 'NGN',
  billing_cycle TEXT DEFAULT 'monthly',
  tax_id TEXT,
  
  -- Subscription
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'growth', 'enterprise')),
  plan_started_at TIMESTAMPTZ DEFAULT now(),
  
  -- AI Credits
  ai_credits_total INTEGER DEFAULT 0,
  ai_credits_used INTEGER DEFAULT 0,
  ai_credits_rollover INTEGER DEFAULT 0,
  ai_auto_purchase BOOLEAN DEFAULT false,
  ai_budget_cap INTEGER,
  
  -- Limits
  max_users INTEGER DEFAULT 3,
  max_vehicles INTEGER DEFAULT 1,
  max_branches INTEGER DEFAULT 1,
  max_monthly_dispatches INTEGER DEFAULT 10,
  max_api_calls INTEGER DEFAULT 0,
  max_integrations INTEGER DEFAULT 0,
  
  -- Ops Manager Permissions (Admin toggles)
  ops_can_add_fleet BOOLEAN DEFAULT true,
  ops_can_add_vehicles BOOLEAN DEFAULT true,
  ops_can_add_drivers BOOLEAN DEFAULT true,
  ops_can_add_maintenance BOOLEAN DEFAULT true,
  ops_can_create_dispatch BOOLEAN DEFAULT true,
  ops_can_approve_dispatch BOOLEAN DEFAULT false,
  ops_can_generate_waybill BOOLEAN DEFAULT true,
  ops_can_connect_integrations BOOLEAN DEFAULT false,
  ops_can_manage_order_inbox BOOLEAN DEFAULT true,
  ops_can_edit_customers BOOLEAN DEFAULT false,
  ops_can_see_billing BOOLEAN DEFAULT false,
  ops_can_see_finance BOOLEAN DEFAULT false,
  
  -- Governance policies
  dispatch_approval_required BOOLEAN DEFAULT false,
  high_value_dispatch_threshold NUMERIC DEFAULT 500000,
  waybill_auto_generate BOOLEAN DEFAULT true,
  maintenance_logging_required BOOLEAN DEFAULT false,
  
  -- Enabled modules (JSON for flexibility)
  enabled_modules JSONB DEFAULT '["dispatching","fleet","drivers","tracking","reporting"]'::jsonb,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_step INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own config
CREATE POLICY "Users can read own tenant config"
  ON public.tenant_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: admins can read/write all tenant configs in their org
CREATE POLICY "Admins can manage tenant config"
  ON public.tenant_config FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    user_id = auth.uid()
  );

-- Auto-update timestamp
CREATE TRIGGER update_tenant_config_timestamp
  BEFORE UPDATE ON public.tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
