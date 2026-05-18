
-- Drop wallet system for per-drop billing
CREATE TABLE public.drop_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  balance_drops INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  alert_threshold_percent INTEGER NOT NULL DEFAULT 80,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  last_recharge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Drop transactions (recharges and usage)
CREATE TABLE public.drop_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.drop_wallets(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('recharge', 'usage', 'refund', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  dispatch_id UUID REFERENCES public.dispatches(id),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Route clusters for intelligent grouping
CREATE TABLE public.route_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  cluster_type TEXT NOT NULL CHECK (cluster_type IN ('proximity', 'sla_zone', 'vehicle_type', 'time_window')),
  center_lat NUMERIC,
  center_lng NUMERIC,
  radius_km NUMERIC,
  order_count INTEGER NOT NULL DEFAULT 0,
  estimated_fuel_savings_percent NUMERIC,
  estimated_time_savings_minutes INTEGER,
  bundling_score INTEGER CHECK (bundling_score BETWEEN 0 AND 100),
  confidence_percent INTEGER CHECK (confidence_percent BETWEEN 0 AND 100),
  profit_impact_amount NUMERIC,
  vehicle_type_recommended TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'dispatched', 'completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Side hustle trips
CREATE TABLE public.side_hustle_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'delivered', 'cancelled')),
  revenue NUMERIC NOT NULL DEFAULT 0,
  platform_commission_percent NUMERIC NOT NULL DEFAULT 10,
  platform_commission_amount NUMERIC NOT NULL DEFAULT 0,
  owner_override_percent NUMERIC DEFAULT 0,
  owner_override_amount NUMERIC DEFAULT 0,
  driver_net_amount NUMERIC NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payout cycles
CREATE TABLE public.payout_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  cycle_type TEXT NOT NULL DEFAULT 'weekly' CHECK (cycle_type IN ('weekly', 'biweekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_bonuses NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  driver_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processing', 'completed', 'disputed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax remittances
CREATE TABLE public.tax_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  remittance_type TEXT NOT NULL CHECK (remittance_type IN ('paye', 'pension', 'nhf', 'nhis', 'vat', 'wht', 'platform_fee')),
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'remitted', 'overdue')),
  reference_number TEXT,
  remitted_at TIMESTAMPTZ,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance metrics tracking
CREATE TABLE public.drop_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  period_date DATE NOT NULL,
  total_drops INTEGER NOT NULL DEFAULT 0,
  cost_per_drop NUMERIC,
  revenue_per_km NUMERIC,
  driver_productivity_index NUMERIC,
  sla_compliance_percent NUMERIC,
  fleet_roi_percent NUMERIC,
  fuel_leakage_percent NUMERIC,
  trip_profitability_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.drop_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_hustle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin/org-based access
CREATE POLICY "Admins manage drop wallets" ON public.drop_wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Admins manage drop transactions" ON public.drop_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Ops and admins manage route clusters" ON public.route_clusters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Admins manage side hustle trips" ON public.side_hustle_trips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "Drivers view own side hustles" ON public.side_hustle_trips
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Finance and admins manage payouts" ON public.payout_cycles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Finance and admins manage tax remittances" ON public.tax_remittances
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "Admins view performance metrics" ON public.drop_performance_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

-- Auto-lock wallet when balance hits 0
CREATE OR REPLACE FUNCTION public.check_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.balance_drops <= 0 AND OLD.balance_drops > 0 THEN
    NEW.is_locked := true;
    NEW.locked_at := now();
  ELSIF NEW.balance_drops > 0 AND OLD.is_locked = true THEN
    NEW.is_locked := false;
    NEW.locked_at := null;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_wallet_balance
  BEFORE UPDATE ON public.drop_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_wallet_balance();

-- Update timestamps
CREATE TRIGGER update_drop_wallets_updated_at BEFORE UPDATE ON public.drop_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_route_clusters_updated_at BEFORE UPDATE ON public.route_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_side_hustle_trips_updated_at BEFORE UPDATE ON public.side_hustle_trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payout_cycles_updated_at BEFORE UPDATE ON public.payout_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_remittances_updated_at BEFORE UPDATE ON public.tax_remittances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
