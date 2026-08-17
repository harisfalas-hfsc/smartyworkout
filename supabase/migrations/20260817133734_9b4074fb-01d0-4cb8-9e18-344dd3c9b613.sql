INSERT INTO public.app_settings (key, value)
VALUES ('free_access_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

GRANT SELECT ON public.app_settings TO anon, authenticated;

CREATE POLICY "Public can read free access mode"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key = 'free_access_mode');

CREATE POLICY "Admins insert settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));