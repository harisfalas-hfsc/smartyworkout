CREATE TABLE public.workout_generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'initial',
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  refinement_text text,
  status text NOT NULL DEFAULT 'pending',
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name text,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_error text,
  notes text[] NOT NULL DEFAULT '{}',
  customer_notified_at timestamptz,
  recovery_notified_at timestamptz,
  abandoned_alert_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workout_generation_requests TO authenticated;
GRANT ALL ON public.workout_generation_requests TO service_role;
ALTER TABLE public.workout_generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own generation requests"
ON public.workout_generation_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE INDEX idx_wgr_pending ON public.workout_generation_requests (status, next_retry_at);
CREATE INDEX idx_wgr_user ON public.workout_generation_requests (user_id, created_at DESC);

CREATE TRIGGER trg_wgr_updated BEFORE UPDATE ON public.workout_generation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid,
  stage text NOT NULL DEFAULT 'initial',
  reason text NOT NULL,
  failure_kind text NOT NULL DEFAULT 'technical',
  refinement_text text,
  email_status text,
  email_error text,
  email_message_id text,
  email_recipient text,
  email_dispatched_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

GRANT SELECT ON public.workout_generation_failures TO authenticated;
GRANT ALL ON public.workout_generation_failures TO service_role;
ALTER TABLE public.workout_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read generation failures"
ON public.workout_generation_failures FOR SELECT TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE INDEX idx_wgf_time ON public.workout_generation_failures (occurred_at DESC);