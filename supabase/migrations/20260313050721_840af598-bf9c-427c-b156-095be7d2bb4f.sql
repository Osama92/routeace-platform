
CREATE OR REPLACE FUNCTION public.calculate_sla_risk_score(p_dispatch_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dispatch RECORD;
  v_risk_score INTEGER := 0;
  v_buffer_hours NUMERIC;
BEGIN
  SELECT d.*, 
    EXTRACT(EPOCH FROM (d.sla_deadline - now())) / 3600 as hours_remaining
  INTO v_dispatch
  FROM dispatches d
  WHERE d.id = p_dispatch_id;
  
  IF v_dispatch IS NULL THEN
    RETURN 0;
  END IF;
  
  v_buffer_hours := v_dispatch.hours_remaining;
  IF v_buffer_hours < 0 THEN
    v_risk_score := 100;
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
  
  IF v_dispatch.total_drops > 10 THEN
    v_risk_score := LEAST(100, v_risk_score + 15);
  ELSIF v_dispatch.total_drops > 5 THEN
    v_risk_score := LEAST(100, v_risk_score + 8);
  END IF;
  
  IF v_dispatch.status = 'in_transit' THEN
    v_risk_score := GREATEST(0, v_risk_score - 10);
  ELSIF v_dispatch.status IN ('draft', 'pending') THEN
    v_risk_score := LEAST(100, v_risk_score + 20);
  END IF;
  
  RETURN v_risk_score;
END;
$function$;
