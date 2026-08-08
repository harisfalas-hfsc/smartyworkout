ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Athens',
  ADD COLUMN IF NOT EXISTS notify_motivation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS motivation_hour integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS wod_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_workout_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_workout_hour integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS last_motivation_on date,
  ADD COLUMN IF NOT EXISTS last_auto_workout_on date;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS is_wod boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wod_date date,
  ADD COLUMN IF NOT EXISTS wod_cycle_day integer;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'motivation',
  title text NOT NULL,
  body text,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);