-- 1. Remove duplicate WOD rows (keep the oldest per user/day/variant)
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, wod_date, wod_variant ORDER BY created_at) AS rn
  FROM public.workouts WHERE is_wod AND wod_date IS NOT NULL AND wod_variant IS NOT NULL
), dupes AS (SELECT id FROM ranked WHERE rn > 1)
DELETE FROM public.notifications n USING dupes d WHERE n.workout_id = d.id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, wod_date, wod_variant ORDER BY created_at) AS rn
  FROM public.workouts WHERE is_wod AND wod_date IS NOT NULL AND wod_variant IS NOT NULL
)
DELETE FROM public.workouts w USING ranked r WHERE w.id = r.id AND r.rn > 1;

-- 2. Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS workouts_wod_unique_variant
  ON public.workouts (user_id, wod_date, wod_variant)
  WHERE is_wod AND wod_date IS NOT NULL AND wod_variant IS NOT NULL;

-- 3. Clean WOD content delivered to users without an active membership
WITH premium AS (
  SELECT DISTINCT user_id FROM public.subscriptions
  WHERE status IN ('active','trialing','past_due')
    AND (current_period_end IS NULL OR current_period_end > now())
), stray AS (
  SELECT w.id FROM public.workouts w
  WHERE w.is_wod AND w.user_id NOT IN (SELECT user_id FROM premium)
    AND NOT public.is_app_admin(w.user_id)
)
DELETE FROM public.notifications n USING stray s WHERE n.workout_id = s.id;

WITH premium AS (
  SELECT DISTINCT user_id FROM public.subscriptions
  WHERE status IN ('active','trialing','past_due')
    AND (current_period_end IS NULL OR current_period_end > now())
)
DELETE FROM public.workouts w
WHERE w.is_wod AND w.user_id NOT IN (SELECT user_id FROM premium)
  AND NOT public.is_app_admin(w.user_id);

-- 4. Turn WOD delivery off for anyone without a membership
WITH premium AS (
  SELECT DISTINCT user_id FROM public.subscriptions
  WHERE status IN ('active','trialing','past_due')
    AND (current_period_end IS NULL OR current_period_end > now())
)
UPDATE public.profiles p
SET wod_mode = false, auto_workout_enabled = false, wod_renews_at = NULL
WHERE (p.wod_mode OR p.auto_workout_enabled)
  AND p.id NOT IN (SELECT user_id FROM premium)
  AND NOT public.is_app_admin(p.id);