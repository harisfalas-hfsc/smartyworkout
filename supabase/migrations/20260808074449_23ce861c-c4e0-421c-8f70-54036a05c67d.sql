CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
      OR EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND lower(email) IN ('harisfalas@gmail.com'))
$$;

REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Authenticated read exercise library"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-library');

CREATE POLICY "Admins upload exercise library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-library' AND public.is_app_admin(auth.uid()));

CREATE POLICY "Admins update exercise library"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-library' AND public.is_app_admin(auth.uid()));

CREATE POLICY "Admins delete exercise library"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-library' AND public.is_app_admin(auth.uid()));