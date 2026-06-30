-- Relax the duplicate dispatch prevention trigger.
-- The original check blocked same customer + pickup + delivery + date,
-- which is too strict — legitimate operations send multiple loads on the
-- same route in a single day (different trucks, different cargo, etc.).
-- dispatch_number is already UNIQUE on the table (auto-generated DSP-<timestamp>),
-- so true accidental duplicates are impossible. Drop the trigger entirely.

DROP TRIGGER IF EXISTS trg_prevent_duplicate_dispatch ON public.dispatches;
DROP FUNCTION IF EXISTS public.prevent_duplicate_dispatch();
