
-- Fix SUPA_policy_exists_rls_disabled and SUPA_rls_disabled_in_public
-- Enable RLS on subscription_plans table (already has a SELECT policy)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
