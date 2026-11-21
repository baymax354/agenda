CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'em_andamento', 'concluido', 'cancelado');

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.claim_business_owner()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login primeiro'; END IF;
  PERFORM pg_advisory_xact_lock(4242);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'O painel da empresa já tem um administrador';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_business_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_business_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

-- Business settings (single row)
CREATE TABLE public.business_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'AgendaMais - Vila Madalena',
  address text NOT NULL DEFAULT 'Rua Harmonia, 123 - São Paulo, SP',
  city text NOT NULL DEFAULT 'São Paulo - SP',
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00',
  slot_minutes int NOT NULL DEFAULT 60 CHECK (slot_minutes IN (15, 20, 30, 45, 60)),
  closed_weekdays int[] NOT NULL DEFAULT '{0}',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  CHECK (close_time > open_time)
);
GRANT SELECT ON public.business_settings TO anon, authenticated;
GRANT UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.business_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.business_settings (id) VALUES (1);

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('Cabelo', 'Barba', 'Unhas', 'Estética')),
  duration_min int NOT NULL CHECK (duration_min BETWEEN 10 AND 480),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active services" ON public.services FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update services" ON public.services FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete services" ON public.services FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Professionals
CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  rating numeric(2,1) NOT NULL DEFAULT 5.0 CHECK (rating BETWEEN 0 AND 5),
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professionals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active professionals" ON public.professionals FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert professionals" ON public.professionals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update professionals" ON public.professionals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete professionals" ON public.professionals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Customer profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data->>'full_name', ''), 120),
    left(coalesce(NEW.raw_user_meta_data->>'phone', ''), 30),
    coalesce(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL DEFAULT '',
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_positive_duration CHECK (ends_at > starts_at),
  CONSTRAINT appointment_no_overlap EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('agendado', 'em_andamento'))
);
CREATE INDEX appointments_starts_at_idx ON public.appointments (starts_at);
CREATE INDEX appointments_customer_idx ON public.appointments (customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own, admins read all" ON public.appointments FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Time off / blocked periods
CREATE TABLE public.time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_off TO authenticated;
GRANT ALL ON public.time_off TO service_role;
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage time off" ON public.time_off FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Busy periods for a professional (no personal data)
CREATE OR REPLACE FUNCTION public.get_busy_slots(_professional_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.starts_at, a.ends_at FROM public.appointments a
   WHERE a.professional_id = _professional_id
     AND a.status IN ('agendado', 'em_andamento')
     AND a.starts_at < _to AND a.ends_at > _from
  UNION ALL
  SELECT t.starts_at, t.ends_at FROM public.time_off t
   WHERE (t.professional_id IS NULL OR t.professional_id = _professional_id)
     AND t.starts_at < _to AND t.ends_at > _from
$$;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid, timestamptz, timestamptz) TO anon, authenticated;

-- Customer booking
CREATE OR REPLACE FUNCTION public.create_booking(_service_id uuid, _professional_id uuid, _starts_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.services;
  p public.professionals;
  cfg public.business_settings;
  prof public.profiles;
  local_start timestamp;
  local_end timestamp;
  ends timestamptz;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para agendar'; END IF;
  SELECT * INTO s FROM public.services WHERE id = _service_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Serviço indisponível'; END IF;
  SELECT * INTO p FROM public.professionals WHERE id = _professional_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profissional indisponível'; END IF;
  SELECT * INTO cfg FROM public.business_settings WHERE id = 1;
  SELECT * INTO prof FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR length(trim(prof.full_name)) = 0 THEN RAISE EXCEPTION 'Complete seu nome no perfil antes de agendar'; END IF;

  IF _starts_at <= now() THEN RAISE EXCEPTION 'Escolha um horário futuro'; END IF;
  ends := _starts_at + make_interval(mins => s.duration_min);
  local_start := _starts_at AT TIME ZONE cfg.timezone;
  local_end := ends AT TIME ZONE cfg.timezone;

  IF extract(dow FROM local_start)::int = ANY (cfg.closed_weekdays) THEN RAISE EXCEPTION 'Estamos fechados neste dia'; END IF;
  IF local_start::time < cfg.open_time OR local_end::date <> local_start::date OR local_end::time > cfg.close_time THEN
    RAISE EXCEPTION 'Horário fora do funcionamento';
  END IF;
  IF (extract(epoch FROM (local_start::time - cfg.open_time)) / 60)::int % cfg.slot_minutes <> 0 OR extract(second FROM local_start) <> 0 THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;
  IF EXISTS (SELECT 1 FROM public.time_off t WHERE (t.professional_id IS NULL OR t.professional_id = _professional_id)
             AND t.starts_at < ends AND t.ends_at > _starts_at) THEN
    RAISE EXCEPTION 'Horário indisponível';
  END IF;

  BEGIN
    INSERT INTO public.appointments (customer_id, client_name, client_phone, service_id, professional_id, starts_at, ends_at, price)
    VALUES (auth.uid(), prof.full_name, prof.phone, s.id, p.id, _starts_at, ends, s.price)
    RETURNING id INTO new_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Horário indisponível';
  END;
  RETURN new_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_booking(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_my_booking(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.appointments SET status = 'cancelado'
   WHERE id = _id AND customer_id = auth.uid() AND status = 'agendado' AND starts_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Não foi possível cancelar este agendamento'; END IF;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.cancel_my_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_booking(uuid) TO authenticated;

-- Seed services
INSERT INTO public.services (name, description, category, duration_min, price, image_url, sort_order) VALUES
 ('Corte + escova', 'Corte moderno com finalização', 'Cabelo', 60, 80.00, '/__l5e/assets-v1/fc5cf5c9-08d2-4384-ab45-e645e98474a5/service_corte_escova.webp', 1),
 ('Barba completa', 'Barba, acabamento e hidratação', 'Barba', 40, 60.00, '/__l5e/assets-v1/7724b6a4-5b28-4e25-aa4f-dd048d7232cc/service_barba.webp', 2),
 ('Manicure em gel', 'Unhas impecáveis e com mais durabilidade', 'Unhas', 90, 75.00, '/__l5e/assets-v1/015ff845-91a0-47a4-adc1-8982ff4ce834/service_manicure.webp', 3),
 ('Hidratação capilar', 'Tratamento profundo para fios saudáveis', 'Cabelo', 60, 90.00, '/__l5e/assets-v1/509f0640-1a96-4199-97bd-a2fdbf40611d/service_hidratacao.webp', 4),
 ('Corte masculino', 'Corte na tesoura ou máquina com degradê', 'Barba', 30, 45.00, '/__l5e/assets-v1/a4659e25-fd64-4110-8429-449a840f5b9c/service_corte_masculino.webp', 5),
 ('Limpeza de pele', 'Limpeza profunda e hidratação facial', 'Estética', 60, 120.00, '/__l5e/assets-v1/2e3f3642-0584-41a1-9151-fafdab9e4acb/service_limpeza_pele.webp', 6);

-- Seed professionals
INSERT INTO public.professionals (name, role, rating, photo_url) VALUES
 ('Ana Silva', 'Cabeleireira', 4.9, '/__l5e/assets-v1/7c12006f-6e90-4a7c-9345-1627af97dd02/ana_silva.webp'),
 ('Carlos Lima', 'Barbeiro', 4.8, '/__l5e/assets-v1/ca492b75-8a48-48cb-b51b-b9647220c55a/carlos_lima.webp'),
 ('Juliana Costa', 'Manicure', 4.9, '/__l5e/assets-v1/1e2f0791-e3ba-4e18-bd35-f84bacfc5cba/juliana_costa.webp'),
 ('Rafael Souza', 'Barbeiro', 4.7, '/__l5e/assets-v1/94d56e58-21f2-4b4f-9bc2-63ec3b608f0d/rafael_souza.webp');

-- Seed appointments: today
WITH base AS (SELECT date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AS d),
rows(h, client, phone, svc, pro, st) AS (VALUES
  (9,  'Maria Souza',    '(11) 98811-2034', 'Corte + escova',     'Ana Silva',     'concluido'),
  (10, 'Pedro Almeida',  '(11) 97722-4410', 'Barba completa',     'Carlos Lima',   'em_andamento'),
  (11, 'Juliana Rocha',  '(11) 99634-1187', 'Manicure em gel',    'Juliana Costa', 'agendado'),
  (14, 'Lucas Martins',  '(11) 98450-7721', 'Corte masculino',    'Rafael Souza',  'agendado'),
  (15, 'Beatriz Lima',   '(11) 99120-5568', 'Hidratação capilar', 'Ana Silva',     'agendado'),
  (16, 'Bruno Carvalho', '(11) 97301-8842', 'Barba completa',     'Carlos Lima',   'agendado')
)
INSERT INTO public.appointments (client_name, client_phone, service_id, professional_id, starts_at, ends_at, status, price)
SELECT r.client, r.phone, s.id, p.id,
  (base.d + make_interval(hours => r.h)) AT TIME ZONE 'America/Sao_Paulo',
  (base.d + make_interval(hours => r.h, mins => s.duration_min)) AT TIME ZONE 'America/Sao_Paulo',
  r.st::public.appointment_status, s.price
FROM rows r CROSS JOIN base
JOIN public.services s ON s.name = r.svc
JOIN public.professionals p ON p.name = r.pro;

-- Seed appointments: past 6 days, completed
WITH base AS (SELECT date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AS d),
svc AS (SELECT name, row_number() OVER (ORDER BY sort_order) - 1 AS idx FROM public.services),
names(idx, client, phone) AS (VALUES
  (0, 'Camila Ferreira', '(11) 98123-4501'), (1, 'Rodrigo Nunes', '(11) 97211-3302'),
  (2, 'Fernanda Alves', '(11) 99456-2203'), (3, 'Gustavo Ribeiro', '(11) 98654-9904'),
  (4, 'Larissa Mendes', '(11) 97543-1105'), (5, 'Thiago Barros', '(11) 99876-5506'),
  (6, 'Patrícia Gomes', '(11) 98765-4307'), (7, 'Marcelo Dias', '(11) 97654-3208')
),
slots AS (
  SELECT dd, h, ((dd * 3 + h) % 6) AS si, ((dd * 5 + h) % 8) AS ni
  FROM generate_series(1, 6) dd, unnest(ARRAY[9, 11, 13, 15]) h
  WHERE (dd + h) % 5 <> 0
)
INSERT INTO public.appointments (client_name, client_phone, service_id, professional_id, starts_at, ends_at, status, price)
SELECT n.client, n.phone, s.id, p.id,
  (base.d - make_interval(days => sl.dd) + make_interval(hours => sl.h)) AT TIME ZONE 'America/Sao_Paulo',
  (base.d - make_interval(days => sl.dd) + make_interval(hours => sl.h, mins => s.duration_min)) AT TIME ZONE 'America/Sao_Paulo',
  'concluido', s.price
FROM slots sl CROSS JOIN base
JOIN svc ON svc.idx = sl.si
JOIN public.services s ON s.name = svc.name
JOIN names n ON n.idx = sl.ni
JOIN public.professionals p ON p.name = CASE s.category
  WHEN 'Cabelo' THEN 'Ana Silva'
  WHEN 'Unhas' THEN 'Juliana Costa'
  WHEN 'Estética' THEN 'Juliana Costa'
  ELSE CASE WHEN sl.dd % 2 = 0 THEN 'Carlos Lima' ELSE 'Rafael Souza' END
END;