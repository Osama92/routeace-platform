-- Add route-level SLA field to routes table.
-- route_waypoints already has sla_hours (per-stop); this adds it at the route level
-- so dispatches can inherit a default deadline from the route.
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS sla_hours NUMERIC(6, 2);

COMMENT ON COLUMN public.routes.sla_hours IS
  'Max hours to complete a delivery on this route. Auto-applied as sla_deadline on dispatches that use this route.';
