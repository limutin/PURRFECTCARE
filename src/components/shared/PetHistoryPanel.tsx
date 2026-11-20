import React, { useEffect, useState } from 'react';
import { getFunctionUrl, publicAnonKey } from '../../utils/supabase/info';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Syringe, Plus, Pencil, Trash2, Loader2, ShieldCheck, AlertTriangle, MessageSquare, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PetHistoryPanelProps {
  accessToken: string;
  petId: string;
  /** Diagnoses for this pet; any with a vaccination value are listed as clinic visits. */
  diagnoses?: any[];
  readOnly?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  vaccination: 'Vaccination',
  deworming: 'Deworming',
  other: 'Other',
};

const emptyForm = () => ({
  type: 'vaccination',
  name: '',
  date: todayLocal(),
  next_due_date: '',
  source: '',
  notes: '',
});

export function PetHistoryPanel({ accessToken, petId, diagnoses = [], readOnly = false }: PetHistoryPanelProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState<'all' | 'vaccination' | 'deworming' | 'other'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const sendReminder = async (entry: any) => {
    setRemindingId(entry.key);
    try {
      const res = await fetch(getFunctionUrl(`/pet-history/${encodeURIComponent(entry.key)}/remind`), { method: 'POST', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast.success('Reminder SMS sent to the owner');
      fetchHistory();
    } catch (err: any) {
      toast.error('Reminder not sent: ' + err.message);
    } finally {
      setRemindingId(null);
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': publicAnonKey,
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(getFunctionUrl(`/pet-history?pet_id=${encodeURIComponent(petId)}`), { headers });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      const data = await res.json();
      setEntries(data.history || []);
      setUnavailable(false);
    } catch {
      setEntries([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [petId]);

  const openAdd = (type: string = 'vaccination') => {
    setEditing(null);
    setForm({ ...emptyForm(), type });
    setDialogOpen(true);
  };

  const openEdit = (entry: any) => {
    const v = entry.value;
    setEditing(entry);
    setForm({
      type: v.type || 'vaccination',
      name: v.name || '',
      date: v.date || todayLocal(),
      next_due_date: v.next_due_date || '',
      source: v.source || '',
      notes: v.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing
        ? getFunctionUrl(`/pet-history/${encodeURIComponent(editing.key)}`)
        : getFunctionUrl('/pet-history');
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ ...form, pet_id: petId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save');
      toast.success(editing ? 'History entry updated' : 'History entry added');
      setDialogOpen(false);
      fetchHistory();
    } catch (err: any) {
      toast.error('Could not save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: any) => {
    if (!confirm('Delete this history entry?')) return;
    setDeletingId(entry.key);
    try {
      const res = await fetch(getFunctionUrl(`/pet-history/${encodeURIComponent(entry.key)}`), { method: 'DELETE', headers });
      if (!res.ok) throw new Error();
      toast.success('Entry deleted');
      fetchHistory();
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  // Vaccinations recorded during clinic visits (diagnosis entries) are shown too, read-only.
  const visitRows = diagnoses
    .filter(d => d.value.vaccination && String(d.value.vaccination).trim())
    .map(d => ({
      key: `visit-${d.key}`,
      fromVisit: true,
      value: { type: 'vaccination', name: d.value.vaccination, date: d.value.date, source: 'This clinic (visit record)' },
    }));

  const rows = [...entries, ...visitRows]
    .filter(r => filter === 'all' || r.value.type === filter)
    .sort((a, b) => String(b.value.date || '').localeCompare(String(a.value.date || '')));

  const today = todayLocal();
  const dueStatus = (due?: string) => {
    if (!due) return null;
    if (due < today) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Overdue</Badge>;
    const days = (new Date(due).getTime() - new Date(today).getTime()) / 86400000;
    if (days <= 14) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Due soon</Badge>;
    return null;
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Syringe className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Vaccination &amp; Deworming History</CardTitle>
              <CardDescription>Includes records from previous clinics for transferred patients.</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="h-9 w-[150px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="vaccination">Vaccinations</SelectItem>
                <SelectItem value="deworming">Deworming</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {!readOnly && (
              <Button size="sm" className="h-9 font-bold" onClick={() => openAdd(filter === 'all' ? 'vaccination' : filter)} disabled={unavailable}>
                <Plus className="w-4 h-4 mr-1" /> Add Entry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {unavailable && (
          <div className="m-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            Medical history storage isn't set up on the server yet. Run <code>supabase_migration_feedback_v3.sql</code> and redeploy the edge function.
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Product / Details</TableHead>
                <TableHead className="font-bold">Next Due</TableHead>
                <TableHead className="font-bold">Given At</TableHead>
                {!readOnly && <TableHead className="text-right font-bold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-20 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No vaccination or deworming history recorded.</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.key}>
                  <TableCell className="font-semibold whitespace-nowrap">{formatDate(r.value.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.value.type === 'deworming' ? 'border-purple-300 text-purple-700' : r.value.type === 'vaccination' ? 'border-emerald-300 text-emerald-700' : ''}>
                      {r.value.type === 'vaccination' && <ShieldCheck className="w-3 h-3 mr-1" />}
                      {TYPE_LABELS[r.value.type] || r.value.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="font-medium">{r.value.name || '—'}</div>
                    {r.value.notes && <div className="text-xs text-muted-foreground truncate">{r.value.notes}</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {r.value.next_due_date ? formatDate(r.value.next_due_date) : '—'}
                      {dueStatus(r.value.next_due_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.value.source || 'This clinic'}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      {r.fromVisit ? (
                        <span className="text-[10px] uppercase text-muted-foreground">From visit</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          {r.value.next_due_date && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={r.value.reminder_sent ? 'Reminder already sent — send again' : 'Send due-date reminder SMS'}
                              className="h-8 w-8 hover:bg-teal-100 hover:text-teal-700"
                              onClick={() => sendReminder(r)}
                              disabled={remindingId === r.key}
                            >
                              {remindingId === r.key
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : r.value.reminder_sent ? <Check className="w-4 h-4 text-teal-600" /> : <MessageSquare className="w-4 h-4" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Edit" className="h-8 w-8 hover:bg-amber-100 hover:text-amber-600" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 hover:bg-red-100 hover:text-red-500" onClick={() => handleDelete(r)} disabled={deletingId === r.key}>
                            {deletingId === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit History Entry' : 'Add History Entry'}</DialogTitle>
            <DialogDescription>Record a vaccine, deworming or other treatment — including ones given at another clinic.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="deworming">Deworming</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date given *</Label>
                <Input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{form.type === 'vaccination' ? 'Vaccine' : form.type === 'deworming' ? 'Dewormer' : 'Treatment'} used</Label>
              <Input
                placeholder={form.type === 'vaccination' ? 'e.g. 5-in-1 (DHPPiL), Anti-rabies' : form.type === 'deworming' ? 'e.g. Pyrantel, Drontal' : 'e.g. Spay, Heartworm test'}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Next due</Label>
                <Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Given at</Label>
                <Input placeholder="This clinic / previous clinic name" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Batch no., dose, reactions..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Entry'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
