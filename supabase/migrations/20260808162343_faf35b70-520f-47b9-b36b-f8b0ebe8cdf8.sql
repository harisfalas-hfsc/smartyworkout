ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS readiness_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS readiness_warning_acknowledged_at timestamp with time zone;