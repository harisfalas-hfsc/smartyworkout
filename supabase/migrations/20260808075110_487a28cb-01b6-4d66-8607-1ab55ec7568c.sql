DROP POLICY IF EXISTS "Admins can upload exercise library" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update exercise library" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete exercise library" ON storage.objects;

CREATE POLICY "Signed-in users can upload exercise library"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-library');

CREATE POLICY "Signed-in users can update exercise library"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-library')
WITH CHECK (bucket_id = 'exercise-library');

CREATE POLICY "Signed-in users can delete exercise library"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-library');