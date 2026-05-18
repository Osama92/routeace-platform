-- Harden leave request ownership so users cannot self-approve their own pending leave.
DROP POLICY IF EXISTS "requests_update_own_pending" ON public.leave_requests;

CREATE POLICY "requests_update_own_pending"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status IN ('pending', 'cancelled'));

-- Keep staff availability aligned with approved leave where a staff row can be matched safely by email.
CREATE OR REPLACE FUNCTION public.sync_staff_status_from_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_rows integer := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT email INTO v_email
    FROM public.profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF v_email IS NOT NULL AND NEW.status = 'approved' THEN
      UPDATE public.staff
      SET status = 'on_leave', updated_at = now()
      WHERE lower(email) = lower(v_email)
        AND status <> 'terminated';
      GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSIF v_email IS NOT NULL AND NEW.status IN ('rejected', 'cancelled') THEN
      UPDATE public.staff
      SET status = 'active', updated_at = now()
      WHERE lower(email) = lower(v_email)
        AND status = 'on_leave';
      GET DIAGNOSTICS v_rows = ROW_COUNT;
    END IF;

    INSERT INTO public.leave_audit_log(leave_request_id, user_id, actor_id, action, new_state)
    VALUES (
      NEW.id,
      NEW.user_id,
      auth.uid(),
      'staff_status_sync:' || NEW.status,
      jsonb_build_object('matched_email', v_email, 'rows_updated', v_rows)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_status_from_leave ON public.leave_requests;
CREATE TRIGGER trg_sync_staff_status_from_leave
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_status_from_leave();