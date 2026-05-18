
-- Event Bus: Core event streaming table
CREATE TABLE public.platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_os TEXT NOT NULL CHECK (source_os IN ('logistics', 'industry', 'portodash', 'platform')),
  target_os TEXT NOT NULL CHECK (target_os IN ('logistics', 'industry', 'portodash', 'platform', 'all')),
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  visible_fields TEXT[] DEFAULT '{}',
  restricted_fields TEXT[] DEFAULT '{}',
  event_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Event subscriptions: which OS listens to what
CREATE TABLE public.event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_os TEXT NOT NULL CHECK (subscriber_os IN ('logistics', 'industry', 'portodash', 'platform')),
  event_type TEXT NOT NULL,
  filter_conditions JSONB DEFAULT '{}',
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscriber_os, event_type)
);

-- API Contracts Registry
CREATE TABLE public.api_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_name TEXT NOT NULL,
  source_os TEXT NOT NULL,
  target_os TEXT NOT NULL,
  api_version TEXT NOT NULL DEFAULT 'v1',
  endpoint_path TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  request_schema JSONB NOT NULL DEFAULT '{}',
  response_schema JSONB NOT NULL DEFAULT '{}',
  allowed_fields TEXT[] DEFAULT '{}',
  restricted_fields TEXT[] DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event processing log for audit
CREATE TABLE public.event_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.platform_events(id) ON DELETE CASCADE,
  processor_os TEXT NOT NULL,
  action_taken TEXT,
  result_status TEXT CHECK (result_status IN ('success', 'failure', 'skipped')),
  processing_time_ms INTEGER,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_platform_events_type ON public.platform_events(event_type);
CREATE INDEX idx_platform_events_source ON public.platform_events(source_os);
CREATE INDEX idx_platform_events_target ON public.platform_events(target_os);
CREATE INDEX idx_platform_events_status ON public.platform_events(status);
CREATE INDEX idx_platform_events_tenant ON public.platform_events(tenant_id);
CREATE INDEX idx_platform_events_created ON public.platform_events(created_at DESC);
CREATE INDEX idx_event_processing_log_event ON public.event_processing_log(event_id);

-- Enable RLS
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_processing_log ENABLE ROW LEVEL SECURITY;

-- RLS: platform_events - admins and super_admins can read all
CREATE POLICY "Admins can view all events" ON public.platform_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert events" ON public.platform_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS: event_subscriptions - admin only
CREATE POLICY "Admins manage subscriptions" ON public.event_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- RLS: api_contracts - admin read
CREATE POLICY "Admins view contracts" ON public.api_contracts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins manage contracts" ON public.api_contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS: processing log
CREATE POLICY "Admins view processing logs" ON public.event_processing_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert processing logs" ON public.event_processing_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_events;

-- Seed default event subscriptions
INSERT INTO public.event_subscriptions (subscriber_os, event_type) VALUES
  ('logistics', 'order.created'),
  ('logistics', 'order.assigned'),
  ('logistics', 'shipment.created'),
  ('industry', 'dispatch.started'),
  ('industry', 'delivery.completed'),
  ('platform', 'invoice.generated'),
  ('platform', 'payment.completed');

-- Seed API contracts
INSERT INTO public.api_contracts (contract_name, source_os, target_os, endpoint_path, method, allowed_fields, restricted_fields) VALUES
  ('Create Logistics Job', 'industry', 'logistics', '/logistics/jobs', 'POST', 
   ARRAY['delivery_location', 'delivery_size', 'load_type', 'pickup_location'], 
   ARRAY['customer_name', 'order_value', 'deal_stage', 'sales_rep']),
  ('Get Delivery Status', 'industry', 'logistics', '/logistics/deliveries/{id}/status', 'GET',
   ARRAY['status', 'eta', 'current_location'],
   ARRAY['driver_name', 'driver_phone', 'vehicle_details', 'internal_cost']),
  ('Create Export Shipment', 'portodash', 'logistics', '/logistics/shipments', 'POST',
   ARRAY['origin', 'destination', 'cargo_type', 'weight'],
   ARRAY['buyer_name', 'export_value', 'compliance_details']),
  ('Order Status Update', 'logistics', 'industry', '/industry/orders/{id}/status', 'PUT',
   ARRAY['status', 'delivered_at', 'proof_of_delivery_url'],
   ARRAY['cost', 'driver_id', 'route_details']);
