
-- 1. Driver Behavior Scores
CREATE TABLE public.driver_behavior_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  overall_score NUMERIC(5,2) DEFAULT 50,
  safety_score NUMERIC(5,2) DEFAULT 50,
  fuel_efficiency_score NUMERIC(5,2) DEFAULT 50,
  brake_acceleration_score NUMERIC(5,2) DEFAULT 50,
  route_compliance_score NUMERIC(5,2) DEFAULT 50,
  incident_history_score NUMERIC(5,2) DEFAULT 100,
  inspection_compliance_score NUMERIC(5,2) DEFAULT 50,
  delivery_timeliness_score NUMERIC(5,2) DEFAULT 50,
  dispatch_tier TEXT DEFAULT 'good' CHECK (dispatch_tier IN ('elite','good','risk_monitor','blocked')),
  total_trips INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.driver_behavior_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read driver_behavior_scores" ON public.driver_behavior_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops+ insert driver_behavior_scores" ON public.driver_behavior_scores FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Ops+ update driver_behavior_scores" ON public.driver_behavior_scores FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- 2. Driver Behavior Events
CREATE TABLE public.driver_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('speeding','harsh_braking','harsh_acceleration','route_deviation','fuel_anomaly','idle_excess','accident','near_miss','fatigue_alert','inspection_failure')),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  speed_kmh NUMERIC(6,2),
  metadata JSONB DEFAULT '{}',
  vehicle_id UUID,
  dispatch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.driver_behavior_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read driver_behavior_events" ON public.driver_behavior_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert driver_behavior_events" ON public.driver_behavior_events FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Driver Insurance Profiles
CREATE TABLE public.driver_insurance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE,
  insurance_risk_score NUMERIC(5,2) DEFAULT 50,
  risk_tier TEXT DEFAULT 'medium' CHECK (risk_tier IN ('low','medium','high','critical')),
  premium_multiplier NUMERIC(4,2) DEFAULT 1.0,
  claim_probability NUMERIC(5,4) DEFAULT 0.05,
  total_claims INTEGER DEFAULT 0,
  total_claim_amount NUMERIC(12,2) DEFAULT 0,
  accident_history_score NUMERIC(5,2) DEFAULT 100,
  behavior_score NUMERIC(5,2) DEFAULT 50,
  inspection_failure_score NUMERIC(5,2) DEFAULT 100,
  route_violation_score NUMERIC(5,2) DEFAULT 100,
  timeliness_risk_score NUMERIC(5,2) DEFAULT 50,
  fatigue_pattern_score NUMERIC(5,2) DEFAULT 100,
  claims_history_score NUMERIC(5,2) DEFAULT 100,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.driver_insurance_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read driver_insurance_profiles" ON public.driver_insurance_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "System upsert driver_insurance_profiles" ON public.driver_insurance_profiles FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);
CREATE POLICY "System update driver_insurance_profiles" ON public.driver_insurance_profiles FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 4. Vehicle Sensor Readings
CREATE TABLE public.vehicle_sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  sensor_type TEXT NOT NULL CHECK (sensor_type IN ('gps','engine_temp','brake_wear','tire_pressure','fuel_level','odometer','load_weight','battery_health','speed','coolant_temp')),
  value NUMERIC(12,4) NOT NULL,
  unit TEXT,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  is_anomaly BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vehicle_sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vehicle_sensor_readings" ON public.vehicle_sensor_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert vehicle_sensor_readings" ON public.vehicle_sensor_readings FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Sensor Alerts
CREATE TABLE public.sensor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  sensor_type TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_exceeded','anomaly_detected','failure_predicted','maintenance_required')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  message TEXT NOT NULL,
  value_recorded NUMERIC(12,4),
  threshold_value NUMERIC(12,4),
  auto_action_taken TEXT,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sensor_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sensor_alerts" ON public.sensor_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert sensor_alerts" ON public.sensor_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ops+ update sensor_alerts" ON public.sensor_alerts FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- 6. Sensor Thresholds
CREATE TABLE public.sensor_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_type TEXT NOT NULL,
  min_safe_value NUMERIC(12,4),
  max_safe_value NUMERIC(12,4),
  critical_min NUMERIC(12,4),
  critical_max NUMERIC(12,4),
  unit TEXT,
  auto_action TEXT DEFAULT 'alert',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sensor_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sensor_thresholds" ON public.sensor_thresholds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage sensor_thresholds" ON public.sensor_thresholds FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- 7. Revenue Loss Events
CREATE TABLE public.revenue_loss_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_type TEXT NOT NULL CHECK (loss_type IN ('idle_truck','fuel_waste','route_inefficiency','delay_penalty','missed_delivery','underutilized_asset','maintenance_downtime','driver_inefficiency')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vehicle','driver','route','dispatch')),
  entity_id UUID NOT NULL,
  estimated_loss_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  recommended_action TEXT,
  action_taken TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.revenue_loss_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read revenue_loss_events" ON public.revenue_loss_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert revenue_loss_events" ON public.revenue_loss_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ops+ update revenue_loss_events" ON public.revenue_loss_events FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 8. Revenue Loss Analysis
CREATE TABLE public.revenue_loss_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_period TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_loss_amount NUMERIC(14,2) DEFAULT 0,
  idle_loss NUMERIC(14,2) DEFAULT 0,
  fuel_loss NUMERIC(14,2) DEFAULT 0,
  route_loss NUMERIC(14,2) DEFAULT 0,
  delay_loss NUMERIC(14,2) DEFAULT 0,
  downtime_loss NUMERIC(14,2) DEFAULT 0,
  top_loss_vehicles JSONB DEFAULT '[]',
  top_loss_routes JSONB DEFAULT '[]',
  top_loss_drivers JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.revenue_loss_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read revenue_loss_analysis" ON public.revenue_loss_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert revenue_loss_analysis" ON public.revenue_loss_analysis FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 9. Accident Risk Scores
CREATE TABLE public.accident_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  vehicle_id UUID,
  dispatch_id UUID,
  route_description TEXT,
  overall_risk_score NUMERIC(5,2) DEFAULT 0,
  driver_behavior_risk NUMERIC(5,2) DEFAULT 0,
  vehicle_condition_risk NUMERIC(5,2) DEFAULT 0,
  route_risk NUMERIC(5,2) DEFAULT 0,
  fatigue_risk NUMERIC(5,2) DEFAULT 0,
  load_risk NUMERIC(5,2) DEFAULT 0,
  weather_risk NUMERIC(5,2) DEFAULT 0,
  incident_history_risk NUMERIC(5,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  dispatch_recommendation TEXT DEFAULT 'approve' CHECK (dispatch_recommendation IN ('approve','caution','require_approval','block')),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.accident_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read accident_risk_scores" ON public.accident_risk_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert accident_risk_scores" ON public.accident_risk_scores FOR INSERT TO authenticated WITH CHECK (true);

-- 10. Fraud Detection Events
CREATE TABLE public.fraud_detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraud_type TEXT NOT NULL CHECK (fraud_type IN ('fuel_theft','mileage_tampering','false_claim','inspection_fraud','expense_fraud','ghost_trip','unauthorized_stop','cargo_theft')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver','vehicle','dispatch','expense')),
  entity_id UUID NOT NULL,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT DEFAULT 'detected' CHECK (status IN ('detected','investigating','confirmed','dismissed','resolved')),
  investigated_by UUID,
  resolved_at TIMESTAMPTZ,
  financial_impact NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fraud_detection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read fraud_detection_events" ON public.fraud_detection_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert fraud_detection_events" ON public.fraud_detection_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update fraud_detection_events" ON public.fraud_detection_events FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- 11. Insurance Claims Predictions
CREATE TABLE public.insurance_claims_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver','vehicle','fleet')),
  entity_id UUID NOT NULL,
  claim_probability NUMERIC(5,4) DEFAULT 0,
  predicted_claim_amount NUMERIC(12,2) DEFAULT 0,
  risk_factors JSONB DEFAULT '[]',
  time_horizon_days INTEGER DEFAULT 30,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  recommendation TEXT,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.insurance_claims_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read insurance_claims_predictions" ON public.insurance_claims_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert insurance_claims_predictions" ON public.insurance_claims_predictions FOR INSERT TO authenticated WITH CHECK (true);

-- 12. Auto Dispatch Decisions
CREATE TABLE public.auto_dispatch_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID,
  vehicle_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  route_description TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('auto_approved','pending_approval','blocked','override_requested')),
  reason TEXT,
  driver_score NUMERIC(5,2),
  vehicle_health_score NUMERIC(5,2),
  accident_risk_score NUMERIC(5,2),
  route_score NUMERIC(5,2),
  composite_score NUMERIC(5,2),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending','executed','cancelled','failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.auto_dispatch_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read auto_dispatch_decisions" ON public.auto_dispatch_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert auto_dispatch_decisions" ON public.auto_dispatch_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ops+ update auto_dispatch_decisions" ON public.auto_dispatch_decisions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- 13. Parts Orders
CREATE TABLE public.parts_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  part_name TEXT NOT NULL,
  part_category TEXT NOT NULL CHECK (part_category IN ('engine','brakes','tyres','electrical','suspension','fuel_system','body','transmission','cooling','other')),
  quantity INTEGER DEFAULT 1,
  urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('emergency','urgent','routine','predictive')),
  predicted_need_date DATE,
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending','ordered','shipped','delivered','installed','cancelled')),
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2),
  supplier_name TEXT,
  triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN ('manual','predictive_ai','inspection','sensor_alert','maintenance_schedule')),
  prediction_id UUID,
  currency TEXT DEFAULT 'NGN',
  notes TEXT,
  ordered_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parts_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read parts_orders" ON public.parts_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops+ manage parts_orders" ON public.parts_orders FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);
