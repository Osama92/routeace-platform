CREATE OR REPLACE FUNCTION public.validate_transporter_job_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_transporter_org UUID;
BEGIN
  SELECT organization_id INTO v_transporter_org
  FROM public.ld_transporters
  WHERE id = NEW.transporter_id;

  IF v_transporter_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION
      'Transporter job organization_id must match the transporter''s organization_id.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transporter_job_org ON public.ld_transporter_jobs;
CREATE TRIGGER trg_validate_transporter_job_org
  BEFORE INSERT ON public.ld_transporter_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_transporter_job_org();