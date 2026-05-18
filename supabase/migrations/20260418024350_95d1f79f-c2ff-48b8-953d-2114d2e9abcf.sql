
-- ============================================================
-- CRITICAL FIX 1: fraud_detection_events
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view fraud events" ON public.fraud_detection_events;
DROP POLICY IF EXISTS "Public read fraud events" ON public.fraud_detection_events;
DROP POLICY IF EXISTS "Anyone can read fraud events" ON public.fraud_detection_events;
CREATE POLICY "Finance and admin can view fraud events"
  ON public.fraud_detection_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- ============================================================
-- CRITICAL FIX 2: driver_insurance_profiles
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view insurance profiles" ON public.driver_insurance_profiles;
DROP POLICY IF EXISTS "Public read insurance profiles" ON public.driver_insurance_profiles;
DROP POLICY IF EXISTS "Anyone can read insurance" ON public.driver_insurance_profiles;
CREATE POLICY "Restricted insurance profile access"
  ON public.driver_insurance_profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'ops_manager') OR
    public.has_role(auth.uid(), 'finance_manager')
  );

-- ============================================================
-- CRITICAL FIX 3: autonomous_decisions — remove conflicting open policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read decisions" ON public.autonomous_decisions;
DROP POLICY IF EXISTS "Anyone can read decisions" ON public.autonomous_decisions;
DROP POLICY IF EXISTS "Public read autonomous_decisions" ON public.autonomous_decisions;

-- ============================================================
-- FINANCE TABLES — restrict to finance roles
-- ============================================================
DO $$
DECLARE
  t TEXT;
  finance_tables TEXT[] := ARRAY[
    'bills','cashflow_forecasts','vat_transactions','tax_filing_reports',
    'treasury_risk_logs','pan_african_settlement_ledger','deferred_revenue_ledger',
    'intercompany_transactions','trade_history_ledger','revenue_loss_events',
    'revenue_loss_analysis','ar_payments'
  ];
BEGIN
  FOREACH t IN ARRAY finance_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %I" ON public.%I', t, t);
      EXECUTE format($q$
        CREATE POLICY "Finance roles can view %I"
          ON public.%I FOR SELECT
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'org_admin') OR
            public.has_role(auth.uid(), 'finance_manager')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

-- ============================================================
-- OPERATIONAL/TELEMETRY TABLES — restrict to ops roles
-- ============================================================
DO $$
DECLARE
  t TEXT;
  ops_tables TEXT[] := ARRAY[
    'vehicle_sensor_readings','driver_behavior_events','fuel_variance_reports',
    'fuel_risk_scores','fleet_maintenance_orders','fleet_kpi_snapshots',
    'auto_dispatch_decisions','accident_risk_scores','vehicle_maintenance_records',
    'vehicle_mileage_tracking','vehicle_documents','driver_documents'
  ];
BEGIN
  FOREACH t IN ARRAY ops_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %I" ON public.%I', t, t);
      EXECUTE format($q$
        CREATE POLICY "Ops roles can view %I"
          ON public.%I FOR SELECT
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'org_admin') OR
            public.has_role(auth.uid(), 'ops_manager')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

-- ============================================================
-- WRITE GUARDS — blocked_orders, ops_sops, route_risk_register
-- ============================================================
DO $$
DECLARE
  t TEXT;
  guarded_tables TEXT[] := ARRAY['blocked_orders','ops_sops','route_risk_register'];
BEGIN
  FOREACH t IN ARRAY guarded_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %I" ON public.%I', t, t);
      EXECUTE format($q$
        CREATE POLICY "Ops/admin can insert %I"
          ON public.%I FOR INSERT
          WITH CHECK (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'ops_manager')
          )
      $q$, t, t);
      EXECUTE format($q$
        CREATE POLICY "Ops/admin can update %I"
          ON public.%I FOR UPDATE
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin') OR
            public.has_role(auth.uid(), 'ops_manager')
          )
      $q$, t, t);
      EXECUTE format($q$
        CREATE POLICY "Admin can delete %I"
          ON public.%I FOR DELETE
          USING (
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'super_admin')
          )
      $q$, t, t);
    END IF;
  END LOOP;
END$$;

-- ============================================================
-- STORAGE: expense-receipts — owner + finance/admin only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read expense receipts" ON storage.objects;

CREATE POLICY "Owner or finance can read expense receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'finance_manager')
    )
  );

CREATE POLICY "Users can upload own expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own expense receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-receipts' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ============================================================
-- STORAGE: vehicle-pictures — read public, write ops/admin only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload vehicle pictures" ON storage.objects;

CREATE POLICY "Ops/admin can upload vehicle pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicle-pictures' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'org_admin') OR
      public.has_role(auth.uid(), 'ops_manager')
    )
  );

CREATE POLICY "Ops/admin can update vehicle pictures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vehicle-pictures' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'org_admin') OR
      public.has_role(auth.uid(), 'ops_manager')
    )
  );

CREATE POLICY "Admin can delete vehicle pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vehicle-pictures' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'org_admin')
    )
  );

-- ============================================================
-- STORAGE: profile-pictures — owner-scoped writes
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload profile pictures" ON storage.objects;

CREATE POLICY "Users can upload own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ============================================================
-- STORAGE: company-assets — admin write only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

CREATE POLICY "Admin can upload company assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-assets' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'org_admin')
    )
  );

CREATE POLICY "Admin can update company assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-assets' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'org_admin')
    )
  );

CREATE POLICY "Admin can delete company assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-assets' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ============================================================
-- REALTIME: scope channel subscriptions to authorized roles
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe" ON realtime.messages;
DROP POLICY IF EXISTS "Anyone can listen" ON realtime.messages;

CREATE POLICY "Authenticated subscribers must have role"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid())
  );

-- ============================================================
-- DOCUMENT plaintext-credential warning (informational)
-- ============================================================
COMMENT ON COLUMN public.integrations.api_key IS
  'SECURITY: stored plaintext. Migrate to pgcrypto or Vault. Restricted to super_admin via RLS.';
COMMENT ON COLUMN public.integrations.api_secret IS
  'SECURITY: stored plaintext. Migrate to pgcrypto or Vault. Restricted to super_admin via RLS.';