CREATE POLICY "Ops+ update parts_orders" ON public.parts_orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- 14. Parts Inventory
CREATE TABLE public.parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name TEXT NOT NULL,
  part_category TEXT NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  warehouse_location TEXT,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  supplier_name TEXT,
  last_restocked_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read parts_inventory" ON public.parts_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops+ manage parts_inventory" ON public.parts_inventory FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Indexes for performance
CREATE INDEX idx_driver_behavior_scores_driver ON public.driver_behavior_scores(driver_id);
CREATE INDEX idx_driver_behavior_events_driver ON public.driver_behavior_events(driver_id);
CREATE INDEX idx_driver_behavior_events_type ON public.driver_behavior_events(event_type);
CREATE INDEX idx_vehicle_sensor_readings_vehicle ON public.vehicle_sensor_readings(vehicle_id);
CREATE INDEX idx_vehicle_sensor_readings_type ON public.vehicle_sensor_readings(sensor_type);
CREATE INDEX idx_sensor_alerts_vehicle ON public.sensor_alerts(vehicle_id);
CREATE INDEX idx_revenue_loss_events_type ON public.revenue_loss_events(loss_type);
CREATE INDEX idx_revenue_loss_events_entity ON public.revenue_loss_events(entity_type, entity_id);
CREATE INDEX idx_accident_risk_scores_driver ON public.accident_risk_scores(driver_id);
CREATE INDEX idx_fraud_detection_events_type ON public.fraud_detection_events(fraud_type);
CREATE INDEX idx_auto_dispatch_decisions_vehicle ON public.auto_dispatch_decisions(vehicle_id);
CREATE INDEX idx_parts_orders_vehicle ON public.parts_orders(vehicle_id);
CREATE INDEX idx_parts_orders_status ON public.parts_orders(order_status);
