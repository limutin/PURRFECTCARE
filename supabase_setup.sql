-- Run this in your Supabase SQL Editor to set up the key-value store table
-- Replace the suffix 'b53d76e4' if you want a different unique name, 
-- but make sure it matches the 'functionName' in src/utils/supabase/info.tsx

CREATE TABLE IF NOT EXISTS kv_store_b53d76e4 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE kv_store_b53d76e4 ENABLE ROW LEVEL SECURITY;

-- Create policy to allow full access with service role key (used by edge functions)
-- and restricted access for others if needed.
-- For simplicity, since the edge function uses the service role key, 
-- it will bypass RLS by default. 
-- However, we can add a policy for safety.

CREATE POLICY "Allow service role access" ON kv_store_b53d76e4
  USING (true)
  WITH CHECK (true);
