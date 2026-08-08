
DROP POLICY IF EXISTS "exlib_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "exlib_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "exlib_delete_auth" ON storage.objects;
DROP POLICY IF EXISTS "exlib_read_auth" ON storage.objects;
DROP POLICY IF EXISTS "exlib_anon_all" ON storage.objects;

CREATE POLICY "exlib_anon_all" ON storage.objects
FOR ALL
TO anon, authenticated
USING (bucket_id = 'exercise-library')
WITH CHECK (bucket_id = 'exercise-library');
