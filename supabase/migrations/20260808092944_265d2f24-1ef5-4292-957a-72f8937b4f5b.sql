CREATE SEQUENCE IF NOT EXISTS public.workout_serial_seq START 1001;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS serial bigint NOT NULL DEFAULT nextval('public.workout_serial_seq'),
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS soft_tissue text,
  ADD COLUMN IF NOT EXISTS activation text,
  ADD COLUMN IF NOT EXISTS warm_up text,
  ADD COLUMN IF NOT EXISTS main_workout text,
  ADD COLUMN IF NOT EXISTS finisher text,
  ADD COLUMN IF NOT EXISTS cool_down text,
  ADD COLUMN IF NOT EXISTS tips_html text,
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS instructions_html text,
  ADD COLUMN IF NOT EXISTS duration_label text,
  ADD COLUMN IF NOT EXISTS difficulty_label text,
  ADD COLUMN IF NOT EXISTS created_by text DEFAULT 'Haris Falas',
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_warnings text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS user_note text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;

GRANT USAGE, SELECT ON SEQUENCE public.workout_serial_seq TO authenticated, service_role;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS frame_start_path text,
  ADD COLUMN IF NOT EXISTS frame_end_path text;