
-- Fix driver_behavior_events INSERT
DROP POLICY "System insert driver_behavior_events" ON public.driver_behavior_events;
CREATE POLICY "Ops+ insert driver_behavior_events" ON public.driver_behavior_events FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix vehicle_sensor_readings INSERT
DROP POLICY "System insert vehicle_sensor_readings" ON public.vehicle_sensor_readings;
CREATE POLICY "Ops+ insert vehicle_sensor_readings" ON public.vehicle_sensor_readings FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix sensor_alerts INSERT
DROP POLICY "System insert sensor_alerts" ON public.sensor_alerts;
CREATE POLICY "Ops+ insert sensor_alerts" ON public.sensor_alerts FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix accident_risk_scores INSERT
DROP POLICY "System insert accident_risk_scores" ON public.accident_risk_scores;
CREATE POLICY "Ops+ insert accident_risk_scores" ON public.accident_risk_scores FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix fraud_detection_events INSERT
DROP POLICY "System insert fraud_detection_events" ON public.fraud_detection_events;
CREATE POLICY "Ops+ insert fraud_detection_events" ON public.fraud_detection_events FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Fix insurance_claims_predictions INSERT
DROP POLICY "System insert insurance_claims_predictions" ON public.insurance_claims_predictions;
CREATE POLICY "Ops+ insert insurance_claims_predictions" ON public.insurance_claims_predictions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_manager')
);

-- Fix auto_dispatch_decisions INSERT
DROP POLICY "System insert auto_dispatch_decisions" ON public.auto_dispatch_decisions;
CREATE POLICY "Ops+ insert auto_dispatch_decisions" ON public.auto_dispatch_decisions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Fix revenue_loss_events INSERT
DROP POLICY "System insert revenue_loss_events" ON public.revenue_loss_events;
CREATE POLICY "Ops+ insert revenue_loss_events" ON public.revenue_loss_events FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager')
);
