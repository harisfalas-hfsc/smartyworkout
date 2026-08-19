ALTER TABLE public.workout_feedback
  ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rpe smallint,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.workout_feedback
  ADD CONSTRAINT workout_feedback_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));

DELETE FROM public.workout_feedback a
USING public.workout_feedback b
WHERE a.workout_id = b.workout_id
  AND a.user_id = b.user_id
  AND a.attempt = b.attempt
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS workout_feedback_attempt_key
  ON public.workout_feedback (workout_id, user_id, attempt);

DROP TRIGGER IF EXISTS trg_workout_feedback_updated ON public.workout_feedback;
CREATE TRIGGER trg_workout_feedback_updated
  BEFORE UPDATE ON public.workout_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();