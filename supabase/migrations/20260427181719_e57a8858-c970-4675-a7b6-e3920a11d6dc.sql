-- The staff-status sync is trigger-only; do not expose it as a callable database function.
REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM anon;
REVOKE ALL ON FUNCTION public.sync_staff_status_from_leave() FROM authenticated;