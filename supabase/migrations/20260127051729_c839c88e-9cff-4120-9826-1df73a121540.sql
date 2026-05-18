-- Create company_settings table for invoice branding, payslips, and company profile
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'My Company',
  tagline TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  signature_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify company settings
CREATE POLICY "Admins can view company settings" 
ON public.company_settings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can update company settings" 
ON public.company_settings 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id IN (
      SELECT user_roles.user_id FROM public.user_roles 
      WHERE user_roles.role = 'admin'
    )
  )
);

CREATE POLICY "Admins can insert company settings" 
ON public.company_settings 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id IN (
      SELECT user_roles.user_id FROM public.user_roles 
      WHERE user_roles.role = 'admin'
    )
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row (will be updated by admin)
INSERT INTO public.company_settings (company_name, tagline, email) 
VALUES ('My Company', 'Professional Services', 'info@mycompany.com');