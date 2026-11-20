-- PURRFECTCARE v5: close direct database access.
-- Before this, every table had an "allow all" policy, so anyone with the
-- public anon key (shipped in the website) could read, edit or delete any
-- record via the REST API — including changing their own role in
-- user_profiles. All data access now goes through the edge function, which
-- uses the service role (bypasses RLS) and enforces login + roles.
-- RLS stays enabled with no policies = no access for anon/authenticated.

DROP POLICY IF EXISTS "Allow all access to owners" ON public.owners;
DROP POLICY IF EXISTS "Allow all access to pets" ON public.pets;
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow all access to diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Allow all access to diagnosis_medications" ON public.diagnosis_medications;
DROP POLICY IF EXISTS "Allow all access to inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow all access to billing" ON public.billing;
DROP POLICY IF EXISTS "Allow all access to billing_items" ON public.billing_items;
DROP POLICY IF EXISTS "Allow all access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow service role access" ON public.kv_store_b53d76e4;

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_b53d76e4 ENABLE ROW LEVEL SECURITY;
