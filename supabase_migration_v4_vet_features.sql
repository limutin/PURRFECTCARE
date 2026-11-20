-- PURRFECTCARE v4: clinic workflow features
-- Patient profiles, services price list, stock auto-deduction, payments,
-- check-in, appointment requests, vaccine reminders, stored documents.
-- Safe to re-run.

-- Patient profile extras
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Services price list (consultation, grooming, surgery, lab tests...)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,                       -- 'service:...'
  name TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

INSERT INTO public.services (id, name, category, price) VALUES
  ('service:consultation', 'Consultation', 'Consultation', 500),
  ('service:follow-up', 'Follow-up check-up', 'Consultation', 300),
  ('service:vaccination', 'Vaccination (administration)', 'Preventive', 300),
  ('service:deworming', 'Deworming (administration)', 'Preventive', 150),
  ('service:grooming-basic', 'Basic grooming', 'Grooming', 500),
  ('service:cbc', 'Complete blood count (CBC)', 'Laboratory', 800),
  ('service:confinement-day', 'Confinement (per day)', 'Confinement', 500)
ON CONFLICT (id) DO NOTHING;

-- Inventory reorder level
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 5;

-- Track which dispensed/billed quantities were taken out of stock, so edits
-- and deletions can put them back without touching older records.
ALTER TABLE public.diagnosis_medications
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.billing_items
  ADD COLUMN IF NOT EXISTS service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'inventory',   -- 'inventory' | 'service'
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;

-- Payments
ALTER TABLE public.billing
  ADD COLUMN IF NOT EXISTS payment_method TEXT,      -- 'cash' | 'gcash' | 'card' | 'bank' | 'other'
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS services_total DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Back-fill paid_at for bills already marked paid (best available timestamp)
UPDATE public.billing SET paid_at = created_at WHERE status = 'paid' AND paid_at IS NULL;

-- Appointments: check-in time and who requested it
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_by_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- Vaccine / deworming due reminders
ALTER TABLE public.pet_history
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Generated documents (forms / certificates) kept per patient
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id TEXT REFERENCES public.pets(id) ON DELETE SET NULL,
  pet_name TEXT,
  owner_name TEXT,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_pet_id ON public.documents(pet_id);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Atomic stock adjustment used by the edge function
CREATE OR REPLACE FUNCTION public.adjust_inventory(p_id TEXT, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.inventory SET quantity = quantity + p_delta WHERE id = p_id RETURNING quantity;
$$;
REVOKE ALL ON FUNCTION public.adjust_inventory(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- Private storage buckets (accessed only through the edge function)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false), ('pet-photos', 'pet-photos', false)
ON CONFLICT (id) DO NOTHING;

GRANT EXECUTE ON FUNCTION public.adjust_inventory(TEXT, INTEGER) TO service_role;
