CREATE TABLE public.blog_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Fitness' CHECK (category = 'Fitness'),
  image_url text,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Haris Falas',
  author_credentials text NOT NULL DEFAULT 'Sports Scientist | CSCS Certified | 20+ Years Experience',
  read_time text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are public"
ON public.blog_articles FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can read all articles"
ON public.blog_articles FOR SELECT TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can insert articles"
ON public.blog_articles FOR INSERT TO authenticated
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can update articles"
ON public.blog_articles FOR UPDATE TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can delete articles"
ON public.blog_articles FOR DELETE TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE INDEX blog_articles_published_idx ON public.blog_articles (is_published, published_at DESC);

CREATE TRIGGER trg_blog_articles_updated
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();