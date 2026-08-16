CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'Support request',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  admin_unread boolean NOT NULL DEFAULT true,
  user_unread boolean NOT NULL DEFAULT false,
  user_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_threads_user_idx ON public.support_threads(user_id, last_message_at DESC);
CREATE INDEX support_messages_thread_idx ON public.support_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.support_threads TO authenticated;
GRANT ALL ON public.support_threads TO service_role;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own threads" ON public.support_threads FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "Users create own threads" ON public.support_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "Users update own threads" ON public.support_threads FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_app_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE POLICY "Users read own thread messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.is_app_admin(auth.uid()))));
CREATE POLICY "Users write own thread messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.is_app_admin(auth.uid()))));

CREATE TRIGGER support_threads_updated_at BEFORE UPDATE ON public.support_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();