-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the renew-credits function to run daily at 2:00 AM UTC
SELECT cron.schedule(
  'renew-credits-daily',
  '0 2 * * *', -- Every day at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/renew-credits',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcmxlZ2R1bG5ucnBpaXhpZWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDYzNDgsImV4cCI6MjA2OTk4MjM0OH0.on2S0WpM45atAYvLU8laAZJ-abS4RcMmfiqW7mLtT_4"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);