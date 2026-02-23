-- Run this in your Supabase SQL Editor to support the new SMS reminders feature

-- 1. Add tracking columns to prevent duplicate SMS messages
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS sms_1d_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_sameday_sent BOOLEAN DEFAULT FALSE;

-- 2. Enable the required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- 3. Configure PG_CRON Schedule (This runs every hour)
SELECT cron.schedule(
  'send-sms-reminders',   -- The name of the cron job
  '0 * * * *',            -- Runs at minute 0 past every hour
  $$
    SELECT net.http_post(
      url:='https://qwdekvgushzvbyjowvmg.supabase.co/functions/v1/make-server-b53d76e4/cron/send-reminders',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
