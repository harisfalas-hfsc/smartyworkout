INSERT INTO public.app_settings (key, value)
VALUES ('daily_run_token', jsonb_build_object('token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')))
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object('token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

DO $do$
DECLARE
  t text;
BEGIN
  SELECT value->>'token' INTO t FROM public.app_settings WHERE key = 'daily_run_token';

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE command LIKE '%daily-run%';

  PERFORM cron.schedule(
    'smartyworkout-daily-run',
    '5 * * * *',
    format(
      $j$select net.http_post(
        url:='https://project--0e14ddda-24a2-40c3-8de4-fe1a7620294f.lovable.app/api/public/hooks/daily-run',
        headers:=jsonb_build_object('Content-Type','application/json','x-daily-secret',%L),
        body:='{}'::jsonb
      ) as request_id;$j$, t)
  );
END
$do$;