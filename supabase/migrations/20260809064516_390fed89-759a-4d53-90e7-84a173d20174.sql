DROP POLICY IF EXISTS "exlib_anon_all" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can upload exercise library" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can update exercise library" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can delete exercise library" ON storage.objects;

DROP POLICY IF EXISTS "Public read exercise library" ON storage.objects;
CREATE POLICY "Public read exercise library"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'exercise-library');