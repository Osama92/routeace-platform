-- Add tax deductibles columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS nhf_contribution NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_contribution NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pension_contribution NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS life_insurance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_rent_relief NUMERIC(12,2) DEFAULT 0;

-- Add Remita tracking to driver_salaries for tax filing integration
ALTER TABLE public.driver_salaries
ADD COLUMN IF NOT EXISTS remita_rrr TEXT,
ADD COLUMN IF NOT EXISTS remita_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS firs_submission_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMPTZ;