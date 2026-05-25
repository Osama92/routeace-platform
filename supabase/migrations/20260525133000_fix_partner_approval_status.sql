-- Fix: auto_create_partner_on_transporter_approval inserts approval_status='approved'
-- but partners_approval_status_check only allows: pending_coo, pending_sa, active, rejected.
-- Change the insert value from 'approved' to 'active'.

CREATE OR REPLACE FUNCTION public.auto_create_partner_on_transporter_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  IF NEW.onboarding_status = 'approved'
     AND (OLD.onboarding_status IS DISTINCT FROM 'approved')
     AND NEW.partner_id IS NULL THEN

    INSERT INTO public.partners (
      organization_id, partner_type, company_name,
      contact_name, contact_email, contact_phone,
      cac_number, notes, approval_status,
      approved_by, approved_at, created_by, is_verified
    ) VALUES (
      NEW.organization_id, 'vendor', NEW.company_name,
      COALESCE(NEW.contact_name, NEW.company_name),
      COALESCE(NEW.email, NEW.contact_email, NEW.company_name || '@noemail.local'),
      COALESCE(NEW.phone, '0000000000'),
      NEW.cac_number, NEW.notes, 'active',
      NEW.approved_by, COALESCE(NEW.approved_at, now()),
      NEW.added_by, true
    )
    RETURNING id INTO v_partner_id;

    NEW.partner_id := v_partner_id;
  END IF;
  RETURN NEW;
END;
$$;
