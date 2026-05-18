
-- ============================================
-- WHATSAPP ORDER INGESTION + ORDER-TO-DELIVERY
-- ============================================

-- WhatsApp Orders (AI-extracted)
CREATE TABLE public.whatsapp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id),
  raw_message TEXT NOT NULL,
  sender_phone TEXT,
  sender_name TEXT,
  outlet_name TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC DEFAULT 0,
  structured_order JSONB,
  sales_order_id UUID,
  error_message TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order-to-Delivery tracking
CREATE TABLE public.order_delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT NOT NULL,
  outlet_name TEXT,
  customer_id UUID,
  warehouse_id UUID REFERENCES public.warehouses(id),
  stage TEXT NOT NULL DEFAULT 'order_received',
  order_received_at TIMESTAMPTZ DEFAULT now(),
  picklist_created_at TIMESTAMPTZ,
  picking_started_at TIMESTAMPTZ,
  picking_completed_at TIMESTAMPTZ,
  staging_completed_at TIMESTAMPTZ,
  loaded_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  pod_captured_at TIMESTAMPTZ,
  driver_name TEXT,
  vehicle_plate TEXT,
  delivery_slot TEXT,
  epod_method TEXT,
  epod_verified BOOLEAN DEFAULT false,
  total_items INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shelf audit records (merchandiser)
CREATE TABLE public.shelf_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_name TEXT NOT NULL,
  merchandiser_id UUID,
  audit_type TEXT NOT NULL DEFAULT 'planogram',
  compliance_score NUMERIC,
  photo_urls TEXT[],
  issues_found JSONB,
  sku_visibility JSONB,
  notes TEXT,
  audit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales call logs (supervisor monitoring)
CREATE TABLE public.sales_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID,
  rep_name TEXT,
  outlet_name TEXT,
  visit_type TEXT DEFAULT 'scheduled',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  orders_placed INTEGER DEFAULT 0,
  order_value NUMERIC DEFAULT 0,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fleet tracking for FMCG logistics
CREATE TABLE public.fmcg_fleet_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_plate TEXT NOT NULL,
  vehicle_type TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  current_status TEXT DEFAULT 'available',
  current_lat NUMERIC,
  current_lng NUMERIC,
  fuel_level_pct INTEGER,
  last_maintenance DATE,
  next_maintenance DATE,
  total_deliveries_today INTEGER DEFAULT 0,
  total_km_today NUMERIC DEFAULT 0,
  assigned_route TEXT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmcg_fleet_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Auth can view whatsapp_orders" ON public.whatsapp_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage whatsapp_orders" ON public.whatsapp_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can view order_delivery_tracking" ON public.order_delivery_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage order_delivery_tracking" ON public.order_delivery_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can view shelf_audits" ON public.shelf_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage shelf_audits" ON public.shelf_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can view sales_call_logs" ON public.sales_call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage sales_call_logs" ON public.sales_call_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can view fmcg_fleet_tracking" ON public.fmcg_fleet_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage fmcg_fleet_tracking" ON public.fmcg_fleet_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_whatsapp_orders_status ON public.whatsapp_orders(extraction_status);
CREATE INDEX idx_order_delivery_stage ON public.order_delivery_tracking(stage);
CREATE INDEX idx_shelf_audits_date ON public.shelf_audits(audit_date);
CREATE INDEX idx_sales_call_logs_rep ON public.sales_call_logs(rep_id);
CREATE INDEX idx_fmcg_fleet_status ON public.fmcg_fleet_tracking(current_status);
