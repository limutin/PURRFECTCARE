// @ts-nocheck
import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "apikey"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.use('*', logger(console.log));

// Helper to handle authentication (cached per request by the access gate below)
async function getAuthUser(c: Context) {
  const cached = c.get('authUser');
  if (cached !== undefined) return cached;
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

// ============== ACCESS CONTROL ============== //
// Roles come only from user_profiles (users cannot edit it). user_metadata is
// ignored for authorization because users can change their own metadata.

const BASE = '/make-server-b53d76e4';
const STAFF_ROLES = ['doctor', 'secretary'];
const OWNER_ROLES = ['owner', 'client'];

// Reachable without signing in
const PUBLIC_ROUTES = [
  ['POST', `${BASE}/signup`],
  ['POST', `${BASE}/cron/send-reminders`],   // called by pg_cron; idempotent
];

// Staff routes only a doctor may use: [method, path prefix]
const DOCTOR_ONLY = [
  ['POST', `${BASE}/diagnoses`], ['PUT', `${BASE}/diagnoses/`], ['DELETE', `${BASE}/diagnoses/`],
  ['POST', `${BASE}/inventory`], ['PUT', `${BASE}/inventory/`], ['DELETE', `${BASE}/inventory/`],
  ['POST', `${BASE}/migrate`],
  ['GET', `${BASE}/staff`], ['POST', `${BASE}/staff`], ['PUT', `${BASE}/staff/`],
];

app.use(`${BASE}/*`, async (c, next) => {
  const method = c.req.method;
  if (method === 'OPTIONS') return next();
  const path = c.req.path;
  if (PUBLIC_ROUTES.some(([m, p]) => m === method && path === p)) return next();

  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Please sign in' }, 401);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return c.json({ error: 'Your session has expired. Please sign in again.' }, 401);
  c.set('authUser', user);

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role || null;
  c.set('role', role);

  // Any signed-in user may read their own profile
  if (method === 'GET' && path === `${BASE}/user`) return next();

  // Owner portal routes
  if (path.startsWith(`${BASE}/my/`)) {
    return OWNER_ROLES.includes(role) || STAFF_ROLES.includes(role) ? next() : c.json({ error: 'Not allowed' }, 403);
  }

  // Everything else is clinic staff only
  if (!STAFF_ROLES.includes(role)) return c.json({ error: 'Clinic staff only' }, 403);

  const doctorOnly = DOCTOR_ONLY.some(([m, p]) => m === method && (p.endsWith('/') ? path.startsWith(p) : path === p));
  if (doctorOnly && role !== 'doctor') return c.json({ error: 'Only a doctor can do this' }, 403);

  return next();
});

// ============== SHARED HELPERS ============== //

// Adds (positive) or removes (negative) stock atomically.
async function adjustStock(inventoryId, delta) {
  if (!inventoryId || !delta) return;
  const { error } = await supabase.rpc('adjust_inventory', { p_id: inventoryId, p_delta: delta });
  if (error) console.error(`Stock adjust failed for ${inventoryId}:`, error.message);
}

const decodeBase64 = (b64) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));

// Today's date (YYYY-MM-DD) in Philippine time, optionally shifted by N days.
function phtDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
}

function phtHour() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
}

// Replaces stored photo paths with short-lived signed URLs.
async function signPetPhotos(pets) {
  const paths = pets.map(p => p.photo_url).filter(Boolean);
  if (!paths.length) return pets;
  const { data } = await supabase.storage.from('pet-photos').createSignedUrls(paths, 60 * 60);
  const byPath = {};
  for (const s of data || []) if (s.path && s.signedUrl) byPath[s.path] = s.signedUrl;
  return pets.map(p => ({ ...p, photo_path: p.photo_url, photo_url: p.photo_url ? (byPath[p.photo_url] || null) : null }));
}

// ============== AUTH ============== //

// Public sign-up creates PET OWNER accounts only. Staff accounts are created
// by a doctor through /staff.
app.post("/make-server-b53d76e4/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password || !name?.trim()) throw new Error('Name, email and password are required');
    if (String(password).length < 8) throw new Error('Password must be at least 8 characters');
    const role = 'owner';
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, user_metadata: { name: name.trim(), role }, email_confirm: true
    });
    if (error) throw error;
    const { error: pErr } = await supabase.from('user_profiles').upsert({ id: data.user.id, email, name: name.trim(), role });
    if (pErr) throw pErr;
    return c.json({ message: "Success" });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

// ---- Staff accounts (doctor only; enforced by the access gate) ----
app.get("/make-server-b53d76e4/staff", async (c) => {
  const { data, error } = await supabase.from('user_profiles')
    .select('id, email, name, role, created_at').in('role', STAFF_ROLES).order('created_at');
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ staff: data || [] });
});

app.post("/make-server-b53d76e4/staff", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    if (!STAFF_ROLES.includes(role)) throw new Error('Role must be doctor or secretary');
    if (!email || !name?.trim()) throw new Error('Name and email are required');
    if (!password || String(password).length < 8) throw new Error('Temporary password must be at least 8 characters');
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, user_metadata: { name: name.trim(), role }, email_confirm: true
    });
    if (error) throw error;
    const { error: pErr } = await supabase.from('user_profiles').upsert({ id: data.user.id, email, name: name.trim(), role });
    if (pErr) throw pErr;
    return c.json({ message: "Staff account created" });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

