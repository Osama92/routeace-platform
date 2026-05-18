
-- white_label_resellers: reseller self-read
DROP POLICY IF EXISTS "Reseller can view own listing" ON public.white_label_resellers;
CREATE POLICY "Reseller can view own listing"
ON public.white_label_resellers
FOR SELECT
USING (onboarded_by = auth.uid());

-- reseller_sales: reseller self-read (via white_label_resellers ownership)
DROP POLICY IF EXISTS "Reseller can view own sales" ON public.reseller_sales;
CREATE POLICY "Reseller can view own sales"
ON public.reseller_sales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_resellers w
    WHERE w.id = reseller_sales.reseller_id
      AND w.onboarded_by = auth.uid()
  )
);
