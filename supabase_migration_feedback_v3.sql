-- PURRFECTCARE: feedback round 3
-- Adds pet medical history (vaccines / deworming / transfers) and VHC control-number log.
-- Run in the Supabase SQL Editor (safe to re-run).

CREATE TABLE IF NOT EXISTS public.pet_history (
  id TEXT PRIMARY KEY,                       -- 'history:...'
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- 'vaccination' | 'deworming' | 'other'
  name TEXT,                                 -- vaccine / dewormer / product used
  date DATE NOT NULL,
  next_due_date DATE,
  source TEXT,                               -- clinic where it was given (e.g. previous clinic)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_pet_history_pet_id ON public.pet_history(pet_id);
ALTER TABLE public.pet_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vhc_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_no TEXT NOT NULL,
  pet_id TEXT REFERENCES public.pets(id) ON DELETE SET NULL,
  pet_name TEXT,
  owner_name TEXT,
  vaccine_used TEXT,
  vaccine_date DATE,
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_vhc_created_at ON public.vhc_certificates(created_at DESC);
ALTER TABLE public.vhc_certificates ENABLE ROW LEVEL SECURITY;
-- No public policies: these tables are only accessed through the edge function (service role).
