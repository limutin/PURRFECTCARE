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

// Helper to handle authentication
async function getAuthUser(c: Context) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// ============== AUTH ============== //

app.post("/make-server-b53d76e4/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, user_metadata: { name, role }, email_confirm: true
    });
    if (error) throw error;
    await supabase.from('user_profiles').upsert({ id: data.user.id, email, name, role });
    return c.json({ message: "Success", user: data.user });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

app.get("/make-server-b53d76e4/user", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
  return c.json({ user: data || user });
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
      id: ownerId, name: owner.name, address: owner.address, contact: owner.contact, created_by: user?.id
    });
    if (oErr) throw oErr;

    const { error: pErr } = await supabase.from('pets').insert({
      id: petId, owner_id: ownerId, pet_uid: petUid, name: pet.name, type: pet.type,
      birthday: pet.birthday, color: pet.color, sex: pet.sex, weight: pet.weight, temperature: pet.temperature
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
  return c.json({ pets: (data || []).map(p => ({ key: p.id, value: p })) });
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
      const meds = diagnosis.medications.map(m => ({
        diagnosis_id: id,
        inventory_id: m.inventory_id,
        quantity: m.quantity
      }));
      const { error: medError } = await supabase.from('diagnosis_medications').insert(meds);
      if (medError) console.error("Medication save error:", medError);
    }

    return c.json({ message: "Diagnosis saved successfully", id });
  } catch (e) {
    console.error("Diagnosis POST error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-b53d76e4/diagnoses", async (c) => {
  const { data } = await supabase.from('diagnoses').select('*, medications:diagnosis_medications(*, inventory(name))');
  const formatted = (data || []).map(d => ({
    key: d.id,
    value: {
      ...d,
      medications: (d.medications || []).map(m => ({
        ...m,
        name: m.inventory?.name || 'Unknown Item'
      }))
    }
  }));
  return c.json({ diagnoses: formatted });
});

app.delete("/make-server-b53d76e4/diagnoses/:id", async (c) => {
  const { error } = await supabase.from('diagnoses').delete().eq('id', c.req.param('id'));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: "Deleted" });
});

// ============== INVENTORY ============== //

app.post("/make-server-b53d76e4/inventory", async (c) => {
  try {
    const item = await c.req.json();
    const id = `inventory:${Date.now()}`;
    const { error } = await supabase.from('inventory').insert({
      id, name: item.name, category: item.category, quantity: item.quantity, price: item.price, expiry_date: item.expiry_date
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
      name: updates.name, category: updates.category, quantity: updates.quantity, price: updates.price, expiry_date: updates.expiry_date
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
async function sendSms(name, petName, time, number, type, reason) {
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

  const params = new URLSearchParams();
  params.append('apikey', 'bc9ba5a742210fa6a0ee9c8dda9a4009');
  params.append('number', number);
  params.append('message', message);
  params.append('sendername', 'PurrfectAC');

  const response = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  return response.ok;
}

// Logic to check if an appointment needs an SMS and send it
async function checkAndSendReminders(apptIds = []) {
  const query = supabase.from('appointments').select('*, pets(name, owners(name, contact))')
    .neq('status', 'completed').neq('status', 'cancelled');

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

app.post("/make-server-b53d76e4/cron/send-reminders", async (c) => {
  try {
    const sentCount = await checkAndSendReminders();
    return c.json({ message: "Reminders processed", sentCount });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});


app.post("/make-server-b53d76e4/appointments", async (c) => {
  const user = await getAuthUser(c);
  const appt = await c.req.json();
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
    const updates = await c.req.json();
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

    const number = appt.pets.owners.contact;

    const updateData = type === 'sameday' ? { sms_sameday_sent: true } : { sms_1d_sent: true };

    const ok = await sendSms(appt.pets.owners.name, appt.pets.name, appt.time, appt.pets.owners.contact, type, appt.reason);
    if (ok) {
      await supabase.from('appointments').update(updateData).eq('id', appointment_id);
      return c.json({ message: "SMS sent successfully" });
    } else {
      throw new Error(`Semaphore SMS Error`);
    }
  } catch (e: any) {
    console.error('Manual SMS Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ============== BILLING ============== //

app.post("/make-server-b53d76e4/billing", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bill:${Date.now()}`;

    let itemsTotal = 0;
    const billItems = [];

    if (body.items?.length) {
      const { data: inventory } = await supabase.from('inventory').select('id, name, price');
      for (const item of body.items) {
        const inv = inventory?.find(i => i.id === item.inventory_id);
        const price = inv ? parseFloat(inv.price || 0) : 0;
        const subtotal = price * (item.quantity || 0);
        itemsTotal += subtotal;
        billItems.push({
          bill_id: id,
          inventory_id: item.inventory_id,
          name: inv?.name || 'Unknown',
          quantity: item.quantity,
          unit_price: price,
          subtotal: subtotal
        });
      }
    }

    const total = parseFloat(body.consultation_fee || 0) + itemsTotal;

    const { error: bErr } = await supabase.from('billing').insert({
      id, pet_id: body.pet_id, diagnosis_id: body.diagnosis_id, consultation_fee: body.consultation_fee, total_cost: total, status: 'unpaid'
    });
    if (bErr) throw bErr;

    if (billItems.length > 0) {
      await supabase.from('billing_items').insert(billItems);
    }

    return c.json({ message: "Billed", id });
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

// ============== MIGRATION ============== //

app.post("/make-server-b53d76e4/migrate", async (c) => {
  try {
    const { data: raw } = await supabase.from('kv_store_b53d76e4').select('*');
    if (!raw) return c.json({ message: "Done" });

    for (const item of raw) {
      const { key, value: v } = item;
      if (key.startsWith('owner:')) await supabase.from('owners').upsert({ id: v.id, name: v.name, address: v.address, contact: v.contact });
      else if (key.startsWith('pet:')) await supabase.from('pets').upsert({ id: v.id, owner_id: v.owner_id, pet_uid: v.pet_uid, name: v.name, type: v.type, birthday: v.birthday, color: v.color, sex: v.sex, weight: v.weight, temperature: v.temperature });
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
