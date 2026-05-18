
UPDATE public.profiles
SET approval_status = 'suspended',
    is_active = false
WHERE user_id IN (
  '28d0f8bd-f794-4d12-8069-ebbe19372c23',
  'd2de80f9-50ba-4063-ab1a-f82acfbd70b4',
  '154e3e82-86db-4cf5-9aba-58b024ef105e',
  '291d26d9-7e24-42d2-9f40-955e7d05a8e2'
)
RETURNING user_id, email, approval_status, is_active;
