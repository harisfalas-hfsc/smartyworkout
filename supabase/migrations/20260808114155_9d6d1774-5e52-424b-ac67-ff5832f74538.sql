ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS wod_variant text;
CREATE INDEX IF NOT EXISTS workouts_wod_lookup_idx ON public.workouts (user_id, wod_date, wod_variant) WHERE is_wod;