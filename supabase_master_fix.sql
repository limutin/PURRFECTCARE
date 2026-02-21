-- Veterinary Clinic Management System Master Schema Update
-- Run this in your Supabase SQL Editor to ensure all columns exist

-- 1. Owners Table
CREATE TABLE IF NOT EXISTS public.owners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Pets Table
CREATE TABLE IF NOT EXISTS public.pets (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES public.owners(id) ON DELETE CASCADE,
  pet_uid TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT,
  birthday DATE,
  color TEXT,
  sex TEXT,
  weight DECIMAL(10,2),
  temperature DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  date DATE,
  time TIME,
  reason TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Diagnoses Table
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id TEXT PRIMARY KEY,
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccination TEXT,
  date DATE,
  weight DECIMAL(10,2),
  temperature DECIMAL(10,2),
  test TEXT,
  dx TEXT,
  rx TEXT,
  remarks TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4.1 Diagnosis Medications
CREATE TABLE IF NOT EXISTS public.diagnosis_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id TEXT REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  inventory_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 6. Billing Table
CREATE TABLE IF NOT EXISTS public.billing (
  id TEXT PRIMARY KEY,
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  diagnosis_id TEXT REFERENCES public.diagnoses(id) ON DELETE SET NULL,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 7. Billing Items Table
CREATE TABLE IF NOT EXISTS public.billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id TEXT REFERENCES public.billing(id) ON DELETE CASCADE,
  inventory_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
  name TEXT,
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  subtotal DECIMAL(10,2)
);

-- 8. User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS is enabled
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Safety Policy: Allow all for development
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to diagnosis_medications') THEN
        CREATE POLICY "Allow all access to diagnosis_medications" ON public.diagnosis_medications FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
