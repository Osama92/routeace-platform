-- Fix RLS policies for invoices and expenses to allow finance_manager, org_admin, super_admin
-- Also ensures organization_id isolation is enforced on SELECT

-- ============================================================
-- INVOICES TABLE
-- ============================================================

-- Drop and recreate INSERT policy to include all appropriate roles
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Finance managers can insert invoices" ON invoices;

CREATE POLICY "Org members can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager', 'operations', 'dispatcher'
      )
    )
  );

-- Ensure SELECT policy filters by organization_id
DROP POLICY IF EXISTS "Users can view their org invoices" ON invoices;
DROP POLICY IF EXISTS "Org members can view invoices" ON invoices;

CREATE POLICY "Org members can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Org members can update invoices" ON invoices;

CREATE POLICY "Org members can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager', 'operations'
      )
    )
  );

-- DELETE policy — admin/super_admin only
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Org admins can delete invoices" ON invoices;

CREATE POLICY "Org admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ============================================================
-- EXPENSES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Finance managers can insert expenses" ON expenses;

CREATE POLICY "Org members can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      created_by = auth.uid()
      OR organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
      )
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager', 'operations', 'dispatcher'
      )
    )
  );

-- SELECT policy — org isolation
DROP POLICY IF EXISTS "Users can view their org expenses" ON expenses;
DROP POLICY IF EXISTS "Org members can view expenses" ON expenses;

CREATE POLICY "Org members can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Org members can update expenses" ON expenses;

CREATE POLICY "Org members can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager'
      )
    )
  );

-- DELETE policy
DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;
DROP POLICY IF EXISTS "Org admins can delete expenses" ON expenses;

CREATE POLICY "Org admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ============================================================
-- PARTNERS TABLE (vendors/customers) — allow org_admin to create
-- ============================================================

DROP POLICY IF EXISTS "Org members can insert partners" ON partners;
DROP POLICY IF EXISTS "Users can insert partners" ON partners;

CREATE POLICY "Org members can insert partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager', 'operations'
      )
    )
  );

DROP POLICY IF EXISTS "Org members can view partners" ON partners;
DROP POLICY IF EXISTS "Users can view partners" ON partners;

CREATE POLICY "Org members can view partners"
  ON partners FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "Org members can update partners" ON partners;
DROP POLICY IF EXISTS "Users can update partners" ON partners;

CREATE POLICY "Org members can update partners"
  ON partners FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'finance_manager', 'operations'
      )
    )
  );

DROP POLICY IF EXISTS "Org admins can delete partners" ON partners;

CREATE POLICY "Org admins can delete partners"
  ON partners FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );
