
-- ============================================
-- WAREHOUSE MANAGEMENT SYSTEM (WMS) SCHEMA
-- ============================================

-- 1. Warehouses
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  location TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  capacity_sqm NUMERIC,
  manager_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Warehouse Zones (receiving, storage, staging, dispatch)
CREATE TABLE public.warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'storage',
  temperature_controlled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Warehouse Bins (rack/shelf/bin locations)
CREATE TABLE public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.warehouse_zones(id) ON DELETE CASCADE NOT NULL,
  bin_code TEXT NOT NULL,
  rack TEXT,
  shelf TEXT,
  position TEXT,
  max_capacity_units INTEGER,
  is_occupied BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, bin_code)
);

-- 4. Warehouse Inventory (stock by bin location)
CREATE TABLE public.warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  bin_id UUID REFERENCES public.warehouse_bins(id),
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  batch_number TEXT,
  expiry_date DATE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  unit_of_measure TEXT DEFAULT 'units',
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Picklists
CREATE TABLE public.picklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  picklist_number TEXT NOT NULL,
  order_reference TEXT,
  outlet_name TEXT,
  pick_type TEXT NOT NULL DEFAULT 'single',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_picker_id UUID,
  created_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Picklist Items
CREATE TABLE public.picklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picklist_id UUID REFERENCES public.picklists(id) ON DELETE CASCADE NOT NULL,
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  bin_code TEXT,
  quantity_requested INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  picked_at TIMESTAMPTZ,
  picked_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Cycle Counts
CREATE TABLE public.cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count_type TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'in_progress',
  initiated_by UUID,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Cycle Count Items
CREATE TABLE public.cycle_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID REFERENCES public.cycle_counts(id) ON DELETE CASCADE NOT NULL,
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  bin_code TEXT,
  system_quantity INTEGER NOT NULL DEFAULT 0,
  counted_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) STORED,
  counted_by UUID,
  counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Inventory Reconciliations (auto end-of-day)
CREATE TABLE public.inventory_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_skus_checked INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  shortages INTEGER DEFAULT 0,
  overages INTEGER DEFAULT 0,
  misplaced INTEGER DEFAULT 0,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Reconciliation Items (detail)
CREATE TABLE public.reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES public.inventory_reconciliations(id) ON DELETE CASCADE NOT NULL,
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  system_qty INTEGER NOT NULL DEFAULT 0,
  physical_qty INTEGER NOT NULL DEFAULT 0,
  dispatched_qty INTEGER NOT NULL DEFAULT 0,
  returned_qty INTEGER NOT NULL DEFAULT 0,
  variance INTEGER GENERATED ALWAYS AS (physical_qty + dispatched_qty - returned_qty - system_qty) STORED,
  variance_type TEXT,
  investigation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Warehouse Returns
CREATE TABLE public.warehouse_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  return_number TEXT NOT NULL,
  return_category TEXT NOT NULL DEFAULT 'damaged',
  source_type TEXT DEFAULT 'field',
  outlet_name TEXT,
  requested_by UUID,
  approved_by UUID,
  inspected_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  classification TEXT,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Return Items
CREATE TABLE public.warehouse_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.warehouse_returns(id) ON DELETE CASCADE NOT NULL,
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'damaged',
  disposition TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read, role-gated writes via app logic
CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage warehouses" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view zones" ON public.warehouse_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage zones" ON public.warehouse_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view bins" ON public.warehouse_bins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bins" ON public.warehouse_bins FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view inventory" ON public.warehouse_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory" ON public.warehouse_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view picklists" ON public.picklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage picklists" ON public.picklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view picklist items" ON public.picklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage picklist items" ON public.picklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view cycle counts" ON public.cycle_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage cycle counts" ON public.cycle_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view cycle count items" ON public.cycle_count_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage cycle count items" ON public.cycle_count_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view reconciliations" ON public.inventory_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage reconciliations" ON public.inventory_reconciliations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view reconciliation items" ON public.reconciliation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage reconciliation items" ON public.reconciliation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view returns" ON public.warehouse_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage returns" ON public.warehouse_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view return items" ON public.warehouse_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage return items" ON public.warehouse_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_warehouse_inventory_warehouse ON public.warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inventory_sku ON public.warehouse_inventory(sku_code);
CREATE INDEX idx_picklists_warehouse ON public.picklists(warehouse_id);
CREATE INDEX idx_picklists_status ON public.picklists(status);
CREATE INDEX idx_cycle_counts_warehouse ON public.cycle_counts(warehouse_id);
CREATE INDEX idx_cycle_counts_date ON public.cycle_counts(count_date);
CREATE INDEX idx_reconciliations_warehouse ON public.inventory_reconciliations(warehouse_id);
CREATE INDEX idx_warehouse_returns_warehouse ON public.warehouse_returns(warehouse_id);
CREATE INDEX idx_warehouse_returns_status ON public.warehouse_returns(status);
