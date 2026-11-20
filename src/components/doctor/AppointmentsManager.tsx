import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, ApiError } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { PetAvatar } from '../shared/PetAvatar';
import {
  StatusPill, STATUS_META, normalizeStatus, isActive, fmtTime, parseLocalDate,
  startOfWeek, addDays, aptSortKey, AptStatus,
} from '../appointments/appointmentUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { Calendar } from '../ui/calendar';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import {
  Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, Bell, Loader2, MessageSquare, XCircle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, LogIn, Stethoscope, CheckCircle2, UserX,
  Check, X, Inbox, AlertTriangle, RotateCcw, Globe,
} from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentsManagerProps {
  accessToken: string;
}

type View = 'day' | 'week' | 'month';

interface PendingConflict {
  message: string;
  path: string;
  method: string;
  body: any;
  successMsg: string;
  afterSave?: () => void;
}

const DAY_START = 8;
const DAY_END = 18; // exclusive: last row is 17:00–18:00
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AppointmentsManager({ accessToken }: AppointmentsManagerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState<string | null>(null);
  const [smsTarget, setSmsTarget] = useState<{ ownerId: string; ownerName: string; contact: string; petName: string } | null>(null);
  const [smsText, setSmsText] = useState('');
  const [sendingCustom, setSendingCustom] = useState(false);
  const [petSearch, setPetSearch] = useState('');
  const [conflict, setConflict] = useState<PendingConflict | null>(null);
  const [forcing, setForcing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // View state
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [requestsOpen, setRequestsOpen] = useState(true);
  const requestsRef = useRef<HTMLDivElement>(null);

  // Form states
  const [petId, setPetId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsData, petsData, ownersData] = await Promise.all([
        api('/appointments', accessToken),
        api('/pets', accessToken),
        api('/owners', accessToken),
      ]);
      setAppointments(appointmentsData.appointments || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Lookups ----------
  const petById = useMemo(() => {
    const m = new Map<string, any>();
    pets.forEach(p => m.set(p.value.id, p));
    return m;
  }, [pets]);
  const ownerById = useMemo(() => {
    const m = new Map<string, any>();
    owners.forEach(o => m.set(o.value.id, o));
    return m;
  }, [owners]);
  const petOf = (apt: any) => petById.get(apt.value.pet_id);
  const ownerOf = (apt: any) => {
    const pet = petOf(apt);
    return pet ? ownerById.get(pet.value.owner_id) : undefined;
  };

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => aptSortKey(a).localeCompare(aptSortKey(b))),
    [appointments],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, any[]>();
    sorted.forEach(a => {
      const k = a.value.date || '';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    });
    return m;
  }, [sorted]);
  const forDate = (d: Date) => byDate.get(todayLocal(d)) || [];

  const today = todayLocal();
  const requests = sorted.filter(a => normalizeStatus(a.value.status) === 'Requested');

  // ---------- Saving (with double-booking handling) ----------
  /** Sends a POST/PUT; on a 409 conflict, opens the "Book anyway?" confirm instead of failing. */
  const sendAppointment = async (
    path: string, method: string, body: any, successMsg: string, afterSave?: () => void,
  ): Promise<boolean> => {
    try {
      await api(path, accessToken, { method, body });
      toast.success(successMsg);
      afterSave?.();
      fetchData();
      return true;
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409 && error.data?.conflict) {
        setConflict({ message: error.message, path, method, body, successMsg, afterSave });
        return false;
      }
      console.error('Error saving appointment:', error);
      toast.error(error?.message || 'Failed to save appointment');
      return false;
    }
  };

  const handleBookAnyway = async () => {
    if (!conflict) return;
    setForcing(true);
    const { path, method, body, successMsg, afterSave } = conflict;
    try {
      await api(path, accessToken, { method, body: { ...body, force: true } });
      toast.success(successMsg);
      afterSave?.();
      setConflict(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save appointment');
    } finally {
      setForcing(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) { toast.error('Please choose a pet'); return; }
    setSaving(true);
    const body: any = { pet_id: petId, date: appointmentDate, time: appointmentTime, frequency, reason };
    // New bookings start as Scheduled; edits keep their current status (not resent, so
    // check-in timestamps etc. are left untouched).
    if (!editingAppointment) body.status = 'Scheduled';
    await sendAppointment(
      editingAppointment ? `/appointments/${editingAppointment.key}` : '/appointments',
      editingAppointment ? 'PUT' : 'POST',
      body,
      editingAppointment ? 'Appointment updated!' : 'Appointment scheduled!',
      () => { setShowAddDialog(false); resetForm(); },
    );
    setSaving(false);
  };

  const handleUpdateStatus = async (apt: any, newStatus: AptStatus, successMsg?: string) => {
    setBusyKey(apt.key + newStatus);
    await sendAppointment(
      `/appointments/${apt.key}`, 'PUT', { status: newStatus },
      successMsg || `Marked as ${STATUS_META[newStatus].label}`,
    );
    setBusyKey(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/appointments/${deleteTarget.key}`, accessToken, { method: 'DELETE' });
      toast.success('Appointment deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete appointment');
    } finally {
      setDeleting(false);
    }
  };

  // ---------- SMS ----------
  const openMessageOwner = (owner: any, pet: any) => {
    if (!owner) { toast.error('Owner not found for this appointment'); return; }
    setSmsTarget({ ownerId: owner.value.id || owner.key, ownerName: owner.value.name, contact: owner.value.contact || '', petName: pet?.value.name || 'your pet' });
    setSmsText(`Hi ${owner.value.name}, this is PurrfectAC. `);
  };

  const handleSendCustomSms = async () => {
    if (!smsTarget || !smsText.trim()) return;
    setSendingCustom(true);
    try {
      await api('/send-custom-sms', accessToken, { method: 'POST', body: { owner_id: smsTarget.ownerId, message: smsText } });
      toast.success(`Message sent to ${smsTarget.ownerName}`);
      setSmsTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setSendingCustom(false);
    }
  };

  const handleSendManualSms = async (appointmentKey: string, type: '1d' | 'sameday') => {
    setSendingSms(appointmentKey + type);
    try {
      await api('/send-sms', accessToken, { method: 'POST', body: { appointment_id: appointmentKey, type } });
      toast.success(`SMS Reminder (${type === '1d' ? '1-Day' : 'Same-Day'}) sent successfully!`);
      fetchData();
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setSendingSms(null);
    }
  };

  // ---------- Form helpers ----------
  const startEdit = (apt: any) => {
    setEditingAppointment(apt);
    setPetId(apt.value.pet_id);
    setPetSearch('');
    setAppointmentDate(apt.value.date || '');
    setAppointmentTime(apt.value.time?.substring(0, 5) || '');
    setFrequency(apt.value.frequency || 'once');
    setReason(apt.value.reason || '');
    setShowAddDialog(true);
  };

  const openNew = (date?: string, time?: string) => {
    resetForm();
    setAppointmentDate(date || todayLocal(cursor));
    setAppointmentTime(time || '');
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setPetId('');
    setPetSearch('');
    setAppointmentDate('');
    setAppointmentTime('');
    setFrequency('once');
    setReason('');
    setEditingAppointment(null);
  };

  // ---------- Derived lists ----------
  const appointmentDates = appointments
    .filter(apt => apt.value.date && isActive(apt.value.status))
    .map(apt => parseLocalDate(apt.value.date));

  const upcomingAppointments = sorted.filter(apt => {
    const s = normalizeStatus(apt.value.status);
    return (apt.value.date || '') >= today && s !== 'completed' && isActive(s);
  });

  const todayCount = (byDate.get(today) || []).filter(a => isActive(a.value.status) && normalizeStatus(a.value.status) !== 'completed').length;

  // ---------- Navigation ----------
  const shift = (dir: -1 | 1) => {
    if (view === 'day') setCursor(addDays(cursor, dir));
    else if (view === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };
  const weekStart = startOfWeek(cursor);
  const rangeLabel = (() => {
    if (view === 'day') {
      return cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'week') {
      const end = addDays(weekStart, 6);
      const sameMonth = end.getMonth() === weekStart.getMonth();
      const a = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const b = end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
      return `${a} – ${b}, ${end.getFullYear()}`;
    }
    return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  // ---------- Render helpers ----------
  const actionButtons = (apt: any) => {
    const s = normalizeStatus(apt.value.status);
    const busy = (st: string) => busyKey === apt.key + st;
    const btn = (
      st: AptStatus, label: string, Icon: any, variant: 'default' | 'outline' | 'ghost' = 'outline', extra = '',
    ) => (
      <Button key={st + label} size="sm" variant={variant} className={`h-8 ${extra}`} disabled={!!busyKey}
        onClick={() => handleUpdateStatus(apt, st, `${petOf(apt)?.value.name || 'Appointment'}: ${label.toLowerCase()}`)}>
        {busy(st) ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
        {label}
      </Button>
    );
    const out: React.ReactNode[] = [];
    if (s === 'Requested') {
      out.push(btn('Scheduled', 'Approve', Check, 'default', 'bg-emerald-600 hover:bg-emerald-700 text-white'));
      out.push(btn('cancelled', 'Decline', X, 'outline', 'text-rose-700 hover:bg-rose-50'));
    } else if (s === 'Scheduled') {
      out.push(btn('Waiting', 'Check in', LogIn, 'default', 'bg-violet-600 hover:bg-violet-700 text-white'));
      out.push(btn('No-show', 'No-show', UserX, 'outline', 'text-rose-700 hover:bg-rose-50'));
      out.push(btn('cancelled', 'Cancel', XCircle, 'ghost', 'text-muted-foreground'));
    } else if (s === 'Waiting') {
      out.push(btn('In consult', 'Start consult', Stethoscope, 'default', 'bg-teal-600 hover:bg-teal-700 text-white'));
      out.push(btn('cancelled', 'Cancel', XCircle, 'ghost', 'text-muted-foreground'));
    } else if (s === 'In consult') {
      out.push(btn('completed', 'Complete', CheckCircle2, 'default', 'bg-emerald-600 hover:bg-emerald-700 text-white'));
    } else if (s === 'cancelled' || s === 'No-show') {
      out.push(btn('Scheduled', 'Reopen', RotateCcw, 'ghost', 'text-muted-foreground'));
    }
    return out;
  };

  const waitingSince = (apt: any) => {
    if (!apt.value.checked_in_at) return null;
    const t = new Date(apt.value.checked_in_at);
    if (isNaN(t.getTime())) return null;
    const mins = Math.max(0, Math.round((Date.now() - t.getTime()) / 60000));
    const at = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return normalizeStatus(apt.value.status) === 'Waiting' && apt.value.date === today
      ? `Checked in ${at} · waiting ${mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}`
      : `Checked in ${at}`;
  };

  /** Full appointment card used in the Day and Month views. */
  const renderCard = (apt: any, opts: { showDate?: boolean } = {}) => {
    const pet = petOf(apt);
    const owner = ownerOf(apt);
    const s = normalizeStatus(apt.value.status);
    const dim = s === 'cancelled' || s === 'No-show' || s === 'completed';
    const checkedIn = waitingSince(apt);
    return (
      <div
        key={apt.key}
        className={`rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md ${dim ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start gap-3">
          <PetAvatar type={pet?.value.type} photoUrl={pet?.value.photo_url} name={pet?.value.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className="font-semibold text-foreground truncate">{pet?.value.name || 'Unknown pet'}</h4>
              <StatusPill status={apt.value.status} />
              {apt.value.requested_by_owner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                  <Globe className="w-3 h-3" /> Online
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {owner?.value.name || 'Unknown owner'}
              {pet?.value.type ? ` · ${pet.value.type}` : ''}
              {pet?.value.breed ? ` · ${pet.value.breed}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {opts.showDate && (
                <span className="inline-flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{formatDate(apt.value.date)}</span>
              )}
              <span className="inline-flex items-center gap-1 font-medium text-foreground"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{fmtTime(apt.value.time)}</span>
              {apt.value.frequency && apt.value.frequency !== 'once' && (
                <Badge variant="outline" className="text-[10px] h-5">Repeats: {apt.value.frequency}</Badge>
              )}
            </div>
            {apt.value.reason && <p className="mt-1 text-sm text-foreground/80">{apt.value.reason}</p>}
            {checkedIn && <p className="mt-1 text-xs font-medium text-violet-700">{checkedIn}</p>}
            {(apt.value.sms_1d_sent || apt.value.sms_sameday_sent) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {apt.value.sms_1d_sent && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <MessageSquare className="w-3 h-3" /> 1-day reminder sent
                  </span>
                )}
                {apt.value.sms_sameday_sent && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <MessageSquare className="w-3 h-3" /> Same-day reminder sent
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 -mr-1 -mt-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Message owner" onClick={() => openMessageOwner(owner, pet)}>
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => startEdit(apt)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete" onClick={() => setDeleteTarget(apt)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {actionButtons(apt)}
          {s === 'Scheduled' && (
            <>
              <span className="hidden sm:block h-5 w-px bg-border mx-1" />
              <Button size="sm" variant="outline" className="h-8" onClick={() => handleSendManualSms(apt.key, '1d')} disabled={sendingSms === apt.key + '1d'}>
                {sendingSms === apt.key + '1d' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                {apt.value.sms_1d_sent ? 'Resend 1D' : 'Send 1D'}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => handleSendManualSms(apt.key, 'sameday')} disabled={sendingSms === apt.key + 'sameday'}>
                {sendingSms === apt.key + 'sameday' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                {apt.value.sms_sameday_sent ? 'Resend Same-Day' : 'Send Same-Day'}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const list = forDate(cursor);
    const dateStr = todayLocal(cursor);
    const hourOf = (a: any) => (a.value.time ? Number(String(a.value.time).split(':')[0]) : NaN);
    const early = list.filter(a => !isNaN(hourOf(a)) && hourOf(a) < DAY_START);
    const late = list.filter(a => !isNaN(hourOf(a)) && hourOf(a) >= DAY_END);
    const noTime = list.filter(a => isNaN(hourOf(a)));
    const counts = (st: AptStatus) => list.filter(a => normalizeStatus(a.value.status) === st).length;
    const stats: { st: AptStatus; label: string }[] = [
      { st: 'Scheduled', label: 'Expected' },
      { st: 'Waiting', label: 'Waiting' },
      { st: 'In consult', label: 'In consult' },
      { st: 'completed', label: 'Done' },
    ];
    const nowHour = new Date().getHours();
    const isToday = dateStr === today;

    const row = (label: string, items: any[], key: string, slotTime?: string, highlight = false) => (
      <div key={key} className={`grid grid-cols-[3.5rem_1fr] sm:grid-cols-[4.5rem_1fr] border-t border-border first:border-t-0 ${highlight ? 'bg-primary/5' : ''}`}>
        <div className={`pt-3 pr-2 text-right text-xs font-medium ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>{label}</div>
        <div className="py-2 pl-2 sm:pl-3 border-l border-border min-h-[3.25rem] space-y-2">
          {items.length > 0 ? items.map(a => renderCard(a)) : slotTime ? (
            <button
              type="button"
              onClick={() => openNew(dateStr, slotTime)}
              className="w-full h-9 rounded-lg border border-dashed border-transparent text-left px-3 text-xs text-muted-foreground/0 hover:border-border hover:text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              + Book {fmtTime(slotTime)}
            </button>
          ) : null}
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map(({ st, label }) => (
            <div key={st} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[st].dot}`} />{label}
              </div>
              <div className="text-xl font-semibold text-foreground">{counts(st)}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          {noTime.length > 0 && row('No time', noTime, 'notime')}
          {early.length > 0 && row('Early', early, 'early')}
          {Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i).map(h =>
            row(
              fmtTime(`${h}:00`).replace(':00', ''),
              list.filter(a => hourOf(a) === h),
              `h${h}`,
              `${String(h).padStart(2, '0')}:00`,
              isToday && h === nowHour,
            ),
          )}
          {late.length > 0 && row('Late', late, 'late')}
        </div>
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No appointments on this day. Click an hour to book one.</p>
        )}
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="-mx-4 sm:mx-0 overflow-x-auto">
      <div className="grid grid-cols-7 gap-2 min-w-[760px] px-4 sm:px-0">
        {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d, i) => {
          const ds = todayLocal(d);
          const list = forDate(d);
          const isToday = ds === today;
          return (
            <div key={ds} className={`flex flex-col rounded-xl border min-h-[16rem] ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'}`}>
              <button
                type="button"
                onClick={() => { setCursor(d); setView('day'); }}
                className="flex items-baseline justify-between px-2.5 py-2 border-b border-border text-left hover:bg-muted/50 rounded-t-xl"
                title="Open day view"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{WEEKDAYS[i]}</span>
                <span className={`text-sm font-semibold ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {d.getDate()}
                </span>
              </button>
              <div className="flex-1 space-y-1.5 p-1.5">
                {list.map(a => {
                  const pet = petOf(a);
                  const s = normalizeStatus(a.value.status);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => startEdit(a)}
                      className={`w-full rounded-md border-l-[3px] px-2 py-1.5 text-left transition-colors ${STATUS_META[s].chip}`}
                      title={`${pet?.value.name || 'Pet'} · ${STATUS_META[s].label}${a.value.reason ? ` · ${a.value.reason}` : ''}`}
                    >
                      <div className="text-[11px] font-medium text-muted-foreground">{fmtTime(a.value.time)}</div>
                      <div className={`text-xs font-semibold text-foreground truncate ${s === 'cancelled' ? 'line-through' : ''}`}>{pet?.value.name || 'Unknown pet'}</div>
                      {a.value.reason && <div className="text-[11px] text-muted-foreground truncate">{a.value.reason}</div>}
                    </button>
                  );
                })}
                {list.length === 0 && (
                  <button type="button" onClick={() => openNew(ds)} className="w-full py-6 text-center text-xs text-muted-foreground/60 hover:text-muted-foreground">
                    + Book
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const list = forDate(cursor);
    return (
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        <div>
          <Calendar
            mode="single"
            selected={cursor}
            onSelect={(d: Date | undefined) => d && setCursor(d)}
            month={cursor}
            onMonthChange={(m: Date) => setCursor(m)}
            modifiers={{ hasAppointment: appointmentDates }}
            modifiersClassNames={{ hasAppointment: 'vc-day-has-appt' }}
            className="rounded-md border mx-auto md:mx-0 w-fit"
          />
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Has appointment(s)
          </div>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{formatDate(cursor)}</h3>
          {list.length > 0 ? list.map(a => renderCard(a)) : (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No appointments for this date
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => openNew(todayLocal(cursor))}><Plus className="w-4 h-4 mr-1" />Book</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedPet = petId ? petById.get(petId) : undefined;
  const selectedOwner = selectedPet ? ownerById.get(selectedPet.value.owner_id) : undefined;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Appointments</h1>
          <p className="text-muted-foreground">Today's flow, the week ahead, and owner requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={`relative ${requests.length ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : ''}`}
            onClick={() => { setRequestsOpen(true); requestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            disabled={requests.length === 0}
          >
            <Inbox className="w-4 h-4 mr-2" />
            Requests
            <span className={`ml-2 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-semibold ${requests.length ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {requests.length}
            </span>
          </Button>
          <Button variant="outline" className="relative" title={`${todayCount} active appointment(s) today`}
            onClick={() => { setView('day'); setCursor(new Date()); }}>
            <Bell className="w-4 h-4" />
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {todayCount}
              </span>
            )}
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
      </div>

      {/* Owner requests */}
      {requests.length > 0 && (
        <div ref={requestsRef} className="rounded-xl border border-amber-200 bg-amber-50/60 scroll-mt-4">
          <button type="button" onClick={() => setRequestsOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-900">Appointment requests</span>
              <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-semibold">{requests.length}</span>
              <span className="hidden sm:inline text-sm text-amber-800/80">from pet owners, awaiting approval</span>
            </div>
            {requestsOpen ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
          </button>
          {requestsOpen && (
            <div className="px-3 pb-3 grid gap-2 md:grid-cols-2">
              {requests.map(apt => {
                const pet = petOf(apt);
                const owner = ownerOf(apt);
                return (
                  <div key={apt.key} className="rounded-lg bg-white/90 border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <PetAvatar type={pet?.value.type} photoUrl={pet?.value.photo_url} name={pet?.value.name} size={40} />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{pet?.value.name || 'Unknown pet'}</div>
                        <div className="text-xs text-muted-foreground truncate">{owner?.value.name || 'Unknown owner'}{owner?.value.contact ? ` · ${owner.value.contact}` : ''}</div>
                        <div className="text-sm text-foreground mt-0.5">
                          {formatDate(apt.value.date)} · {fmtTime(apt.value.time)}
                        </div>
                        {apt.value.reason && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{apt.value.reason}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!!busyKey}
                        onClick={() => handleUpdateStatus(apt, 'Scheduled', `Approved ${pet?.value.name || 'request'}`)}>
                        {busyKey === apt.key + 'Scheduled' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-rose-700 hover:bg-rose-50" disabled={!!busyKey}
                        onClick={() => handleUpdateStatus(apt, 'cancelled', `Declined ${pet?.value.name || 'request'}`)}>
                        {busyKey === apt.key + 'cancelled' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}Decline
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit / reschedule" onClick={() => startEdit(apt)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        {/* Main schedule */}
        <Card className="min-w-0">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Calendar view">
                {(['day', 'week', 'month'] as View[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setCursor(new Date())}>Today</Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <CardTitle className="text-base sm:text-lg">{rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-xl flex gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-3 w-[100px]" />
                      <Skeleton className="h-3 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'day' ? renderDayView() : view === 'week' ? renderWeekView() : renderMonthView()}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Upcoming
              </CardTitle>
              <CardDescription>Next 5 appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingAppointments.slice(0, 5).map(apt => {
                  const pet = petOf(apt);
                  return (
                    <button
                      key={apt.key}
                      type="button"
                      onClick={() => { setCursor(parseLocalDate(apt.value.date)); setView('day'); }}
                      className="w-full flex items-center gap-3 text-left text-sm p-2 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <PetAvatar type={pet?.value.type} photoUrl={pet?.value.photo_url} name={pet?.value.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{pet?.value.name || 'Pet'}</div>
                        <div className="text-xs text-muted-foreground">
                          {apt.value.date === today ? 'Today' : formatDate(apt.value.date)} · {fmtTime(apt.value.time)}
                        </div>
                      </div>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_META[normalizeStatus(apt.value.status)].dot}`} />
                    </button>
                  );
                })}
                {upcomingAppointments.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center">No upcoming appointments</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status guide</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_META) as AptStatus[]).map(s => <StatusPill key={s} status={s} />)}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open: boolean) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
            <DialogDescription>
              {editingAppointment ? 'Update appointment details' : 'Create a new appointment for a pet'}
            </DialogDescription>
          </DialogHeader>
          {editingAppointment && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Current status</span>
              <StatusPill status={editingAppointment.value.status} />
            </div>
          )}
          <form onSubmit={handleAddOrUpdate} className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="pet">Pet *</Label>
              <div className="relative">
                <Input
                  id="pet"
                  placeholder="Search by pet or owner name..."
                  value={petSearch || (selectedPet ? selectedPet.value.name : '')}
                  onChange={(e) => {
                    setPetSearch(e.target.value);
                    if (petId) setPetId('');
                  }}
                  autoComplete="off"
                  className="bg-background"
                  required={!petId}
                />
                {petSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-[220px] overflow-y-auto">
                    {pets
                      .filter(pet => {
                        const owner = ownerById.get(pet.value.owner_id);
                        const s = petSearch.toLowerCase();
                        return String(pet.value.name || '').toLowerCase().includes(s) ||
                          String(owner?.value.name || '').toLowerCase().includes(s);
                      })
                      .map((pet) => {
                        const owner = ownerById.get(pet.value.owner_id);
                        return (
                          <div
                            key={pet.key}
                            onClick={() => { setPetId(pet.value.id); setPetSearch(''); }}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-muted last:border-0 hover:bg-primary/5 transition-colors"
                          >
                            <PetAvatar type={pet.value.type} photoUrl={pet.value.photo_url} name={pet.value.name} size={28} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm truncate">{pet.value.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase truncate">
                                Owner: {owner?.value.name || 'N/A'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              {selectedPet && !petSearch && (
                <div className="flex items-center gap-2 mt-1">
                  <PetAvatar type={selectedPet.value.type} photoUrl={selectedPet.value.photo_url} name={selectedPet.value.name} size={24} />
                  <p className="text-xs text-primary font-medium">
                    {selectedPet.value.name} (Owner: {selectedOwner?.value.name || 'N/A'})
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input id="time" type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="3months">Every 3 Months</SelectItem>
                  <SelectItem value="6months">Every 6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="e.g., Vaccination, Check-up" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            <div className="flex justify-between gap-3">
              {editingAppointment ? (
                <Button type="button" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => { setDeleteTarget(editingAppointment); }}>
                  <Trash2 className="w-4 h-4 mr-1" />Delete
                </Button>
              ) : <span />}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAppointment ? 'Update' : 'Schedule'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Double-booking confirm */}
      <AlertDialog open={!!conflict} onOpenChange={(o: boolean) => { if (!o && !forcing) setConflict(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Possible double-booking
            </AlertDialogTitle>
            <AlertDialogDescription>
              {conflict?.message || 'Another appointment is booked within 30 minutes of this time.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={forcing}>Choose another time</AlertDialogCancel>
            <AlertDialogAction
              disabled={forcing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={(e: React.MouseEvent) => { e.preventDefault(); handleBookAnyway(); }}
            >
              {forcing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Book anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o: boolean) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${petOf(deleteTarget)?.value.name || 'This pet'} on ${formatDate(deleteTarget.value.date)} at ${fmtTime(deleteTarget.value.time)} will be removed permanently. To keep a record, use Cancel or No-show instead.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async (e: React.MouseEvent) => {
                e.preventDefault();
                const wasEditing = editingAppointment && deleteTarget && editingAppointment.key === deleteTarget.key;
                await handleDelete();
                if (wasEditing) { setShowAddDialog(false); resetForm(); }
              }}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message owner */}
      <Dialog open={!!smsTarget} onOpenChange={(o: boolean) => !o && setSmsTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Message Owner</DialogTitle>
            <DialogDescription>
              SMS to {smsTarget?.ownerName} ({smsTarget?.contact || 'no number on file'}) about {smsTarget?.petName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea rows={5} value={smsText} maxLength={480} onChange={e => setSmsText(e.target.value)} placeholder="Type your message..." />
            <div className="text-xs text-muted-foreground text-right">{smsText.length}/480 · {Math.max(1, Math.ceil(smsText.length / 160))} SMS credit(s)</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSmsTarget(null)} disabled={sendingCustom}>Cancel</Button>
            <Button onClick={handleSendCustomSms} disabled={sendingCustom || !smsText.trim() || !smsTarget?.contact}>
              {sendingCustom ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />} Send SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
