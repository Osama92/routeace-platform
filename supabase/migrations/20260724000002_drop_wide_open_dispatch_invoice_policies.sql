-- Drop the original wide-open permissive SELECT policies that were superseded by
-- tenant_isolation_gate (RESTRICTIVE) in migration 20260512222741.
-- These policies currently have no effect because RESTRICTIVE policies AND with
-- permissive ones — but removing them makes the intent explicit and eliminates
-- any risk if a future migration accidentally disables RLS then re-enables it.

DROP POLICY IF EXISTS "Authenticated users can view dispatches" ON public.dispatches;
DROP POLICY IF EXISTS "Authenticated users can view invoices"  ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view delivery updates" ON public.delivery_updates;
