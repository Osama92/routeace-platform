-- Create staff table for owned and outsourced employees
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'owned' CHECK (employment_type IN ('owned', 'outsourced')),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  hire_date DATE,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'bi_monthly', 'hourly')),
  base_salary NUMERIC(15,2) DEFAULT 0,
  -- Tax deductibles
  nhf_contribution NUMERIC(12,2) DEFAULT 0,
  nhis_contribution NUMERIC(12,2) DEFAULT 0,
  pension_contribution NUMERIC(12,2) DEFAULT 0,
  life_insurance NUMERIC(12,2) DEFAULT 0,
  annual_rent_relief NUMERIC(12,2) DEFAULT 0,
  tax_id TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Staff salary records for payroll history
CREATE TABLE public.staff_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  salary_type TEXT NOT NULL,
  gross_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_income NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  notes TEXT,
  remita_rrr TEXT,
  remita_status TEXT DEFAULT 'pending',
  firs_submission_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Add remita columns to driver_salaries if not exist
ALTER TABLE public.driver_salaries 
ADD COLUMN IF NOT EXISTS remita_rrr TEXT,
ADD COLUMN IF NOT EXISTS remita_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS firs_submission_date TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

-- Policies for staff table
CREATE POLICY "Users with roles can view staff" ON public.staff
  FOR SELECT USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and ops can insert staff" ON public.staff
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Admins and ops can update staff" ON public.staff
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Admins can delete staff" ON public.staff
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policies for staff_salaries table
CREATE POLICY "Users with roles can view staff salaries" ON public.staff_salaries
  FOR SELECT USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and ops can insert staff salaries" ON public.staff_salaries
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Admins and ops can update staff salaries" ON public.staff_salaries
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Reset corrupted driver salary data
UPDATE public.drivers 
SET base_salary = 0 
WHERE base_salary > 100000000;