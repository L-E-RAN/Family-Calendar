-- ============================================================
-- SUPABASE CRON JOBS
-- Run this in Supabase SQL editor AFTER enabling pg_cron extension
-- Enable: Dashboard > Database > Extensions > pg_cron
-- ============================================================

-- Sync Google Calendar every 15 minutes
select cron.schedule(
  'sync-google-calendar',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/sync-google-calendar',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Sync Mashov every 4 hours (at 07:00, 11:00, 15:00, 19:00 UTC = 09:00, 13:00, 17:00, 21:00 IST)
select cron.schedule(
  'sync-mashov',
  '0 7,11,15,19 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/sync-mashov',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Daily school summary at 05:00 UTC = 07:00 IST
select cron.schedule(
  'daily-summary-notification',
  '0 5 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{"type":"daily_summary"}'::jsonb
    );
  $$
);

-- Homework reminder at 15:00 UTC = 17:00 IST
select cron.schedule(
  'homework-reminder',
  '0 15 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{"type":"homework_due"}'::jsonb
    );
  $$
);

-- Exam reminders at 16:00 UTC = 18:00 IST daily
select cron.schedule(
  'exam-reminder',
  '0 16 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{"type":"exam_reminder"}'::jsonb
    );
  $$
);

-- Evaluate reward deadlines every 15 minutes
select cron.schedule(
  'evaluate-daily-deadlines',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/evaluate-daily-deadlines',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Purge old data nightly at 01:00 UTC = 03:00 IST
select cron.schedule(
  'purge-old-items',
  '0 1 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/purge-old-items',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
