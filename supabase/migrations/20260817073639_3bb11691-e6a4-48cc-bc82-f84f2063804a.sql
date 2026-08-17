CREATE TABLE public.badge_definitions (
  id text PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  threshold integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'trophy',
  points integer NOT NULL DEFAULT 25,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_definitions TO authenticated, anon;
GRANT ALL ON public.badge_definitions TO service_role;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read badges" ON public.badge_definitions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage badges" ON public.badge_definitions FOR ALL TO authenticated USING (is_app_admin(auth.uid())) WITH CHECK (is_app_admin(auth.uid()));
CREATE TRIGGER trg_badge_definitions_updated BEFORE UPDATE ON public.badge_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  badge_name text NOT NULL,
  category text NOT NULL,
  threshold integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id, earned_at DESC);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_app_admin(auth.uid()));

CREATE TABLE public.user_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  workouts_generated integer NOT NULL DEFAULT 0,
  workouts_completed integer NOT NULL DEFAULT 0,
  active_days integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  subscription_months integer NOT NULL DEFAULT 0,
  badge_points integer NOT NULL DEFAULT 0,
  score_reached_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_progress_rank ON public.user_progress(score DESC, workouts_completed DESC, longest_streak DESC, score_reached_at ASC);
GRANT SELECT ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_app_admin(auth.uid()));
CREATE TRIGGER trg_user_progress_updated BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.badge_definitions (id, category, name, description, threshold, icon, points, sort_order) VALUES
('sub_1','subscription','1 Month Member','One month of active membership',1,'crown',25,101),
('sub_3','subscription','3 Month Member','Three months of active membership',3,'crown',50,102),
('sub_6','subscription','6 Month Member','Six months of active membership',6,'crown',100,103),
('sub_12','subscription','12 Month Member','One year of active membership',12,'crown',200,104),
('sub_24','subscription','24 Month Member','Two years of active membership',24,'crown',400,105),
('sub_36','subscription','36 Month Member','Three years of active membership',36,'crown',800,106),
('gen_10','generated','10 Generated','10 workouts generated',10,'sparkles',10,201),
('gen_50','generated','50 Generated','50 workouts generated',50,'sparkles',25,202),
('gen_100','generated','100 Generated','100 workouts generated',100,'sparkles',50,203),
('gen_250','generated','250 Generated','250 workouts generated',250,'sparkles',100,204),
('gen_500','generated','500 Generated','500 workouts generated',500,'sparkles',200,205),
('gen_1000','generated','1000 Generated','1000 workouts generated',1000,'sparkles',400,206),
('gen_2500','generated','2500 Generated','2500 workouts generated',2500,'sparkles',800,207),
('done_10','completed','10 Completed','10 workouts completed',10,'trophy',25,301),
('done_20','completed','20 Completed','20 workouts completed',20,'trophy',50,302),
('done_50','completed','50 Completed','50 workouts completed',50,'trophy',100,303),
('done_100','completed','100 Completed','100 workouts completed',100,'trophy',200,304),
('done_250','completed','250 Completed','250 workouts completed',250,'trophy',400,305),
('done_500','completed','500 Completed','500 workouts completed',500,'trophy',800,306),
('done_1000','completed','1000 Completed','1000 workouts completed',1000,'trophy',1600,307),
('done_2500','completed','2500 Completed','2500 workouts completed',2500,'trophy',3200,308),
('streak_10','streak','10 Day Streak','10 consecutive training days',10,'flame',50,401),
('streak_20','streak','20 Day Streak','20 consecutive training days',20,'flame',100,402),
('streak_30','streak','30 Day Streak','30 consecutive training days',30,'flame',200,403),
('streak_50','streak','50 Day Streak','50 consecutive training days',50,'flame',400,404),
('streak_100','streak','100 Day Streak','100 consecutive training days',100,'flame',800,405),
('streak_200','streak','200 Day Streak','200 consecutive training days',200,'flame',1600,406),
('streak_365','streak','365 Day Streak','A full year of consecutive training days',365,'flame',3650,407);