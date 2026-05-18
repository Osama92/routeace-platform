
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.tenant_website_leads;

CREATE POLICY "Public can submit leads to published sites"
ON public.tenant_website_leads FOR INSERT TO anon, authenticated
WITH CHECK (
  (lead_email IS NOT NULL OR lead_phone IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.tenant_websites w
    WHERE w.id = website_id AND w.status = 'published' AND w.user_id = tenant_website_leads.user_id
  )
);
