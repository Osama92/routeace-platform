-- Customer portal isolation and access repair

CREATE OR REPLACE FUNCTION public.is_customer_user_for_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_users cu
    WHERE cu.user_id = _user_id
      AND cu.customer_id = _customer_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_customer_user_for_dispatch(_user_id uuid, _dispatch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dispatches d
    JOIN public.customer_users cu ON cu.customer_id = d.customer_id
    WHERE d.id = _dispatch_id
      AND cu.user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_customer_user_for_customer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer_user_for_dispatch(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Customer users read own customer record" ON public.customers;
CREATE POLICY "Customer users read own customer record"
ON public.customers
FOR SELECT
TO authenticated
USING (public.is_customer_user_for_customer(auth.uid(), id));

DROP POLICY IF EXISTS "Customer users read own dispatches" ON public.dispatches;
CREATE POLICY "Customer users read own dispatches"
ON public.dispatches
FOR SELECT
TO authenticated
USING (
  customer_id IS NOT NULL
  AND public.is_customer_user_for_customer(auth.uid(), customer_id)
);

DROP POLICY IF EXISTS "Customer users read own delivery updates" ON public.delivery_updates;
CREATE POLICY "Customer users read own delivery updates"
ON public.delivery_updates
FOR SELECT
TO authenticated
USING (public.is_customer_user_for_dispatch(auth.uid(), dispatch_id));

DROP POLICY IF EXISTS "Customer users read own invoices" ON public.invoices;
CREATE POLICY "Customer users read own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  customer_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.customer_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.customer_id = invoices.customer_id
      AND COALESCE(cu.can_view_invoices, true) = true
  )
);

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT cu.user_id, 'customer'::public.app_role
FROM public.customer_users cu
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = cu.user_id
    AND ur.role = 'customer'::public.app_role
);

INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  approval_status,
  is_active,
  approved_at
)
SELECT
  cu.user_id,
  COALESCE(NULLIF(c.email, ''), 'customer-' || cu.user_id::text || '@routeace.local') AS email,
  COALESCE(NULLIF(c.contact_name, ''), NULLIF(c.company_name, ''), NULLIF(c.email, ''), 'Customer') AS full_name,
  'approved' AS approval_status,
  true AS is_active,
  now() AS approved_at
FROM public.customer_users cu
JOIN public.customers c ON c.id = cu.customer_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = cu.user_id
);

UPDATE public.profiles p
SET approval_status = 'approved',
    is_active = true,
    approved_at = COALESCE(p.approved_at, now()),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.customer_users cu WHERE cu.user_id = p.user_id
)
AND COALESCE(p.approval_status, 'pending') <> 'approved';