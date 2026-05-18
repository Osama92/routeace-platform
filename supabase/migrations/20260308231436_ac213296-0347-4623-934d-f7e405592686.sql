
-- FIX 1: Remove overly permissive SELECT policies that override role-restricted ones
DROP POLICY IF EXISTS "Authenticated users can view ledger" ON public.accounting_ledger;
DROP POLICY IF EXISTS "Authenticated users can view AP" ON public.accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can view AR" ON public.accounts_receivable;
DROP POLICY IF EXISTS "Authenticated users can read risk scores" ON public.approval_risk_scores;
DROP POLICY IF EXISTS "Authenticated users can read fraud flags" ON public.fraud_flags;
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

-- Add AR role-restricted policy (was missing)
CREATE POLICY "Role-restricted view accounts receivable" ON public.accounts_receivable
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'finance_manager') OR
  public.has_role(auth.uid(), 'org_admin')
);

-- FIX 2: Trigger to protect profile sensitive fields from self-approval
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    NEW.approved_at := OLD.approved_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- FIX 3: Security definer function for profile approval (used by signup flows)
CREATE OR REPLACE FUNCTION public.approve_user_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First super_admin setup (no super_admin exists yet)
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'super_admin') THEN
    UPDATE profiles SET approval_status = 'approved', is_active = true, approved_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  -- Caller is admin or super_admin
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    UPDATE profiles SET approval_status = 'approved', is_active = true, approved_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  -- User was invited via organization invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations oi
    JOIN profiles p ON p.email = oi.email
    WHERE p.user_id = p_user_id AND oi.accepted_at IS NOT NULL
  ) THEN
    UPDATE profiles SET approval_status = 'approved', is_active = true, approved_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  -- User just created their own super_admin role (CreateCompany flow)
  IF auth.uid() = p_user_id AND public.has_role(p_user_id, 'super_admin') THEN
    UPDATE profiles SET approval_status = 'approved', is_active = true, approved_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
