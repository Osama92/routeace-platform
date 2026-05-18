
-- FMCG OS Core Schema

-- 1. Outlets (Retail points)
CREATE TABLE public.fmcg_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  outlet_name TEXT NOT NULL,
  outlet_type TEXT DEFAULT 'retail',
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('platinum','gold','silver','bronze')),
  contact_name TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'NG',
  lat NUMERIC,
  lng NUMERIC,
  gps_verified BOOLEAN DEFAULT false,
  engagement_score NUMERIC DEFAULT 0,
  churn_risk_score NUMERIC DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  assigned_sales_rep UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SKUs
CREATE TABLE public.fmcg_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  sku_code TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  unit_price NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  weight_kg NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Beat Plans
CREATE TABLE public.fmcg_beat_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  plan_name TEXT NOT NULL,
  sales_rep_id UUID,
  territory TEXT,
  day_of_week INTEGER,
  outlet_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Field Visits
CREATE TABLE public.fmcg_field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  outlet_id UUID REFERENCES public.fmcg_outlets(id),
  sales_rep_id UUID,
  beat_plan_id UUID REFERENCES public.fmcg_beat_plans(id),
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  distance_from_outlet_m NUMERIC,
  is_valid_visit BOOLEAN DEFAULT true,
  visit_notes TEXT,
  photo_urls TEXT[],
  competitor_prices JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Orders
CREATE TABLE public.fmcg_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  outlet_id UUID REFERENCES public.fmcg_outlets(id),
  sales_rep_id UUID,
  order_number TEXT,
  order_date TIMESTAMPTZ DEFAULT now(),
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  delivery_status TEXT DEFAULT 'unassigned',
  delivery_priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Order Line Items
CREATE TABLE public.fmcg_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.fmcg_orders(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES public.fmcg_skus(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  delivered_qty INTEGER,
  variance_qty INTEGER DEFAULT 0
);

-- 7. Delivery (POD)
CREATE TABLE public.fmcg_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  order_id UUID REFERENCES public.fmcg_orders(id),
  driver_id UUID,
  vehicle_id UUID,
  route_plan_id UUID,
  dispatch_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  completion_time TIMESTAMPTZ,
  geofence_confirmed BOOLEAN DEFAULT false,
  signature_url TEXT,
  photo_proof_url TEXT,
  qr_validated BOOLEAN DEFAULT false,
  receipt_hash TEXT,
  delay_risk_score NUMERIC DEFAULT 0,
  delay_reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Stock Levels
CREATE TABLE public.fmcg_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  warehouse_id TEXT,
  sku_id UUID REFERENCES public.fmcg_skus(id),
  current_qty INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  max_capacity INTEGER,
  stockout_prob_3d NUMERIC DEFAULT 0,
  stockout_prob_7d NUMERIC DEFAULT 0,
  recommended_restock_qty INTEGER DEFAULT 0,
  urgency_score NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 9. Distributors
CREATE TABLE public.fmcg_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  distributor_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT,
  region TEXT,
  country TEXT DEFAULT 'NG',
  fill_rate NUMERIC DEFAULT 0,
  payment_speed_days NUMERIC DEFAULT 0,
  territory_coverage_pct NUMERIC DEFAULT 0,
  promo_execution_score NUMERIC DEFAULT 0,
  delivery_compliance_pct NUMERIC DEFAULT 0,
  margin_leakage_pct NUMERIC DEFAULT 0,
  performance_index NUMERIC DEFAULT 0,
  risk_band TEXT DEFAULT 'medium',
  credit_limit NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Trade Promotions
CREATE TABLE public.fmcg_trade_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  promo_name TEXT NOT NULL,
  promo_type TEXT DEFAULT 'discount',
  start_date DATE,
  end_date DATE,
  discount_pct NUMERIC DEFAULT 0,
  target_skus UUID[] DEFAULT '{}',
  target_regions TEXT[] DEFAULT '{}',
  predicted_roi NUMERIC,
  actual_roi NUMERIC,
  predicted_uplift_pct NUMERIC,
  actual_uplift_pct NUMERIC,
  margin_erosion_pct NUMERIC,
  inventory_strain_score NUMERIC,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Retailer Credit
CREATE TABLE public.fmcg_retailer_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  outlet_id UUID REFERENCES public.fmcg_outlets(id),
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  default_probability NUMERIC DEFAULT 0,
  risk_band TEXT DEFAULT 'medium',
  payment_timeliness_score NUMERIC DEFAULT 0,
  order_frequency_score NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  recommended_terms TEXT DEFAULT 'COD',
  last_assessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. FMCG Reconciliation
CREATE TABLE public.fmcg_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  order_id UUID REFERENCES public.fmcg_orders(id),
  delivery_id UUID REFERENCES public.fmcg_deliveries(id),
  invoice_generated BOOLEAN DEFAULT false,
  invoice_id UUID,
  ordered_qty INTEGER DEFAULT 0,
  delivered_qty INTEGER DEFAULT 0,
  variance_qty INTEGER DEFAULT 0,
  variance_value NUMERIC DEFAULT 0,
  margin_impact NUMERIC DEFAULT 0,
  resolution_status TEXT DEFAULT 'pending',
  resolution_notes TEXT,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. FMCG Benchmark Index
CREATE TABLE public.fmcg_benchmark_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  period_start DATE,
  period_end DATE,
  sample_size INTEGER DEFAULT 0,
  percentile_25 NUMERIC,
  percentile_50 NUMERIC,
  percentile_75 NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. FMCG Route Plans (Van Sales)
CREATE TABLE public.fmcg_route_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  route_name TEXT NOT NULL,
  driver_id UUID,
  vehicle_id UUID,
  planned_outlets UUID[] DEFAULT '{}',
  planned_distance_km NUMERIC DEFAULT 0,
  actual_distance_km NUMERIC,
  fuel_cost_estimate NUMERIC DEFAULT 0,
  actual_fuel_cost NUMERIC,
  optimization_score NUMERIC DEFAULT 0,
  route_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS on all FMCG tables
ALTER TABLE public.fmcg_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_beat_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_trade_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_retailer_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_benchmark_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_route_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users with admin/super_admin/ops_manager/finance_manager roles
CREATE POLICY "fmcg_outlets_access" ON public.fmcg_outlets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_skus_access" ON public.fmcg_skus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_beat_plans_access" ON public.fmcg_beat_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "fmcg_field_visits_access" ON public.fmcg_field_visits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "fmcg_orders_access" ON public.fmcg_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_order_items_access" ON public.fmcg_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_deliveries_access" ON public.fmcg_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

CREATE POLICY "fmcg_stock_levels_access" ON public.fmcg_stock_levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_distributors_access" ON public.fmcg_distributors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_trade_promos_access" ON public.fmcg_trade_promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_retailer_credit_access" ON public.fmcg_retailer_credit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_reconciliation_access" ON public.fmcg_reconciliation FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE POLICY "fmcg_benchmark_access" ON public.fmcg_benchmark_index FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "fmcg_route_plans_access" ON public.fmcg_route_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));
