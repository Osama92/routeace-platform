-- Fix foreign keys on dispatch-linked tables that are missing ON DELETE CASCADE,
-- which causes a constraint violation when deleting a dispatch that has related records.

-- email_notifications
ALTER TABLE public.email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_dispatch_id_fkey,
  ADD CONSTRAINT email_notifications_dispatch_id_fkey
    FOREIGN KEY (dispatch_id) REFERENCES public.dispatches(id) ON DELETE CASCADE;

-- client_notification_log (also references dispatches without cascade)
ALTER TABLE public.client_notification_log
  DROP CONSTRAINT IF EXISTS client_notification_log_dispatch_id_fkey,
  ADD CONSTRAINT client_notification_log_dispatch_id_fkey
    FOREIGN KEY (dispatch_id) REFERENCES public.dispatches(id) ON DELETE SET NULL;
