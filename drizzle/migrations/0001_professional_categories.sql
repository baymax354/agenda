ALTER TABLE public.professionals ADD COLUMN categories text[] NOT NULL DEFAULT '{Cabelo,Barba,Unhas,Estética}';
UPDATE public.professionals SET categories = '{Cabelo,Estética}' WHERE name = 'Ana Silva';
UPDATE public.professionals SET categories = '{Barba}' WHERE name = 'Carlos Lima';
UPDATE public.professionals SET categories = '{Unhas,Estética}' WHERE name = 'Juliana Costa';
UPDATE public.professionals SET categories = '{Barba,Cabelo}' WHERE name = 'Rafael Souza';

CREATE OR REPLACE FUNCTION public.check_professional_category()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cat text; cats text[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.service_id = OLD.service_id AND NEW.professional_id = OLD.professional_id THEN
    RETURN NEW;
  END IF;
  SELECT category INTO cat FROM public.services WHERE id = NEW.service_id;
  SELECT categories INTO cats FROM public.professionals WHERE id = NEW.professional_id;
  IF NOT (cat = ANY (cats)) THEN
    RAISE EXCEPTION 'Este profissional não realiza este serviço';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER appointments_check_category BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_professional_category();