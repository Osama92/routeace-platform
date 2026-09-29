-- ============================================================
-- Idempotency key for dispatch creation — defense in depth
-- ============================================================
-- The frontend fix (synchronous ref guards on all 5 dispatch-creation
-- flows) closes the double-click race that produced real duplicate
-- dispatches in production (confirmed: 10 duplicate rows across 4 lanes
-- for one org, inserted milliseconds to tens-of-milliseconds apart).
--
-- This is the backstop for what a frontend guard can't catch: two browser
-- tabs open to the same dialog, a network-level retry, or any future flow
-- that reintroduces the race. dispatch_number ($`DSP-${Date.now()}`) gives
-- zero real protection — it's just a display string, not enforced against
-- duplicate content, and two inserts a millisecond apart get different
-- values anyway.
--
-- client_request_id is generated ONCE per dialog-open (client-side,
-- crypto.randomUUID()) and sent with the insert. Two submits from the same
-- open dialog carry the same id, so the second one is rejected at the
-- database level regardless of what raced past the frontend guard.
-- Nullable + a PARTIAL unique index: existing rows never had one, and not
-- every insert path needs to supply it on day one.
-- ============================================================

ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatches_org_client_request_id
  ON public.dispatches (organization_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

COMMENT ON COLUMN public.dispatches.client_request_id IS
  'Generated once per creation-dialog-open (crypto.randomUUID()), sent with the insert. A resubmit from the same dialog session reuses it, so a duplicate insert is rejected by the unique index below rather than silently creating a second dispatch. NULL for older rows and any insert path that does not yet supply one.';
