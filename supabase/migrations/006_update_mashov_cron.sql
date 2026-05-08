-- Update Mashov sync cron from every 4 hours to every 30 minutes
select cron.unschedule('sync-mashov');

select cron.schedule(
  'sync-mashov',
  '*/30 * * * *',
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
