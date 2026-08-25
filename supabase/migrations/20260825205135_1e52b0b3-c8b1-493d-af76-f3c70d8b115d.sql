CREATE TABLE public.error_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'server',
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  source text,
  route text,
  user_id uuid,
  user_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_key text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  alerted_at timestamp with time zone,
  resolved_at timestamp with time zone,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX error_events_created_idx ON public.error_events (created_at DESC);
CREATE INDEX error_events_group_idx ON public.error_events (group_key, created_at DESC);

GRANT SELECT, UPDATE ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error events"
ON public.error_events FOR SELECT TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can update error events"
ON public.error_events FOR UPDATE TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_error_events_updated
BEFORE UPDATE ON public.error_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();