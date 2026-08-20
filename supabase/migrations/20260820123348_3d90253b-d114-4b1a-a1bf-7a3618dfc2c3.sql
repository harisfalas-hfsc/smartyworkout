CREATE TABLE IF NOT EXISTS public.cron_jobs (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  hour integer NOT NULL DEFAULT 0,
  minute integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_on text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_jobs TO service_role;
ALTER TABLE public.cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ok',
  changed boolean NOT NULL DEFAULT false,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger text NOT NULL DEFAULT 'schedule'
);

CREATE INDEX IF NOT EXISTS cron_runs_job_ran_idx ON public.cron_runs (job_key, ran_at DESC);
GRANT ALL ON public.cron_runs TO service_role;
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;