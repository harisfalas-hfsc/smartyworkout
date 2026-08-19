ALTER TABLE public.set_logs
  ADD COLUMN IF NOT EXISTS planned_reps integer,
  ADD COLUMN IF NOT EXISTS planned_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS planned_seconds integer,
  ADD COLUMN IF NOT EXISTS rpe smallint,
  ADD COLUMN IF NOT EXISTS metric text,
  ADD COLUMN IF NOT EXISTS rounds integer,
  ADD COLUMN IF NOT EXISTS interval_index integer,
  ADD COLUMN IF NOT EXISTS distance_m numeric,
  ADD COLUMN IF NOT EXISTS partial boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.workout_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  format text,
  category text,
  metric text,
  duration_seconds integer,
  rounds integer,
  extra_reps integer,
  intervals_done integer,
  intervals_total integer,
  finished boolean,
  rpe smallint,
  analysis_note text,
  strength_load numeric,
  conditioning_load numeric,
  data_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_results TO authenticated;
GRANT ALL ON public.workout_results TO service_role;

ALTER TABLE public.workout_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workout results"
  ON public.workout_results FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_workout_results_updated
  BEFORE UPDATE ON public.workout_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();