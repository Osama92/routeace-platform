
-- Fix function search_path mutable warnings
CREATE OR REPLACE FUNCTION public.generate_ticket_ref()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'TKT-' || LPAD(nextval('support_ticket_ref_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Seed global tax rules (no JSON escaping needed with $$ syntax)
INSERT INTO public.global_tax_rules (country_code, tax_type, tax_name, rate, rules_json) VALUES
  ('NG','cit','Nigerian CIT',30,'{"small_business_rate":20,"minimum_tax":0.5,"allowances":["capital_allowances","pension","nhf"]}'),
  ('NG','vat','Nigerian VAT',7.5,'{}'),
  ('NG','withholding','Nigerian WHT',10,'{}'),
  ('NG','payroll','Nigerian PAYE',0,'{"bands":[{"limit":300000,"rate":7},{"limit":300000,"rate":11},{"limit":500000,"rate":15},{"limit":500000,"rate":19},{"limit":1600000,"rate":21},{"limit":null,"rate":24}]}'),
  ('GB','cit','UK Corporation Tax',25,'{"small_profit_rate":19,"small_profit_limit":50000}'),
  ('GB','vat','UK VAT',20,'{}'),
  ('GB','withholding','UK WHT',20,'{}'),
  ('US','cit','US Federal Corporate Tax',21,'{"state_avg":5}'),
  ('US','vat','US Sales Tax (avg)',8.5,'{}'),
  ('AE','cit','UAE Corporate Tax',9,'{"free_zone_exempt":true,"threshold":375000}'),
  ('AE','vat','UAE VAT',5,'{}'),
  ('CA','cit','Canada Federal CIT',15,'{"small_business_rate":9,"small_business_limit":500000}'),
  ('CA','vat','Canada GST',5,'{}'),
  ('ZA','cit','South Africa CIT',27,'{}'),
  ('ZA','vat','South Africa VAT',15,'{}'),
  ('KE','cit','Kenya CIT',30,'{}'),
  ('KE','vat','Kenya VAT',16,'{}'),
  ('GH','cit','Ghana CIT',25,'{}'),
  ('GH','vat','Ghana VAT',15,'{}'),
  ('IN','cit','India Corporate Tax',22,'{"surcharge":10}'),
  ('IN','gst','India GST',18,'{}'),
  ('SG','cit','Singapore CIT',17,'{"startup_exemption":true}'),
  ('SG','gst','Singapore GST',9,'{}'),
  ('AU','cit','Australia CIT',30,'{"small_business_rate":25}'),
  ('AU','gst','Australia GST',10,'{}'),
  ('DE','cit','Germany Corporate Tax',15,'{"solidarity_surcharge":5.5,"trade_tax_avg":14}'),
  ('DE','vat','Germany VAT',19,'{}'),
  ('FR','cit','France CIT',25,'{}'),
  ('FR','vat','France VAT',20,'{}')
ON CONFLICT DO NOTHING;
