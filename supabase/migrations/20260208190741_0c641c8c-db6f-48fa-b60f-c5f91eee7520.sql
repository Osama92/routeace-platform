-- Add ETA and KPI fields to dispatches table
ALTER TABLE public.dispatches 
ADD COLUMN IF NOT EXISTS estimated_delivery_days NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_start_date DATE,
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE,
ADD COLUMN IF NOT EXISTS total_drops INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS avg_wait_time_per_drop NUMERIC DEFAULT 2,
ADD COLUMN IF NOT EXISTS actual_delivery_days NUMERIC,
ADD COLUMN IF NOT EXISTS on_time_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS dispatch_date DATE;

-- Create a function to auto-calculate on-time status when dispatch is delivered
CREATE OR REPLACE FUNCTION public.calculate_on_time_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only trigger when status changes to delivered
  IF NEW.status IN ('delivered', 'closed') AND OLD.status NOT IN ('delivered', 'closed') THEN
    -- Calculate actual delivery days if we have the dates
    IF NEW.actual_delivery IS NOT NULL AND NEW.dispatch_date IS NOT NULL THEN
      NEW.actual_delivery_days := EXTRACT(EPOCH FROM (NEW.actual_delivery - (NEW.dispatch_date::timestamp + interval '8 hours'))) / 86400;
      
      -- Determine on-time status
      IF NEW.estimated_delivery_days IS NOT NULL THEN
        NEW.on_time_flag := NEW.actual_delivery_days <= NEW.estimated_delivery_days;
      END IF;
    ELSIF NEW.actual_delivery IS NOT NULL AND NEW.scheduled_pickup IS NOT NULL THEN
      -- Fallback: use scheduled_pickup as start
      NEW.actual_delivery_days := EXTRACT(EPOCH FROM (NEW.actual_delivery - NEW.scheduled_pickup)) / 86400;
      
      IF NEW.estimated_delivery_days IS NOT NULL THEN
        NEW.on_time_flag := NEW.actual_delivery_days <= NEW.estimated_delivery_days;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for on-time delivery calculation
DROP TRIGGER IF EXISTS trigger_calculate_on_time_delivery ON public.dispatches;
CREATE TRIGGER trigger_calculate_on_time_delivery
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_on_time_delivery();

-- Add index for KPI queries
CREATE INDEX IF NOT EXISTS idx_dispatches_on_time_flag ON public.dispatches (on_time_flag) WHERE on_time_flag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_dispatch_date ON public.dispatches (dispatch_date) WHERE dispatch_date IS NOT NULL;