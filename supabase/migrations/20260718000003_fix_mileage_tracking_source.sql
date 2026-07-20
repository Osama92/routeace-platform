-- Fix: vehicle_mileage_tracking.reading_source check constraint only allows
-- ('manual', 'gps', 'system') but trg_fn_dispatch_delivered_km was inserting
-- 'dispatch', which violates the constraint and causes every dispatch status
-- update to 'delivered' to fail with a check constraint error.
-- Solution: 'dispatch' is a subset of 'system' tracking — map it to 'system'.

CREATE OR REPLACE FUNCTION public.trg_fn_dispatch_delivered_km()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_km             NUMERIC;
  v_org_id         UUID;
  v_current_odo    NUMERIC;
BEGIN
  -- Only fire when status transitions TO 'delivered'
  IF NOT (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Use total_distance_km if set, fall back to distance_km
  v_km := COALESCE(NEW.total_distance_km, NEW.distance_km, 0);
  IF v_km <= 0 THEN
    RETURN NEW;
  END IF;

  v_org_id := NEW.organization_id;

  SELECT current_odometer INTO v_current_odo
  FROM public.vehicles
  WHERE id = NEW.vehicle_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Accumulate KM onto vehicle
  UPDATE public.vehicles
  SET
    current_odometer = COALESCE(current_odometer, 0) + v_km,
    lifetime_km      = COALESCE(lifetime_km, 0) + v_km,
    weekly_km = (
      SELECT COALESCE(SUM(COALESCE(d2.total_distance_km, d2.distance_km, 0)), 0)
      FROM public.dispatches d2
      WHERE d2.vehicle_id = NEW.vehicle_id
        AND d2.organization_id = v_org_id
        AND d2.status = 'delivered'
        AND d2.updated_at >= date_trunc('week', NOW())
    ) + v_km,
    monthly_km = (
      SELECT COALESCE(SUM(COALESCE(d3.total_distance_km, d3.distance_km, 0)), 0)
      FROM public.dispatches d3
      WHERE d3.vehicle_id = NEW.vehicle_id
        AND d3.organization_id = v_org_id
        AND d3.status = 'delivered'
        AND d3.updated_at >= date_trunc('month', NOW())
    ) + v_km
  WHERE id = NEW.vehicle_id AND organization_id = v_org_id;

  -- FIX: use 'system' (valid constraint value) instead of 'dispatch'
  INSERT INTO public.vehicle_mileage_tracking (
    vehicle_id, odometer_reading, reading_date, reading_source, gps_distance_km, trip_count
  )
  VALUES (
    NEW.vehicle_id,
    COALESCE(v_current_odo, 0) + v_km,
    CURRENT_DATE,
    'system',           -- was 'dispatch' — violates CHECK ('manual','gps','system')
    v_km,
    1
  )
  ON CONFLICT (vehicle_id, reading_date)
  DO UPDATE SET
    odometer_reading = EXCLUDED.odometer_reading,
    gps_distance_km  = COALESCE(vehicle_mileage_tracking.gps_distance_km, 0) + v_km,
    trip_count       = COALESCE(vehicle_mileage_tracking.trip_count, 0) + 1;

  -- Recalculate health score
  PERFORM public.recalculate_vehicle_health(NEW.vehicle_id, v_org_id);

  RETURN NEW;
END;
$$;
