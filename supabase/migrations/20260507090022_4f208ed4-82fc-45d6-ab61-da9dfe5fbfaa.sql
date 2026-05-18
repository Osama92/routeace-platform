-- Extend the transporter→dispatch sync trigger to mirror accepted and in_transit
-- statuses, so the LD Tracking page, In-Transit Monitor, and Sales & Distribution
-- Tracker reflect transporter activity in real time.

CREATE OR REPLACE FUNCTION public.sync_transporter_pod_to_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- POD uploaded → delivered + POD photo on dispatch
  IF NEW.status = 'pod_uploaded' AND NEW.pod_photo_url IS NOT NULL THEN
    UPDATE public.dispatches
    SET
      pod_confirmed     = true,
      pod_photo_url     = NEW.pod_photo_url,
      pod_notes         = NEW.pod_notes,
      pod_confirmed_at  = NEW.pod_uploaded_at,
      status            = 'delivered',
      actual_delivery   = COALESCE(actual_delivery, NEW.delivered_at, now()),
      updated_at        = now()
    WHERE id = NEW.dispatch_id;
  END IF;

  -- Pickup confirmed → picked_up
  IF NEW.status = 'pickup_confirmed' AND (OLD.status IS DISTINCT FROM 'pickup_confirmed') THEN
    UPDATE public.dispatches
    SET
      status        = 'picked_up',
      actual_pickup = COALESCE(actual_pickup, NEW.pickup_confirmed_at, now()),
      updated_at    = now()
    WHERE id = NEW.dispatch_id;
  END IF;

  -- In transit → in_transit on dispatch (powers In-Transit Monitor + Sales KPIs)
  IF NEW.status = 'in_transit' AND (OLD.status IS DISTINCT FROM 'in_transit') THEN
    UPDATE public.dispatches
    SET
      status     = 'in_transit',
      updated_at = now()
    WHERE id = NEW.dispatch_id
      AND status NOT IN ('delivered','closed','cancelled');
  END IF;

  -- Accepted → dispatched (job acknowledged, leaves "draft/pending")
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    UPDATE public.dispatches
    SET
      status     = CASE WHEN status IN ('pending','draft','assigned') THEN 'dispatched' ELSE status END,
      updated_at = now()
    WHERE id = NEW.dispatch_id;
  END IF;

  RETURN NEW;
END;
$function$;