-- Update vehicles truck_type constraint to include all capacities
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_truck_type_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_truck_type_check 
  CHECK (truck_type IN ('3T', '5T', '10T', '15T', '20T', '30T', '45T', '60T'));

-- Add additional vehicle tracking columns
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'vendor', 'leased'));

-- Create vehicle repair history table
CREATE TABLE IF NOT EXISTS public.vehicle_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  repair_date DATE NOT NULL DEFAULT CURRENT_DATE,
  repair_type TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(12, 2) DEFAULT 0,
  mileage_at_repair INTEGER,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS on vehicle_repairs
ALTER TABLE public.vehicle_repairs ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_repairs
CREATE POLICY "Admin and operations can manage vehicle repairs"
ON public.vehicle_repairs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operations')
  )
);

-- Add approval columns to dispatches
ALTER TABLE public.dispatches
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS submitted_by UUID;

-- Add approval columns to expenses
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS submitted_by UUID;

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_dispatches_approval_status ON public.dispatches(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON public.expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_repairs_vehicle_id ON public.vehicle_repairs(vehicle_id);