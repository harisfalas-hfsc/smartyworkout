-- 1. Sharing flags on existing workouts
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS community_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_source_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workouts_shared_idx ON public.workouts (shared_at DESC) WHERE is_shared AND NOT community_hidden;
CREATE INDEX IF NOT EXISTS workouts_shared_creator_idx ON public.workouts (user_id) WHERE is_shared;
CREATE INDEX IF NOT EXISTS workouts_community_source_idx ON public.workouts (community_source_id);

-- 2. Reactions
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_reactions TO service_role;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read reactions" ON public.community_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members manage own reaction" ON public.community_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS community_reactions_workout_idx ON public.community_reactions (workout_id, value);

-- 3. Comments
CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read comments" ON public.community_comments FOR SELECT TO authenticated USING (deleted_at IS NULL OR auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "Members write own comments" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own comments" ON public.community_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "Members delete own comments" ON public.community_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS community_comments_workout_idx ON public.community_comments (workout_id, created_at DESC);
CREATE TRIGGER trg_community_comments_updated BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Completions of shared workouts
CREATE TABLE IF NOT EXISTS public.community_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  copy_workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (copy_workout_id)
);
GRANT SELECT ON public.community_completions TO authenticated;
GRANT ALL ON public.community_completions TO service_role;
ALTER TABLE public.community_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read completions" ON public.community_completions FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS community_completions_workout_idx ON public.community_completions (workout_id);
CREATE INDEX IF NOT EXISTS community_completions_user_idx ON public.community_completions (user_id);

CREATE OR REPLACE FUNCTION public.credit_community_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.community_source_id IS NOT NULL THEN
    INSERT INTO public.community_completions (workout_id, user_id, copy_workout_id)
    VALUES (NEW.community_source_id, NEW.user_id, NEW.id)
    ON CONFLICT (copy_workout_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_credit_community_completion ON public.workouts;
CREATE TRIGGER trg_credit_community_completion AFTER INSERT OR UPDATE OF status ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.credit_community_completion();

-- 5. Reports
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('workout', 'comment')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members create reports" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters and admins read reports" ON public.community_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_app_admin(auth.uid()));

-- 6. Public read-only community views (run as owner, so private tables stay protected)
CREATE OR REPLACE VIEW public.community_workouts_public AS
SELECT
  w.id,
  w.name,
  w.category,
  w.format,
  w.focus,
  w.difficulty_stars,
  w.duration_min,
  w.equipment,
  w.location,
  w.image_url,
  w.description,
  w.shared_at,
  w.user_id AS creator_id,
  p.display_name AS creator_name,
  p.avatar_url AS creator_avatar,
  COALESCE(up.score, 0) AS creator_score,
  COALESCE(up.current_streak, 0) AS creator_streak,
  COALESCE(up.workouts_completed, 0) AS creator_completed,
  COALESCE(up.workouts_generated, 0) AS creator_generated,
  COALESCE(r.likes, 0) AS likes,
  COALESCE(r.dislikes, 0) AS dislikes,
  COALESCE(c.comments_count, 0) AS comments_count,
  COALESCE(cc.completions, 0) AS completions,
  COALESCE(cc.unique_users, 0) AS unique_completions
FROM public.workouts w
JOIN public.profiles p ON p.id = w.user_id
LEFT JOIN public.user_progress up ON up.user_id = w.user_id
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE value = 1) AS likes, count(*) FILTER (WHERE value = -1) AS dislikes
  FROM public.community_reactions cr WHERE cr.workout_id = w.id
) r ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS comments_count FROM public.community_comments cm
  WHERE cm.workout_id = w.id AND cm.deleted_at IS NULL
) c ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS completions, count(DISTINCT user_id) AS unique_users
  FROM public.community_completions co WHERE co.workout_id = w.id
) cc ON true
WHERE w.is_shared AND NOT w.community_hidden;
GRANT SELECT ON public.community_workouts_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_comments_public AS
SELECT cm.id, cm.workout_id, cm.user_id, cm.body, cm.created_at,
       p.display_name AS author_name, p.avatar_url AS author_avatar
FROM public.community_comments cm
JOIN public.profiles p ON p.id = cm.user_id
JOIN public.workouts w ON w.id = cm.workout_id
WHERE cm.deleted_at IS NULL AND w.is_shared AND NOT w.community_hidden;
GRANT SELECT ON public.community_comments_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_members_public AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(up.score, 0) AS score,
  COALESCE(up.current_streak, 0) AS current_streak,
  COALESCE(up.longest_streak, 0) AS longest_streak,
  COALESCE(up.workouts_completed, 0) AS workouts_completed,
  COALESCE(up.workouts_generated, 0) AS workouts_generated,
  COALESCE(up.subscription_months, 0) AS subscription_months,
  COALESCE(up.badge_points, 0) AS badge_points,
  COALESCE(s.shared_count, 0) AS workouts_shared,
  COALESCE(s.received_completions, 0) AS received_completions,
  COALESCE(s.received_likes, 0) AS received_likes,
  COALESCE(s.received_comments, 0) AS received_comments
FROM public.profiles p
LEFT JOIN public.user_progress up ON up.user_id = p.id
LEFT JOIN LATERAL (
  SELECT
    count(*) AS shared_count,
    COALESCE(sum(v.completions), 0) AS received_completions,
    COALESCE(sum(v.likes), 0) AS received_likes,
    COALESCE(sum(v.comments_count), 0) AS received_comments
  FROM public.community_workouts_public v
  WHERE v.creator_id = p.id
) s ON true;
GRANT SELECT ON public.community_members_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_badges_public AS
SELECT ub.user_id, ub.badge_id, ub.badge_name, ub.category, ub.points, ub.earned_at,
       bd.icon
FROM public.user_badges ub
LEFT JOIN public.badge_definitions bd ON bd.id = ub.badge_id;
GRANT SELECT ON public.community_badges_public TO anon, authenticated;