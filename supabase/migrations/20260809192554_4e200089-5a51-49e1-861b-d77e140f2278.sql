ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_exercise_ids text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS disliked_exercise_ids text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  exercise_id text,
  exercise_name text NOT NULL,
  section text,
  set_number integer NOT NULL DEFAULT 1,
  reps integer,
  weight_kg numeric,
  seconds integer,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT ALL ON public.set_logs TO service_role;

ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own set logs" ON public.set_logs;
CREATE POLICY "Users manage own set logs"
  ON public.set_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS set_logs_user_workout_idx ON public.set_logs (user_id, workout_id);
CREATE INDEX IF NOT EXISTS set_logs_user_completed_idx ON public.set_logs (user_id, completed_at DESC);

UPDATE public.workouts
SET difficulty_stars = CEIL(difficulty_stars::numeric / 2)::int
WHERE difficulty_stars > 3;