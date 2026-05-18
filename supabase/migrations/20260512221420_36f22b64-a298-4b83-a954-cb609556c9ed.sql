
INSERT INTO public.kpi_role_assignments (role_tag, metric_key)
SELECT r, m FROM (VALUES ('super_admin'),('org_admin')) AS roles(r)
CROSS JOIN (VALUES
  ('ops_fleet_utilization'),
  ('ops_delivery_success_rate'),
  ('ops_sla_adherence'),
  ('fin_ar_collection_rate'),
  ('fin_outstanding_receivables'),
  ('fin_overdue_invoice_count'),
  ('support_resolution_rate')
) AS metrics(m)
ON CONFLICT DO NOTHING;
