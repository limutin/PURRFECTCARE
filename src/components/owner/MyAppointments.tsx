import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Plus, CalendarX, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { PetAvatar } from '../shared/PetAvatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  OwnerOverview, OwnerAppointment, Panel, PageHeader, EmptyState, StatusPill, formatTime, isCancellable,
  isClosedStatus, ymd, CLINIC_PHONE,
} from './ownerShared';

interface MyAppointmentsProps {
  data: OwnerOverview;
  accessToken: string;
  onChanged: () => Promise<void> | void;
}

const sortKey = (a: OwnerAppointment) => `${ymd(a.date)} ${a.time || ''}`;

export function MyAppointments({ data, accessToken, onChanged }: MyAppointmentsProps) {
  const today = todayLocal();
  const petById = useMemo(() => new Map(data.pets.map((p) => [p.id, p])), [data.pets]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OwnerAppointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const upcoming = data.appointments
    .filter((a) => ymd(a.date) >= today && !isClosedStatus(a.status))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = data.appointments
    .filter((a) => !(ymd(a.date) >= today && !isClosedStatus(a.status)))
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(`/my/appointment-requests/${cancelTarget.id}/cancel`, accessToken, { method: 'POST' });
      toast.success('Appointment cancelled');
      setCancelTarget(null);
      await onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Could not cancel the appointment');
    } finally {
      setCancelling(false);
    }
  };

  const row = (a: OwnerAppointment, isPast: boolean) => {
    const pet = petById.get(a.pet_id);
    return (
      <li key={a.id} className={`flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 ${isPast ? 'opacity-80' : ''}`}>
        <PetAvatar type={pet?.type || undefined} photoUrl={pet?.photo_url} name={pet?.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">{pet?.name || 'Your pet'}</span>
            <StatusPill status={a.status} />
          </div>
          {a.reason && <p className="text-sm text-gray-600 mt-0.5 break-words">{a.reason}</p>}
          <p className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(ymd(a.date))}</span>
            {a.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(a.time)}</span>}
          </p>
        </div>
        {!isPast && isCancellable(a) && (
          <Button variant="outline" size="sm" className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setCancelTarget(a)}>
            Cancel
          </Button>
        )}
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Request a visit and keep track of upcoming and past appointments"
        action={
          data.pets.length > 0 && (
            <Button onClick={() => setRequestOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto">
              <Plus className="w-4 h-4 mr-1.5" /> Request appointment
            </Button>
          )
        }
      />

      <div className="space-y-5">
        <Panel className="p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming</h3>
          {upcoming.length === 0 ? (
            <EmptyState icon={Calendar} title="No upcoming appointments" text="Need a check-up, vaccine or grooming? Send a request and the clinic will confirm a schedule." />
          ) : (
            <ul className="space-y-2">{upcoming.map((a) => row(a, false))}</ul>
          )}
          {upcoming.some((a) => ['requested', 'pending'].includes((a.status || '').toLowerCase())) && (
            <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Requests marked "Awaiting confirmation" still need to be approved by the clinic. For urgent concerns, call {CLINIC_PHONE}.
            </p>
          )}
        </Panel>

        <Panel className="p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Past & cancelled</h3>
          {past.length === 0 ? (
            <EmptyState icon={CalendarX} title="No past appointments" />
          ) : (
            <ul className="space-y-2">{past.map((a) => row(a, true))}</ul>
          )}
        </Panel>
      </div>

      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        data={data}
        accessToken={accessToken}
        onCreated={onChanged}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && !cancelling && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  {petById.get(cancelTarget.pet_id)?.name || 'Your pet'} on {formatDate(ymd(cancelTarget.date))}
                  {cancelTarget.time ? ` at ${formatTime(cancelTarget.time)}` : ''}. The clinic will be notified.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmCancel(); }}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestDialog({
  open, onOpenChange, data, accessToken, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: OwnerOverview;
  accessToken: string;
  onCreated: () => Promise<void> | void;
}) {
  const today = todayLocal();
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPetId(data.pets.length === 1 ? data.pets[0].id : '');
    setDate('');
    setTime('09:00');
    setReason('');
  };

  const handleOpenChange = (o: boolean) => {
    if (o) reset();
    if (!saving) onOpenChange(o);
  };

  // Reset when opened programmatically
  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) return toast.error('Please choose a pet');
    if (!date || date < today) return toast.error('Please choose today or a future date');
    if (!/^\d{2}:\d{2}$/.test(time)) return toast.error('Please choose a time');
    if (!reason.trim()) return toast.error('Please tell us the reason for the visit');
    setSaving(true);
    try {
      await api('/my/appointment-requests', accessToken, {
        method: 'POST',
        body: { pet_id: petId, date, time, reason: reason.trim() },
      });
      toast.success('Request sent! The clinic will confirm your appointment.');
      onOpenChange(false);
      await onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send your request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request an appointment</DialogTitle>
          <DialogDescription>
            Pick your preferred schedule. The clinic will review and confirm it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-pet">Pet</Label>
            <select
              id="req-pet"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-base md:text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              required
            >
              <option value="" disabled>Select a pet</option>
              {data.pets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.type ? ` (${p.type})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-date">Date</Label>
              <Input id="req-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-time">Time</Label>
              <Input id="req-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-reason">Reason for visit</Label>
            <Textarea
              id="req-reason"
              rows={3}
              maxLength={500}
              placeholder="e.g. Annual vaccine, check-up, skin itching..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
