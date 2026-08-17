
CREATE TABLE IF NOT EXISTS public.community_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_ratings TO authenticated;
GRANT SELECT ON public.community_ratings TO anon;
GRANT ALL ON public.community_ratings TO service_role;

ALTER TABLE public.community_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are readable by everyone" ON public.community_ratings;
CREATE POLICY "Ratings are readable by everyone"
  ON public.community_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members manage their own rating" ON public.community_ratings;
CREATE POLICY "Members manage their own rating"
  ON public.community_ratings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_community_ratings_updated ON public.community_ratings;
CREATE TRIGGER trg_community_ratings_updated
  BEFORE UPDATE ON public.community_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.community_workouts_public AS
 SELECT w.id,
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
    COALESCE(r.likes, 0::bigint) AS likes,
    COALESCE(r.dislikes, 0::bigint) AS dislikes,
    COALESCE(c.comments_count, 0::bigint) AS comments_count,
    COALESCE(cc.completions, 0::bigint) AS completions,
    COALESCE(cc.unique_users, 0::bigint) AS unique_completions,
    w.created_by,
    w.is_wod,
    w.wod_date,
    COALESCE(rt.rating_avg, 0::numeric) AS rating_avg,
    COALESCE(rt.rating_count, 0::bigint) AS rating_count
   FROM workouts w
     JOIN profiles p ON p.id = w.user_id
     LEFT JOIN user_progress up ON up.user_id = w.user_id
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE cr.value = 1) AS likes,
            count(*) FILTER (WHERE cr.value = '-1'::integer) AS dislikes
           FROM community_reactions cr
          WHERE cr.workout_id = w.id) r ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS comments_count
           FROM community_comments cm
          WHERE cm.workout_id = w.id AND cm.deleted_at IS NULL) c ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS completions,
            count(DISTINCT co.user_id) AS unique_users
           FROM community_completions co
          WHERE co.workout_id = w.id) cc ON true
     LEFT JOIN LATERAL ( SELECT round(avg(ra.value)::numeric, 2) AS rating_avg,
            count(*) AS rating_count
           FROM community_ratings ra
          WHERE ra.workout_id = w.id) rt ON true
  WHERE w.is_shared AND NOT w.community_hidden;

GRANT SELECT ON public.community_workouts_public TO anon, authenticated, service_role;
