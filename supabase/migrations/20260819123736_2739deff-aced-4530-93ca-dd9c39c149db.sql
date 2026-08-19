ALTER TABLE public.set_logs ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1;
ALTER TABLE public.workout_results ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1;
ALTER TABLE public.workout_results ADD COLUMN IF NOT EXISTS prescription_hash text;
ALTER TABLE public.workout_results ADD COLUMN IF NOT EXISTS performed_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.workout_results SET performed_at = created_at WHERE performed_at IS DISTINCT FROM created_at;

ALTER TABLE public.workout_results DROP CONSTRAINT IF EXISTS workout_results_workout_id_key;
ALTER TABLE public.workout_results ADD CONSTRAINT workout_results_workout_attempt_key UNIQUE (workout_id, attempt);

CREATE INDEX IF NOT EXISTS set_logs_workout_attempt_idx ON public.set_logs (user_id, workout_id, attempt);
CREATE INDEX IF NOT EXISTS workout_results_user_workout_idx ON public.workout_results (user_id, workout_id, attempt);