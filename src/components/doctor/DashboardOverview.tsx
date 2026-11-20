import React, { useEffect, useState } from 'react';
import {
  PawPrint, CalendarHeart, Syringe, Pill, Wallet, ChevronRight, Clock, AlertTriangle, PlusCircle, Stethoscope, Receipt,
} from 'lucide-react';
import { api, peso } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { PetAvatar } from '../shared/PetAvatar';
import { usePatientNav } from '../shared/PatientNav';
import { greeting } from '../shared/ClinicShell';

interface DashboardOverviewProps {
  accessToken: string;
  user?: any;
  onNavigate?: (tab: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  Requested: 'bg-amber-50 text-amber-800',
  Scheduled: 'bg-sky-50 text-sky-700',
  Waiting: 'bg-violet-50 text-violet-700',
  'In consult': 'bg-teal-50 text-teal-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  'No-show': 'bg-rose-50 text-rose-600',
};

export function DashboardOverview({ accessToken, user, onNavigate }: DashboardOverviewProps) {
  const nav = usePatientNav();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [due, setDue] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, o, a, i, b] = await Promise.all([
          api('/pets', accessToken), api('/owners', accessToken), api('/appointments', accessToken),
          api('/inventory', accessToken), api('/billing', accessToken),
        ]);
        setPets(p.pets || []); setOwners(o.owners || []); setAppointments(a.appointments || []);
        setInventory(i.inventory || []); setBills(b.bills || []);
      } catch { /* cards show zeros */ }
      try { setDue((await api('/due-soon?days=14', accessToken)).due || []); } catch { setDue([]); }
      setLoading(false);
    })();
  }, []);

  const today = todayLocal();
  const petOf = (id: string) => pets.find(p => p.value.id === id || p.key === id)?.value;
  const ownerOf = (pet: any) => owners.find(o => o.value.id === pet?.owner_id || o.key === pet?.owner_id)?.value;

  const todays = appointments
    .map(a => a.value)
    .filter(a => a.date === today && !['cancelled', 'Cancelled'].includes(a.status))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const requests = appointments.filter(a => a.value.status === 'Requested').length;
  const lowStock = inventory.map(i => i.value).filter(i => Number(i.quantity) <= Number(i.reorder_level ?? 5))
    .sort((a, b) => a.quantity - b.quantity);
  const unpaid = bills.map(b => b.value).filter(b => b.status !== 'paid');
  const unpaidTotal = unpaid.reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const waiting = todays.filter(a => a.status === 'Waiting').length;

  const firstName = (user?.name || '').split(' ')[0];
  const title = user?.role === 'doctor' ? `Dr. ${firstName}` : firstName;

  const stats = [
    { label: "Today's appointments", value: todays.length, sub: waiting ? `${waiting} waiting now` : requests ? `${requests} online request${requests > 1 ? 's' : ''}` : 'Scheduled today', icon: CalendarHeart, tone: 'bg-sky-50 text-sky-700', tab: 'appointments' },
    { label: 'Vaccines & deworming due', value: due.length, sub: 'Next 14 days & overdue', icon: Syringe, tone: 'bg-teal-50 text-teal-700', tab: undefined },
    { label: 'Low stock items', value: lowStock.length, sub: 'At or below reorder level', icon: Pill, tone: 'bg-amber-50 text-amber-700', tab: 'inventory' },
    { label: 'Unpaid bills', value: unpaid.length, sub: peso(unpaidTotal) + ' outstanding', icon: Wallet, tone: 'bg-rose-50 text-rose-600', tab: 'billing' },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <div className="grid lg:grid-cols-3 gap-4"><Skeleton className="h-72 lg:col-span-2 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="vc-welcome">
        <p className="text-teal-100 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h2 className="text-2xl md:text-[1.7rem] font-extrabold mt-1">{greeting()}{title ? `, ${title}` : ''} 🐾</h2>
        <p className="text-teal-50/90 text-sm mt-1 max-w-xl">
          {todays.length
            ? `You have ${todays.length} patient${todays.length > 1 ? 's' : ''} booked today${waiting ? ` — ${waiting} already waiting` : ''}.`
            : 'No patients booked for today yet.'}
          {' '}{pets.length} pets in your care.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className={s.tab ? 'cursor-pointer' : ''} onClick={() => s.tab && onNavigate?.(s.tab)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs md:text-sm text-muted-foreground font-medium">{s.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.tone}`}><s.icon className="w-[18px] h-[18px]" /></div>
              </div>
              <p className="text-3xl font-extrabold text-foreground mt-1 vc-display">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's patients */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><PawPrint className="w-4 h-4 text-teal-700" /> Today's patients</CardTitle>
              <CardDescription>{formatDate(today)}</CardDescription>
            </div>
            <button onClick={() => onNavigate?.('appointments')} className="text-sm font-semibold text-primary hover:underline flex items-center">
              Schedule <ChevronRight className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            {todays.length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2"><CalendarHeart className="w-6 h-6" /></div>
                <p className="text-sm text-muted-foreground">No appointments today.</p>
              </div>
            )}
            {todays.map(a => {
              const pet = petOf(a.pet_id);
              const owner = ownerOf(pet);
              return (
                <button
                  key={a.id}
                  onClick={() => pet && nav?.openPatient(pet.id)}
                  className="w-full flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
                >
                  <div className="w-14 text-center shrink-0">
                    <p className="text-sm font-bold text-foreground vc-display">{String(a.time || '').slice(0, 5)}</p>
                  </div>
                  <PetAvatar type={pet?.type} photoUrl={pet?.photo_url} name={pet?.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{pet?.name || 'Unknown pet'} <span className="font-normal text-muted-foreground">· {owner?.name || '—'}</span></p>
                    <p className="text-xs text-muted-foreground truncate">{a.reason || 'Check-up'}</p>
                  </div>
                  <span className={`vc-pill ${STATUS_STYLE[a.status] || 'bg-sky-50 text-sky-700'}`}>{a.status === 'completed' ? 'Done' : a.status}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Vaccines due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Syringe className="w-4 h-4 text-teal-700" /> Vaccines &amp; deworming due</CardTitle>
            <CardDescription>Owners get an SMS reminder 3 days before</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {due.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing due in the next 2 weeks.</p>}
            {due.slice(0, 7).map(d => {
              const pet = petOf(d.pet_id);
              const overdue = d.next_due_date < today;
              return (
                <button key={d.id} onClick={() => pet && nav?.openPatient(pet.id)} className="w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
                  <PetAvatar type={pet?.type} photoUrl={pet?.photo_url} name={pet?.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{pet?.name || 'Pet'}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.type === 'deworming' ? 'Deworming' : d.type === 'vaccination' ? 'Vaccine' : 'Treatment'}{d.name ? ` · ${d.name}` : ''}</p>
                  </div>
                  <span className={`vc-pill ${overdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-800'}`}>
                    {overdue ? 'Overdue' : formatDate(d.next_due_date).replace(/, \d{4}$/, '')}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Low stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Reorder soon</CardTitle>
            <button onClick={() => onNavigate?.('inventory')} className="text-sm font-semibold text-primary hover:underline">Inventory</button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {lowStock.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">All stock levels look fine.</p>}
            {lowStock.slice(0, 6).map(i => (
              <div key={i.id} className="flex items-center justify-between text-sm py-1">
                <span className="truncate pr-2">{i.name}</span>
                <span className={`vc-pill ${Number(i.quantity) <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-800'}`}>{i.quantity} left</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: PlusCircle, title: 'Register a pet', desc: 'New owner and patient', tab: 'clients' },
              { icon: Stethoscope, title: 'Record a visit', desc: 'Diagnosis, vitals, medicines', tab: 'diagnosis' },
              { icon: Receipt, title: 'Create a bill', desc: 'Services and products', tab: 'billing' },
            ].map(q => (
              <button key={q.title} onClick={() => onNavigate?.(q.tab)} className="flex items-start gap-3 rounded-xl border p-3 text-left hover:border-teal-300 hover:bg-teal-50/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><q.icon className="w-[18px] h-[18px]" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{q.desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
