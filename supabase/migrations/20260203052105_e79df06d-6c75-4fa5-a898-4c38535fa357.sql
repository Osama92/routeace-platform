-- Create route_risk_register table for ops risk tracking
CREATE TABLE IF NOT EXISTS public.route_risk_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_description TEXT NOT NULL,
  mitigation_plan TEXT,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  reported_by UUID,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'closed')),
  last_incident_date DATE,
  incident_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_risk_register ENABLE ROW LEVEL SECURITY;

-- RLS policies for route_risk_register
CREATE POLICY "Authenticated users can view route risks" 
ON public.route_risk_register FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can create route risks" 
ON public.route_risk_register FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can update route risks" 
ON public.route_risk_register FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create ops_sops table for standard operating procedures
CREATE TABLE IF NOT EXISTS public.ops_sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ops_sops ENABLE ROW LEVEL SECURITY;

-- RLS policies for ops_sops
CREATE POLICY "Authenticated users can view SOPs" 
ON public.ops_sops FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can create SOPs" 
ON public.ops_sops FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can update SOPs" 
ON public.ops_sops FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can delete SOPs" 
ON public.ops_sops FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create blocked_orders table for tracking supply/demand issues
CREATE TABLE IF NOT EXISTS public.blocked_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('supply_blocked', 'customer_blocked')),
  reason TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view blocked orders" 
ON public.blocked_orders FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can create blocked orders" 
ON public.blocked_orders FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ops managers can update blocked orders" 
ON public.blocked_orders FOR UPDATE 
USING (auth.uid() IS NOT NULL);