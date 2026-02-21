-- Veterinary Clinic Management System Schema Migration
-- Run this in your Supabase SQL Editor

-- 1. Owners Table
CREATE TABLE IF NOT EXISTS public.owners (
  id TEXT PRIMARY KEY, -- Keeping TEXT to support the existing 'owner:...' format
  name TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Pets Table
CREATE TABLE IF NOT EXISTS public.pets (
  id TEXT PRIMARY KEY, -- 'pet:...'
  owner_id TEXT REFERENCES public.owners(id) ON DELETE CASCADE,
  pet_uid TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT, -- Dog, Cat, etc.
  birthday DATE,
  color TEXT,
  sex TEXT,
  weight DECIMAL(10,2),
  temperature DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY, -- 'appointment:...'
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  date DATE,
  time TIME,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Diagnoses Table
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id TEXT PRIMARY KEY, -- 'diagnosis:...'
  pet_id TEXT REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccination TEXT,
  date DATE,
  weight DECIMAL(10,2),
  temperature DECIMAL(10,2),
  test TEXT,
  dx TEXT, -- Diagnosis
  rx TEXT, -- Prescription
  remarks TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4.1 Diagnosis Medications (Prescribed Items)
CREATE TABLE IF NOT EXISTS public.diagnosis_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id TEXT REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  inventory_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY, -- 'inventory:...'
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
  id TEXT PRIMARY KEY, -- 'bill:...'
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

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple "allow all" policies for now (Note: In production you should properly restrict these)
CREATE POLICY "Allow all access to owners" ON public.owners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pets" ON public.pets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to diagnoses" ON public.diagnoses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to billing" ON public.billing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to billing_items" ON public.billing_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_pet_id ON public.diagnoses(pet_id);
CREATE INDEX IF NOT EXISTS idx_billing_pet_id ON public.billing(pet_id);
CREATE INDEX IF NOT EXISTS idx_billing_items_bill_id ON public.billing_items(bill_id);
