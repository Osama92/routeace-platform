-- Replace driver_job_notifications RLS policies with corrected versions
DROP POLICY IF EXISTS "Org members read job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Drivers read own job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Driver reads own job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Org members update job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Ops update job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Drivers update own job notifications" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Driver responds to own notification" ON public.driver_job_notifications;
DROP POLICY IF EXISTS "Service role manages job notifications" ON public.driver_job_notifications;

-- Org members (ops managers, admins) can read all org notifications
CREATE POLICY "Org members read job notifications"
  ON public.driver_job_notifications FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Drivers read their OWN notifications only
-- (drivers are NOT in organization_members — they use drivers.user_id)
CREATE POLICY "Driver reads own job notifications"
  ON public.driver_job_notifications FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Driver can update their own notification (accept/decline)
CREATE POLICY "Driver responds to own notification"
  ON public.driver_job_notifications FOR UPDATE TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Org members (ops) can update notifications in their org
CREATE POLICY "Ops update job notifications"
  ON public.driver_job_notifications FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Service role full access (for triggers and edge functions)
CREATE POLICY "Service role manages job notifications"
  ON public.driver_job_notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');