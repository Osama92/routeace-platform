DROP POLICY IF EXISTS "Authenticated read" ON public.reseller_price_floors;

CREATE POLICY "Super admin read"
ON public.reseller_price_floors
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));