// Change a staff member's role, or remove their staff access
app.put("/make-server-b53d76e4/staff/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const me = await getAuthUser(c);
    const { role } = await c.req.json();
    if (![...STAFF_ROLES, 'disabled'].includes(role)) throw new Error('Role must be doctor, secretary or disabled');
    if (id === me?.id) throw new Error("You can't change your own role");
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id);
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

app.get("/make-server-b53d76e4/user", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
  // Never fall back to user_metadata.role: users can edit their own metadata
  return c.json({ user: data || { id: user.id, email: user.email, name: user.user_metadata?.name || '', role: null } });
});

// ============== OWNERS & PETS ============== //

app.post("/make-server-b53d76e4/owners", async (c) => {
  try {
    const user = await getAuthUser(c);
    const { owner, pet } = await c.req.json();
    const ownerId = `owner:${Date.now()}`;
    const petId = `pet:${Date.now()}`;

    // Generate UID
    const { count } = await supabase.from('pets').select('*', { count: 'exact', head: true });
    const petUid = `PET-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { error: oErr } = await supabase.from('owners').insert({
      id: ownerId, name: owner.name, address: owner.address, contact: owner.contact, email: owner.email, created_by: user?.id
    });
    if (oErr) throw oErr;

    const { error: pErr } = await supabase.from('pets').insert({
      id: petId, owner_id: ownerId, pet_uid: petUid, name: pet.name, type: pet.type,
      birthday: pet.birthday, breed: pet.breed, color: pet.color, sex: pet.sex,
      weight: pet.weight, temperature: pet.temperature, neutering_date: pet.neutering_date,
      microchip: pet.microchip
    });
    if (pErr) throw pErr;

    return c.json({ message: "Created", ownerId, petId });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/owners", async (c) => {
  const { data } = await supabase.from('owners').select('*');
  return c.json({ owners: (data || []).map(o => ({ key: o.id, value: o })) });
});

app.get("/make-server-b53d76e4/pets", async (c) => {
  const { data } = await supabase.from('pets').select('*');
  const pets = await signPetPhotos(data || []);
  return c.json({ pets: pets.map(p => ({ key: p.id, value: p })) });
});

// Add another pet to an existing owner
app.post("/make-server-b53d76e4/owners/:id/pets", async (c) => {
  try {
    const ownerId = c.req.param('id');
    const pet = await c.req.json();
    const petId = `pet:${Date.now()}`;
    const { count } = await supabase.from('pets').select('*', { count: 'exact', head: true });
    const petUid = `PET-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('pets').insert({
      id: petId, owner_id: ownerId, pet_uid: petUid, name: pet.name, type: pet.type,
      birthday: pet.birthday || null, breed: pet.breed, color: pet.color, sex: pet.sex,
      weight: pet.weight || null, microchip: pet.microchip,
    });
    if (error) throw error;
    return c.json({ message: "Created", petId });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Upload / replace a pet's photo (base64, already resized by the browser)
app.post("/make-server-b53d76e4/pets/:id/photo", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const petId = c.req.param('id');
    const { content_base64, content_type } = await c.req.json();
    if (!content_base64) throw new Error('content_base64 is required');
    const bytes = decodeBase64(content_base64);
    if (bytes.length > 2 * 1024 * 1024) throw new Error('Photo is too large (max 2 MB)');
    const ext = content_type === 'image/png' ? 'png' : content_type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${petId.replace(/[^a-zA-Z0-9_-]/g, '_')}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, bytes, { contentType: content_type || 'image/jpeg', upsert: true });
    if (upErr) throw upErr;
    const { data: old } = await supabase.from('pets').select('photo_url').eq('id', petId).maybeSingle();
    const { error } = await supabase.from('pets').update({ photo_url: path }).eq('id', petId);
    if (error) throw error;
    if (old?.photo_url) await supabase.storage.from('pet-photos').remove([old.photo_url]);
    const { data: signed } = await supabase.storage.from('pet-photos').createSignedUrl(path, 60 * 60);
    return c.json({ message: "Uploaded", photo_url: signed?.signedUrl || null });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/make-server-b53d76e4/owners/:id", async (c) => {
  try {
    const updates = await c.req.json();
    const { error } = await supabase.from('owners').update(updates).eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/make-server-b53d76e4/pets/:id", async (c) => {
  try {
    const updates = await c.req.json();
    // Photos are managed by the /photo endpoint; never overwrite the stored path with a signed URL
    delete updates.photo_url;
    delete updates.photo_path;
    delete updates.id;
    const { error } = await supabase.from('pets').update(updates).eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== DIAGNOSES ============== //

app.post("/make-server-b53d76e4/diagnoses", async (c) => {
  try {
    const user = await getAuthUser(c);
    const diagnosis = await c.req.json();
    const id = `diagnosis:${Date.now()}`;

    // Verify pet exists in relational DB
    const { data: petCheck } = await supabase.from('pets').select('id').eq('id', diagnosis.pet_id).single();
    if (!petCheck) throw new Error(`Pet ID ${diagnosis.pet_id} not found in database. Please ensure data is migrated.`);

    const { error: diagError } = await supabase.from('diagnoses').insert({
      id,
      pet_id: diagnosis.pet_id,
      vaccination: diagnosis.vaccination,
      date: diagnosis.date,
      weight: diagnosis.weight,
      temperature: diagnosis.temperature,
      test: diagnosis.test,
      dx: diagnosis.dx,
      rx: diagnosis.rx,
      remarks: diagnosis.remarks,
      follow_up_date: diagnosis.follow_up_date,
      created_by: user?.id
    });

    if (diagError) throw diagError;

    if (diagnosis.medications?.length) {
      const meds = diagnosis.medications.filter(m => m.inventory_id).map(m => ({
        diagnosis_id: id,
        inventory_id: m.inventory_id,
        quantity: m.quantity,
        stock_deducted: true,
      }));
      const { error: medError } = await supabase.from('diagnosis_medications').insert(meds);
      if (medError) console.error("Medication save error:", medError);
      else for (const m of meds) await adjustStock(m.inventory_id, -Number(m.quantity || 0));
    }

    return c.json({ message: "Diagnosis saved successfully", id });
  } catch (e) {
    console.error("Diagnosis POST error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/diagnoses", async (c) => {
  const { data } = await supabase.from('diagnoses').select('*, medications:diagnosis_medications(*, inventory(name, price))');
  const formatted = (data || []).map(d => ({
    key: d.id,
    value: {
      ...d,
      medications: (d.medications || []).map(m => ({
        ...m,
        name: m.inventory?.name || 'Unknown Item',
        price: m.inventory?.price ?? 0
      }))
    }
  }));
  return c.json({ diagnoses: formatted });
});

app.put("/make-server-b53d76e4/diagnoses/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const d = await c.req.json();

    const { error: updError } = await supabase.from('diagnoses').update({
      vaccination: d.vaccination,
      date: d.date,
      weight: d.weight,
      temperature: d.temperature,
      test: d.test,
      dx: d.dx,
      rx: d.rx,
      remarks: d.remarks,
      follow_up_date: d.follow_up_date || null,
    }).eq('id', id);
    if (updError) throw updError;

    // Replace dispensed medications with the edited list: put previously
    // deducted stock back, then take the new quantities out.
    if (Array.isArray(d.medications)) {
      const { data: oldMeds } = await supabase.from('diagnosis_medications')
        .select('inventory_id, quantity, stock_deducted').eq('diagnosis_id', id);
      const { error: delErr } = await supabase.from('diagnosis_medications').delete().eq('diagnosis_id', id);
      if (delErr) throw delErr;
      for (const m of oldMeds || []) if (m.stock_deducted) await adjustStock(m.inventory_id, Number(m.quantity || 0));

      const meds = d.medications
        .filter(m => m.inventory_id)
        .map(m => ({ diagnosis_id: id, inventory_id: m.inventory_id, quantity: m.quantity, stock_deducted: true }));
      if (meds.length) {
        const { error: medError } = await supabase.from('diagnosis_medications').insert(meds);
        if (medError) throw medError;
        for (const m of meds) await adjustStock(m.inventory_id, -Number(m.quantity || 0));
      }
    }

    return c.json({ message: "Diagnosis updated", id });
  } catch (e) {
    console.error("Diagnosis PUT error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/make-server-b53d76e4/diagnoses/:id", async (c) => {
  const id = c.req.param('id');
  // Return dispensed stock before the medication rows are cascaded away
  const { data: meds } = await supabase.from('diagnosis_medications')
    .select('inventory_id, quantity, stock_deducted').eq('diagnosis_id', id);
  const { error } = await supabase.from('diagnoses').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  for (const m of meds || []) if (m.stock_deducted) await adjustStock(m.inventory_id, Number(m.quantity || 0));
  return c.json({ message: "Deleted" });
});

// ============== PET MEDICAL HISTORY ============== //
// Vaccinations, deworming and other history entries, including ones done at
// another clinic before the pet transferred here.

const HISTORY_FIELDS = ['pet_id', 'type', 'name', 'date', 'next_due_date', 'source', 'notes'];
const pickHistory = (body) => {
  const out = {};
  for (const k of HISTORY_FIELDS) if (k in body) out[k] = body[k] === '' ? null : body[k];
  return out;
};

app.get("/make-server-b53d76e4/pet-history", async (c) => {
  let query = supabase.from('pet_history').select('*').order('date', { ascending: false });
  const petId = c.req.query('pet_id');
  if (petId) query = query.eq('pet_id', petId);
  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ history: (data || []).map(h => ({ key: h.id, value: h })) });
});

app.post("/make-server-b53d76e4/pet-history", async (c) => {
  try {
    const user = await getAuthUser(c);
    const body = await c.req.json();
    if (!body.pet_id || !body.type || !body.date) throw new Error('pet_id, type and date are required');
    const id = `history:${Date.now()}`;
    const { error } = await supabase.from('pet_history').insert({ id, ...pickHistory(body), created_by: user?.id });
    if (error) throw error;
    return c.json({ message: "Created", id });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/make-server-b53d76e4/pet-history/:id", async (c) => {
  try {
    const body = await c.req.json();
    const updates = pickHistory(body);
    // A changed due date needs a new reminder
    if ('next_due_date' in updates) {
      const { data: cur } = await supabase.from('pet_history').select('next_due_date').eq('id', c.req.param('id')).maybeSingle();
      if ((cur?.next_due_date || null) !== (updates.next_due_date || null)) updates.reminder_sent = false;
    }
    const { error } = await supabase.from('pet_history').update(updates).eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/make-server-b53d76e4/pet-history/:id", async (c) => {
  const { error } = await supabase.from('pet_history').delete().eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: "Deleted" });
});

// ============== VHC (HEALTH CERTIFICATES) ============== //

app.get("/make-server-b53d76e4/vhc/last-control", async (c) => {
  const { data, error } = await supabase.from('vhc_certificates')
    .select('control_no').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ control_no: data?.control_no || null });
});

app.post("/make-server-b53d76e4/vhc", async (c) => {
  try {
    const user = await getAuthUser(c);
    const b = await c.req.json();
    if (!b.control_no) throw new Error('control_no is required');
    const { error } = await supabase.from('vhc_certificates').insert({
      control_no: b.control_no, pet_id: b.pet_id || null, pet_name: b.pet_name, owner_name: b.owner_name,
      vaccine_used: b.vaccine_used, vaccine_date: b.vaccine_date || null, destination: b.destination,
      created_by: user?.id,
    });
    if (error) throw error;
    return c.json({ message: "Recorded" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== INVENTORY ============== //

app.post("/make-server-b53d76e4/inventory", async (c) => {
  try {
    const item = await c.req.json();
    const id = `inventory:${Date.now()}`;
    const { error } = await supabase.from('inventory').insert({
      id, name: item.name, category: item.category, quantity: item.quantity, price: item.price, expiry_date: item.expiry_date || null, reorder_level: item.reorder_level ?? 5
    });
    if (error) throw error;
    return c.json({ message: "Created", id });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/inventory", async (c) => {
  const { data } = await supabase.from('inventory').select('*');
  return c.json({ inventory: (data || []).map(i => ({ key: i.id, value: i })) });
});

app.put("/make-server-b53d76e4/inventory/:id", async (c) => {
  try {
    const updates = await c.req.json();
    const { error } = await supabase.from('inventory').update({
      name: updates.name, category: updates.category, quantity: updates.quantity, price: updates.price, expiry_date: updates.expiry_date || null, reorder_level: updates.reorder_level ?? 5
    }).eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/make-server-b53d76e4/inventory/:id", async (c) => {
  try {
    const { error } = await supabase.from('inventory').delete().eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Deleted" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== APPOINTMENTS ============== //

// Helper to send SMS via Semaphore
function buildReminderMessage(name, petName, time, type, reason) {
  const formatTime12h = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };
  const formattedTime = formatTime12h(time || '00:00:00');
  const reasonText = reason ? ` for ${reason}` : "";

  let message = "";
  if (type === 'sameday') {
    message = `Hi ${name}, this is PurrfectAC reminding you of ${petName}'s scheduled appointment${reasonText} TODAY at ${formattedTime}. See you!`;
  } else {
    message = `Hi ${name}, this is PurrfectAC. Just a friendly reminder that ${petName} has an appointment${reasonText} TOMORROW at ${formattedTime}.`;
  }
  return message;
}

async function sendSms(name, petName, time, number, type, reason) {
  const message = buildReminderMessage(name, petName, time, type, reason);

  const result = await sendSemaphore(number, message);
  if (!result.ok) console.error(`SMS to ${maskNumber(number)} failed: ${result.error}`);
  return result.ok;
}

// Normalizes a PH mobile number to 09XXXXXXXXX. Takes the first number if
// several are stored ("0917... / 0918..."). Returns null if it isn't valid.
function normalizePhNumber(raw) {
  if (!raw) return null;
  const first = String(raw).split(/[\/,;|]| or /i)[0];
  let digits = first.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) digits = '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) digits = '0' + digits;
  return /^09\d{9}$/.test(digits) ? digits : null;
}

const maskNumber = (n) => String(n || '').replace(/\d(?=\d{3})/g, '*');

// Sends via Semaphore and checks the response body: Semaphore can answer
// HTTP 200 while the message itself was rejected (bad number, no credits,
// unapproved sender name).
async function sendSemaphore(rawNumber, message) {
  const number = normalizePhNumber(rawNumber);
  if (!number) return { ok: false, error: `Invalid mobile number "${rawNumber}". Use the format 09XXXXXXXXX.` };

  const apiKey = Deno.env.get('SEMAPHORE_API_KEY') ?? 'bc9ba5a742210fa6a0ee9c8dda9a4009';
  const senderName = Deno.env.get('SEMAPHORE_SENDER_NAME') ?? 'PurrfectAC';

  const send = async (withSender) => {
    const params = new URLSearchParams();
    params.append('apikey', apiKey);
    params.append('number', number);
    params.append('message', message);
    if (withSender && senderName) params.append('sendername', senderName);
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    const first = Array.isArray(body) ? body[0] : null;
    const status = String(first?.status || '').toLowerCase();
    if (response.ok && first?.message_id && !['failed', 'refunded'].includes(status)) {
      return { ok: true };
    }
    return { ok: false, error: `Semaphore (${response.status}): ${text.slice(0, 300)}` };
  };

  let result = await send(true);
  // An unapproved sender name is the most common rejection: retry with the default sender.
  if (!result.ok && /sender/i.test(result.error)) {
    const retry = await send(false);
    if (retry.ok) return retry;
  }
  return result;
}

// Logic to check if an appointment needs an SMS and send it
async function checkAndSendReminders(apptIds = []) {
  const query = supabase.from('appointments').select('*, pets(name, owners(name, contact))')
    .neq('status', 'completed').neq('status', 'cancelled').neq('status', 'Cancelled').neq('status', 'Requested');

  if (apptIds.length > 0) query.in('id', apptIds);

  const { data: appointments } = await query;
  if (!appointments) return 0;

  // Use Intl to get current PHT date
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(tomorrow);

  let sent = 0;
  for (const appt of appointments) {
    if (!appt.pets?.owners?.contact) continue;

    let type = null;
    let update = {};

    if (appt.date === todayStr && !appt.sms_sameday_sent) {
      type = 'sameday';
      update = { sms_sameday_sent: true };
    } else if (appt.date === tomorrowStr && !appt.sms_1d_sent) {
      type = '1d';
      update = { sms_1d_sent: true };
    }

    if (type) {
      const ok = await sendSms(appt.pets.owners.name, appt.pets.name, appt.time, appt.pets.owners.contact, type, appt.reason);
      if (ok) {
        await supabase.from('appointments').update(update).eq('id', appt.id);
        sent++;
      }
    }
  }
  return sent;
}

// ============== APPOINTMENTS ============== //

// ---- Vaccination / deworming due reminders ----
function buildDueMessage(ownerName, petName, entries) {
  const what = entries.map(e => {
    const kind = e.type === 'deworming' ? 'deworming' : e.type === 'vaccination' ? 'vaccination' : 'treatment';
    return e.name ? `${kind} (${e.name})` : kind;
  });
  const uniq = [...new Set(what)].join(' and ');
  const due = entries[0].next_due_date;
  const dueText = new Date(due + 'T00:00:00+08:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
  return `Hi ${ownerName}, this is PurrfectAC. ${petName} is due for ${uniq} on ${dueText}. Please call or text 0926 740 8552 to book a visit. Thank you!`;
}

// Sends one SMS per pet for history entries due within `daysAhead` days.
async function sendDueReminders({ daysAhead = 3, historyIds = [] } = {}) {
  let query = supabase.from('pet_history')
    .select('id, type, name, next_due_date, pet_id, pets(name, owners(name, contact))')
    .eq('reminder_sent', false)
    .not('next_due_date', 'is', null);
  if (historyIds.length) query = query.in('id', historyIds);
  else query = query.gte('next_due_date', phtDate(0)).lte('next_due_date', phtDate(daysAhead));
  const { data, error } = await query;
  if (error) throw error;

  const byPet = {};
  for (const h of data || []) (byPet[h.pet_id] = byPet[h.pet_id] || []).push(h);

  let sent = 0;
  const failures = [];
  for (const entries of Object.values(byPet)) {
    const owner = entries[0].pets?.owners;
    if (!owner?.contact) { failures.push(`${entries[0].pets?.name || 'pet'}: no contact number`); continue; }
    entries.sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
    const result = await sendSemaphore(owner.contact, buildDueMessage(owner.name, entries[0].pets.name, entries));
    if (result.ok) {
      await supabase.from('pet_history').update({ reminder_sent: true }).in('id', entries.map(e => e.id));
      sent++;
    } else {
      failures.push(`${entries[0].pets?.name}: ${result.error}`);
    }
  }
  return { sent, failures };
}

app.post("/make-server-b53d76e4/cron/send-reminders", async (c) => {
  try {
    const sentCount = await checkAndSendReminders();
    // Due-date reminders only during daytime (8 AM – 8 PM PHT)
    let dueSent = 0;
    const hour = phtHour();
    if (hour >= 8 && hour < 20) dueSent = (await sendDueReminders()).sent;
    return c.json({ message: "Reminders processed", sentCount, dueSent });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Manually send the due reminder for one history entry
app.post("/make-server-b53d76e4/pet-history/:id/remind", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param('id');
    await supabase.from('pet_history').update({ reminder_sent: false }).eq('id', id);
    const { sent, failures } = await sendDueReminders({ historyIds: [id] });
    if (!sent) return c.json({ error: failures[0] || 'Nothing to send (no due date set?)' }, 502);
    return c.json({ message: "Reminder sent" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Vaccines / deworming due soon or overdue, for the dashboard
app.get("/make-server-b53d76e4/due-soon", async (c) => {
  const days = Number(c.req.query('days') || 14);
  const { data, error } = await supabase.from('pet_history')
    .select('id, type, name, next_due_date, reminder_sent, pet_id')
    .not('next_due_date', 'is', null)
    .lte('next_due_date', phtDate(days))
    .gte('next_due_date', phtDate(-60))
    .order('next_due_date');
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ due: data || [] });
});

// ---- Appointment booking rules ----
const ACTIVE_APPT_EXCLUDE = ['cancelled', 'Cancelled', 'completed', 'Completed'];
const toMinutes = (t) => { const [h, m] = String(t || '00:00').split(':').map(Number); return h * 60 + (m || 0); };

// Returns an existing appointment within 30 minutes of the requested slot, if any.
async function findSlotConflict(date, time, excludeId = null) {
  if (!date || !time) return null;
  const { data } = await supabase.from('appointments').select('id, time, status, pets(name)').eq('date', date);
  const target = toMinutes(time);
  return (data || []).find(a =>
    a.id !== excludeId && !ACTIVE_APPT_EXCLUDE.includes(a.status) && Math.abs(toMinutes(a.time) - target) < 30
  ) || null;
}

const conflictMessage = (conf) => {
  const t = String(conf.time || '').slice(0, 5);
  return `That time is already booked (${conf.pets?.name || 'another patient'} at ${t}). Pick another time or book anyway.`;
};

app.post("/make-server-b53d76e4/appointments", async (c) => {
  const user = await getAuthUser(c);
  const { force, ...appt } = await c.req.json();
  if (!force) {
    const conf = await findSlotConflict(appt.date, appt.time);
    if (conf) return c.json({ error: conflictMessage(conf), conflict: true }, 409);
  }
  const id = `appt:${Date.now()}`;
  const { error } = await supabase.from('appointments').insert({
    id, ...appt, created_by: user?.id
  });
  if (error) return c.json({ error: error.message }, 500);

  // Try sending immediate reminder if it's for today/tomorrow
  checkAndSendReminders([id]).catch(console.error);

  return c.json({ message: "Created" });
});

app.get("/make-server-b53d76e4/appointments", async (c) => {
  const { data } = await supabase.from('appointments').select('*');
  return c.json({ appointments: (data || []).map(a => ({ key: a.id, value: a })) });
});

app.put("/make-server-b53d76e4/appointments/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { force, ...updates } = await c.req.json();
    const { data: current } = await supabase.from('appointments').select('date, time, checked_in_at').eq('id', id).maybeSingle();

    const rescheduled = current && ((updates.date && updates.date !== current.date) ||
      (updates.time && String(updates.time).slice(0, 5) !== String(current.time || '').slice(0, 5)));
    if (rescheduled) {
      if (!force) {
        const conf = await findSlotConflict(updates.date || current.date, updates.time || current.time, id);
        if (conf) return c.json({ error: conflictMessage(conf), conflict: true }, 409);
      }
      // New date/time → reminders should go out again
      updates.sms_1d_sent = false;
      updates.sms_sameday_sent = false;
    }
    if (updates.status === 'Waiting' && !current?.checked_in_at) updates.checked_in_at = new Date().toISOString();

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);
    if (error) throw error;

    // Check if update requires a fresh SMS reminder
    checkAndSendReminders([id]).catch(console.error);

    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/make-server-b53d76e4/appointments/:id", async (c) => {
  try {
    const { error } = await supabase.from('appointments').delete().eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Deleted" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/make-server-b53d76e4/send-sms", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { appointment_id, type } = await c.req.json(); // type: '1d' or 'sameday'

    if (!appointment_id) return c.json({ error: "appointment_id is required" }, 400);

    // fetch appointment details with pet and owner
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*, pets(name, owners(name, contact))')
      .eq('id', appointment_id)
      .single();

    if (error || !appt) throw error || new Error("Appointment not found");

    if (!appt.pets?.owners?.contact) {
      return c.json({ error: "Owner contact number not found" }, 400);
    }

    const updateData = type === 'sameday' ? { sms_sameday_sent: true } : { sms_1d_sent: true };

    const message = buildReminderMessage(appt.pets.owners.name, appt.pets.name, appt.time, type, appt.reason);
    const result = await sendSemaphore(appt.pets.owners.contact, message);
    if (result.ok) {
      await supabase.from('appointments').update(updateData).eq('id', appointment_id);
      return c.json({ message: "SMS sent successfully" });
    }
    return c.json({ error: result.error }, 502);
  } catch (e: any) {
    console.error('Manual SMS Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// Free-form SMS to an owner (e.g. "results are ready", "pet ready for pickup")
app.post("/make-server-b53d76e4/send-custom-sms", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { owner_id, message } = await c.req.json();
    if (!owner_id || !message?.trim()) return c.json({ error: "owner_id and message are required" }, 400);
    if (message.length > 480) return c.json({ error: "Message is too long (max 480 characters)" }, 400);
    const { data: owner } = await supabase.from('owners').select('name, contact').eq('id', owner_id).maybeSingle();
    if (!owner?.contact) return c.json({ error: "Owner has no contact number" }, 400);
    const result = await sendSemaphore(owner.contact, message.trim());
    if (!result.ok) return c.json({ error: result.error }, 502);
    return c.json({ message: "SMS sent successfully" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== BILLING ============== //

app.post("/make-server-b53d76e4/billing", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bill:${Date.now()}`;

    let itemsTotal = 0;
    let servicesTotal = 0;
    const billItems = [];

    // Quantities already taken out of stock when the linked diagnosis dispensed them
    const coveredByDiagnosis = {};
    if (body.diagnosis_id) {
      const { data: dm } = await supabase.from('diagnosis_medications')
        .select('inventory_id, quantity, stock_deducted').eq('diagnosis_id', body.diagnosis_id);
      for (const m of dm || []) if (m.stock_deducted) coveredByDiagnosis[m.inventory_id] = (coveredByDiagnosis[m.inventory_id] || 0) + Number(m.quantity || 0);
    }

    const toDeduct = [];
    const products = (body.items || []).filter(i => i.inventory_id && Number(i.quantity) > 0);
    if (products.length) {
      const { data: inventory } = await supabase.from('inventory').select('id, name, price');
      for (const item of products) {
        const inv = inventory?.find(i => i.id === item.inventory_id);
        const qty = Number(item.quantity);
        const price = inv ? parseFloat(inv.price || 0) : 0;
        const subtotal = price * qty;
        itemsTotal += subtotal;
        const covered = Math.min(qty, coveredByDiagnosis[item.inventory_id] || 0);
        coveredByDiagnosis[item.inventory_id] = (coveredByDiagnosis[item.inventory_id] || 0) - covered;
        const extra = qty - covered;
        if (extra > 0) toDeduct.push({ id: item.inventory_id, qty: extra });
        billItems.push({
          bill_id: id, item_type: 'inventory', inventory_id: item.inventory_id,
          name: inv?.name || 'Unknown', quantity: qty, unit_price: price, subtotal,
          stock_deducted: extra > 0,
        });
      }
    }

    const services = (body.services || []).filter(s => s.service_id && Number(s.quantity) > 0);
    if (services.length) {
      const { data: svc } = await supabase.from('services').select('id, name, price');
      for (const s of services) {
        const def = svc?.find(x => x.id === s.service_id);
        const qty = Number(s.quantity);
        // Allow a custom price (e.g. surgery quotes); default to the price list
        const price = s.unit_price != null && s.unit_price !== '' ? parseFloat(s.unit_price) : parseFloat(def?.price || 0);
        const subtotal = price * qty;
        servicesTotal += subtotal;
        billItems.push({
          bill_id: id, item_type: 'service', service_id: s.service_id,
          name: def?.name || 'Service', quantity: qty, unit_price: price, subtotal,
        });
      }
    }

    const total = parseFloat(body.consultation_fee || 0) + itemsTotal + servicesTotal;

    const { error: bErr } = await supabase.from('billing').insert({
      id, pet_id: body.pet_id, diagnosis_id: body.diagnosis_id || null, consultation_fee: body.consultation_fee || 0,
      services_total: servicesTotal, total_cost: total, status: 'unpaid'
    });
    if (bErr) throw bErr;

    if (billItems.length > 0) {
      const { error: iErr } = await supabase.from('billing_items').insert(billItems);
      if (iErr) throw iErr;
      for (const d of toDeduct) await adjustStock(d.id, -d.qty);
    }

    return c.json({ message: "Billed", id, total });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/billing", async (c) => {
  const { data } = await supabase.from('billing').select('*, items:billing_items(*)');
  return c.json({ bills: (data || []).map(b => ({ key: b.id, value: b })) });
});

app.put("/make-server-b53d76e4/billing-update", async (c) => {
  try {
    const { id, updates } = await c.req.json();
    const { error } = await supabase.from('billing').update(updates).eq('id', id);
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/make-server-b53d76e4/billing/:billId", async (c) => {
  try {
    const updates = await c.req.json();
    const billId = c.req.param('billId');
    const { error } = await supabase.from('billing').update(updates).eq('id', billId);
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

const PAYMENT_METHODS = ['cash', 'gcash', 'maya', 'card', 'bank', 'other'];

app.post("/make-server-b53d76e4/billing/:billId/pay", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { payment_method } = await c.req.json();
    const method = PAYMENT_METHODS.includes(payment_method) ? payment_method : 'cash';
    const { error } = await supabase.from('billing')
      .update({ status: 'paid', payment_method: method, paid_at: new Date().toISOString() })
      .eq('id', c.req.param('billId'));
    if (error) throw error;
    return c.json({ message: "Paid" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/make-server-b53d76e4/billing/:billId/unpay", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { error } = await supabase.from('billing')
      .update({ status: 'unpaid', payment_method: null, paid_at: null })
      .eq('id', c.req.param('billId'));
    if (error) throw error;
    return c.json({ message: "Marked unpaid" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== SERVICES (PRICE LIST) ============== //

app.get("/make-server-b53d76e4/services", async (c) => {
  const { data, error } = await supabase.from('services').select('*').order('category').order('name');
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ services: data || [] });
});

app.post("/make-server-b53d76e4/services", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const s = await c.req.json();
    if (!s.name?.trim()) throw new Error('Service name is required');
    const id = `service:${Date.now()}`;
    const { error } = await supabase.from('services').insert({
      id, name: s.name.trim(), category: s.category || 'Other', price: Number(s.price || 0), active: s.active !== false,
    });
    if (error) throw error;
    return c.json({ message: "Created", id });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/make-server-b53d76e4/services/:id", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const s = await c.req.json();
    const updates = {};
    for (const k of ['name', 'category', 'price', 'active']) if (k in s) updates[k] = s[k];
    const { error } = await supabase.from('services').update(updates).eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: "Updated" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== REPORTS ============== //

// Paid bills for one day (Philippine time), totals by payment method
app.get("/make-server-b53d76e4/reports/daily", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const date = c.req.query('date') || phtDate(0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date must be YYYY-MM-DD');
    const start = new Date(`${date}T00:00:00+08:00`).toISOString();
    const end = new Date(new Date(`${date}T00:00:00+08:00`).getTime() + 86400000).toISOString();
    const { data, error } = await supabase.from('billing')
      .select('*, items:billing_items(*), pets(name, owners(name))')
      .eq('status', 'paid').gte('paid_at', start).lt('paid_at', end).order('paid_at');
    if (error) throw error;

    const byMethod = {};
    let total = 0;
    for (const b of data || []) {
      const m = b.payment_method || 'cash';
      byMethod[m] = (byMethod[m] || 0) + Number(b.total_cost || 0);
      total += Number(b.total_cost || 0);
    }
    const { count: unpaidCount } = await supabase.from('billing').select('*', { count: 'exact', head: true }).eq('status', 'unpaid');
    return c.json({ date, bills: data || [], byMethod, total, count: (data || []).length, unpaidCount: unpaidCount || 0 });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== DOCUMENTS (generated forms) ============== //

app.post("/make-server-b53d76e4/documents", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const b = await c.req.json();
    if (!b.content_base64 || !b.file_name || !b.doc_type) throw new Error('doc_type, file_name and content_base64 are required');
    const bytes = decodeBase64(b.content_base64);
    if (bytes.length > 5 * 1024 * 1024) throw new Error('Document is too large');
    const folder = b.pet_id ? b.pet_id.replace(/[^a-zA-Z0-9_-]/g, '_') : 'walk-in';
    const safeName = String(b.file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, bytes, {
      contentType: b.content_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    if (upErr) throw upErr;
    const { data, error } = await supabase.from('documents').insert({
      pet_id: b.pet_id || null, pet_name: b.pet_name, owner_name: b.owner_name,
      doc_type: b.doc_type, file_name: b.file_name, storage_path: path, created_by: user.id,
    }).select('id').single();
    if (error) throw error;
    return c.json({ message: "Saved", id: data.id });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/documents", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(200);
  const petId = c.req.query('pet_id');
  if (petId) query = query.eq('pet_id', petId);
  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ documents: data || [] });
});

app.get("/make-server-b53d76e4/documents/:id/url", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { data: doc } = await supabase.from('documents').select('storage_path, file_name').eq('id', c.req.param('id')).maybeSingle();
  if (!doc) return c.json({ error: "Not found" }, 404);
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 300, { download: doc.file_name });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ url: data.signedUrl });
});

// ============== OWNER PORTAL (scoped to the signed-in owner) ============== //

async function getOwnerScope(c) {
  const user = await getAuthUser(c);
  if (!user?.email) return null;
  const { data: owners } = await supabase.from('owners').select('*').ilike('email', user.email);
  const ownerIds = (owners || []).filter(o => (o.email || '').toLowerCase() === user.email.toLowerCase()).map(o => o.id);
  return { user, owners: (owners || []).filter(o => ownerIds.includes(o.id)), ownerIds };
}

app.get("/make-server-b53d76e4/my/overview", async (c) => {
  try {
    const scope = await getOwnerScope(c);
    if (!scope) return c.json({ error: "Unauthorized" }, 401);
    if (!scope.ownerIds.length) return c.json({ owners: [], pets: [], appointments: [], bills: [], history: [], visits: [] });

    const { data: petsRaw } = await supabase.from('pets').select('*').in('owner_id', scope.ownerIds);
    const pets = await signPetPhotos(petsRaw || []);
    const petIds = pets.map(p => p.id);
    if (!petIds.length) return c.json({ owners: scope.owners, pets: [], appointments: [], bills: [], history: [], visits: [] });

    const [appts, bills, history, visits] = await Promise.all([
      supabase.from('appointments').select('*').in('pet_id', petIds).order('date', { ascending: false }),
      supabase.from('billing').select('*, items:billing_items(*)').in('pet_id', petIds).order('created_at', { ascending: false }),
      supabase.from('pet_history').select('*').in('pet_id', petIds).order('date', { ascending: false }),
      supabase.from('diagnoses').select('id, pet_id, date, weight, temperature, vaccination, dx, rx, follow_up_date').in('pet_id', petIds).order('date', { ascending: false }),
    ]);
    return c.json({
      owners: scope.owners, pets,
      appointments: appts.data || [], bills: bills.data || [],
      history: history.data || [], visits: visits.data || [],
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/make-server-b53d76e4/my/appointment-requests", async (c) => {
  try {
    const scope = await getOwnerScope(c);
    if (!scope) return c.json({ error: "Unauthorized" }, 401);
    const { pet_id, date, time, reason } = await c.req.json();
    if (!pet_id || !date || !time) throw new Error('Pet, date and time are required');
    if (date < phtDate(0)) throw new Error('Please choose a future date');
    const { data: pet } = await supabase.from('pets').select('id, owner_id').eq('id', pet_id).maybeSingle();
    if (!pet || !scope.ownerIds.includes(pet.owner_id)) return c.json({ error: "Pet not found" }, 404);
    const id = `appt:${Date.now()}`;
    const { error } = await supabase.from('appointments').insert({
      id, pet_id, date, time, reason: reason || 'Check-up', status: 'Requested',
      requested_by_owner: true, created_by: scope.user.id,
    });
    if (error) throw error;
    return c.json({ message: "Request sent", id });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/make-server-b53d76e4/my/appointment-requests/:id/cancel", async (c) => {
  try {
    const scope = await getOwnerScope(c);
    if (!scope) return c.json({ error: "Unauthorized" }, 401);
    const { data: appt } = await supabase.from('appointments').select('id, status, pets(owner_id)').eq('id', c.req.param('id')).maybeSingle();
    if (!appt || !scope.ownerIds.includes(appt.pets?.owner_id)) return c.json({ error: "Not found" }, 404);
    if (!['Requested', 'Scheduled'].includes(appt.status)) throw new Error('This appointment can no longer be cancelled online');
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
    if (error) throw error;
    return c.json({ message: "Cancelled" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ============== MIGRATION ============== //

app.post("/make-server-b53d76e4/migrate", async (c) => {
  try {
    const { data: raw } = await supabase.from('kv_store_b53d76e4').select('*');
    if (!raw) return c.json({ message: "Done" });

    for (const item of raw) {
      const { key, value: v } = item;
      if (key.startsWith('owner:')) await supabase.from('owners').upsert({ id: v.id, name: v.name, address: v.address, contact: v.contact, email: v.email });
      else if (key.startsWith('pet:')) await supabase.from('pets').upsert({
        id: v.id, owner_id: v.owner_id, pet_uid: v.pet_uid, name: v.name, type: v.type,
        birthday: v.birthday, breed: v.breed, color: v.color, sex: v.sex,
        weight: v.weight, temperature: v.temperature, neutering_date: v.neutering_date,
        microchip: v.microchip
      });
      else if (key.startsWith('diagnosis:')) await supabase.from('diagnoses').upsert({ id: v.id, pet_id: v.pet_id, vaccination: v.vaccination, date: v.date, weight: v.weight, temperature: v.temperature, test: v.test, dx: v.dx, rx: v.rx, remarks: v.remarks });
      else if (key.startsWith('inventory:')) await supabase.from('inventory').upsert({ id: v.id, name: v.name, quantity: v.quantity, price: v.price });
    }
    return c.json({ message: "Migration Success" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.notFound((c) => {
  console.log(`[404] ${c.req.method} ${c.req.url} - Path not matched`);
  return c.json({
    error: "Not Found",
    path: c.req.path,
    method: c.req.method,
  }, 404);
});

Deno.serve(app.fetch);
