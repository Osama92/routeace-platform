-- ============================================
-- RouteAce Intelligent Dispatch & Enterprise Expansion Release
-- ============================================

-- 1. Order Items table for detailed item tracking
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.order_inbox(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  weight_kg NUMERIC(10,2),
  volume_cbm NUMERIC(10,3),
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  special_handling TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add vehicle capacity fields for intelligent routing
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS max_weight_kg NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS max_volume_cbm NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS max_drops_per_route INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS truck_category TEXT DEFAULT 'standard';

-- 3. Dispatch plans table for route grouping
CREATE TABLE IF NOT EXISTS public.dispatch_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_number TEXT NOT NULL,
  planned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'executed')),
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  total_orders INTEGER DEFAULT 0,
  total_distance_km NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Dispatch plan items (grouped orders)
CREATE TABLE IF NOT EXISTS public.dispatch_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.dispatch_plans(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.order_inbox(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  route_group TEXT,
  sequence_order INTEGER DEFAULT 1,
  suggested_vehicle_type TEXT,
  grouping_reason TEXT,
  estimated_distance_km NUMERIC(10,2),
  estimated_cost NUMERIC(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Waybills/Manifests table
CREATE TABLE IF NOT EXISTS public.waybills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  waybill_number TEXT NOT NULL UNIQUE,
  plan_id UUID REFERENCES public.dispatch_plans(id),
  dispatch_id UUID REFERENCES public.dispatches(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  route_summary TEXT,
  total_drops INTEGER DEFAULT 1,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  printed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'printed', 'in_use', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Waybill items (customers on the manifest)
CREATE TABLE IF NOT EXISTS public.waybill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  waybill_id UUID REFERENCES public.waybills(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  delivery_address TEXT NOT NULL,
  item_description TEXT,
  sequence_order INTEGER DEFAULT 1,
  delivered_at TIMESTAMP WITH TIME ZONE,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Capital & Funding table for investor tracking
CREATE TABLE IF NOT EXISTS public.capital_funding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funding_type TEXT NOT NULL CHECK (funding_type IN ('equity', 'debt', 'grant', 'other')),
  investor_name TEXT NOT NULL,
  investor_type TEXT DEFAULT 'individual',
  amount NUMERIC(15,2) NOT NULL,
  interest_rate_annual NUMERIC(5,2) DEFAULT 0,
  tenure_months INTEGER,
  repayment_type TEXT DEFAULT 'monthly' CHECK (repayment_type IN ('monthly', 'annual', 'deferred', 'bullet')),
  wht_rate NUMERIC(5,2) DEFAULT 10,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'defaulted', 'restructured')),
  total_repaid NUMERIC(15,2) DEFAULT 0,
  next_payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Capital repayment schedule
CREATE TABLE IF NOT EXISTS public.capital_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funding_id UUID REFERENCES public.capital_funding(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC(15,2) DEFAULT 0,
  interest_amount NUMERIC(15,2) DEFAULT 0,
  wht_amount NUMERIC(15,2) DEFAULT 0,
  net_payable NUMERIC(15,2) NOT NULL,
  paid_date DATE,
  paid_amount NUMERIC(15,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. White-label reseller tracking
CREATE TABLE IF NOT EXISTS public.white_label_resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_name TEXT NOT NULL,
  reseller_code TEXT UNIQUE NOT NULL,
  parent_reseller_id UUID REFERENCES public.white_label_resellers(id),
  commission_rate NUMERIC(5,2) DEFAULT 20,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  api_access_tier TEXT DEFAULT 'basic' CHECK (api_access_tier IN ('basic', 'professional', 'enterprise')),
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_commission NUMERIC(15,2) DEFAULT 0,
  onboarded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Reseller sales tracking
CREATE TABLE IF NOT EXISTS public.reseller_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID REFERENCES public.white_label_resellers(id) ON DELETE CASCADE,
  client_id UUID,
  sale_type TEXT NOT NULL,
  sale_amount NUMERIC(15,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(15,2) NOT NULL,
  routeace_share NUMERIC(15,2) NOT NULL,
  sale_date DATE DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Onboarding progress tracking
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, step_id)
);

-- 12. Add ETA and driver contact fields to dispatches if not exist
ALTER TABLE public.dispatches
ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waybill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_funding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users with appropriate roles
CREATE POLICY "Allow access to order_items" ON public.order_items FOR ALL USING (public.has_any_role(auth.uid()));
CREATE POLICY "Allow access to dispatch_plans" ON public.dispatch_plans FOR ALL USING (public.has_any_role(auth.uid()));
CREATE POLICY "Allow access to dispatch_plan_items" ON public.dispatch_plan_items FOR ALL USING (public.has_any_role(auth.uid()));
CREATE POLICY "Allow access to waybills" ON public.waybills FOR ALL USING (public.has_any_role(auth.uid()));
CREATE POLICY "Allow access to waybill_items" ON public.waybill_items FOR ALL USING (public.has_any_role(auth.uid()));
CREATE POLICY "Allow finance access to capital_funding" ON public.capital_funding FOR ALL USING (
  public.has_role(auth.uid(), 'finance_manager') OR 
  public.has_role(auth.uid(), 'org_admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Allow finance access to capital_repayments" ON public.capital_repayments FOR ALL USING (
  public.has_role(auth.uid(), 'finance_manager') OR 
  public.has_role(auth.uid(), 'org_admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Super admin access to resellers" ON public.white_label_resellers FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Super admin access to reseller_sales" ON public.reseller_sales FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Users can manage their onboarding" ON public.onboarding_progress FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dispatch_plans_status ON public.dispatch_plans(status);
CREATE INDEX IF NOT EXISTS idx_waybills_dispatch ON public.waybills(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_capital_funding_status ON public.capital_funding(status);
CREATE INDEX IF NOT EXISTS idx_reseller_sales_reseller ON public.reseller_sales(reseller_id);

-- Add trigger to update timestamps
CREATE TRIGGER update_dispatch_plans_updated_at
  BEFORE UPDATE ON public.dispatch_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_capital_funding_updated_at
  BEFORE UPDATE ON public.capital_funding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.white_label_resellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();