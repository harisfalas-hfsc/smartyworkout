CREATE TABLE public.exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  body_part text,
  target_muscle text,
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  equipment text,
  category text,
  difficulty text,
  movement_pattern text,
  body_region text,
  description text,
  instructions text[] NOT NULL DEFAULT '{}',
  gif_path text,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exercises" ON public.exercises FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins manage exercises" ON public.exercises FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_exercises_body_part ON public.exercises(body_part);
CREATE INDEX idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX idx_exercises_category ON public.exercises(category);
CREATE INDEX idx_exercises_difficulty ON public.exercises(difficulty);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS fitness_level text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS secondary_goal text,
  ADD COLUMN IF NOT EXISTS training_frequency integer,
  ADD COLUMN IF NOT EXISTS typical_duration_min integer,
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_equipment text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_environment text,
  ADD COLUMN IF NOT EXISTS favorite_exercises text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disliked_exercises text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS limitations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  format text,
  focus text,
  difficulty_stars integer NOT NULL DEFAULT 3,
  duration_min integer NOT NULL DEFAULT 20,
  equipment text[] NOT NULL DEFAULT '{}',
  location text,
  mood text,
  description text,
  instructions text,
  tips text[] NOT NULL DEFAULT '{}',
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  status text NOT NULL DEFAULT 'created',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_workouts_updated BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_workouts_user_created ON public.workouts(user_id, created_at DESC);

CREATE TABLE public.workout_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  difficulty_rating text,
  feeling text,
  enjoyed text,
  would_repeat text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_feedback TO authenticated;
GRANT ALL ON public.workout_feedback TO service_role;
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.workout_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_feedback_workout ON public.workout_feedback(workout_id);

CREATE TABLE public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  metric text NOT NULL DEFAULT 'reps',
  value numeric NOT NULL,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own records" ON public.personal_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_pr_user ON public.personal_records(user_id, label);