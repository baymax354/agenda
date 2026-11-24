DROP POLICY IF EXISTS "Anyone reads settings" ON public.business_settings;
CREATE POLICY "Anyone reads the published unit settings" ON public.business_settings
  FOR SELECT TO anon, authenticated
  USING (id = 1);