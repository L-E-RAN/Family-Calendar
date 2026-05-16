-- ============================================================
-- HOURLY SYNC CRON JOBS
-- Run in Supabase SQL editor
-- Requires: pg_cron + pg_net extensions enabled
-- Replace <YOUR_CRON_SECRET> with the value of CRON_SECRET from .env.local
-- ============================================================

-- Remove old sync jobs if they exist
select cron.unschedule('sync-google-calendar');
select cron.unschedule('sync-mashov');

-- Sync Google + Mashov every hour on the hour
select cron.schedule(
  'sync-all-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://family-calendar-one-lime.vercel.app/api/cron/sync-all',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'b5717d4d57478c8aa27ad427586bf2999e7cb15d90c023e91aeecda933236c8a'
      ),
      body := '{}'::jsonb
    );
  $$
);
