import React, { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Loader2, Stethoscope, Headset, Ban, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';

interface StaffManagerProps {
  accessToken: string;
  currentUserId?: string;
}

const ROLE_INFO: Record<string, { label: string; icon: any; pill: string; desc: string }> = {
  doctor: { label: 'Veterinarian', icon: Stethoscope, pill: 'bg-teal-50 text-teal-800', desc: 'Full access, including medical records, inventory and staff accounts.' },
  secretary: { label: 'Secretary', icon: Headset, pill: 'bg-sky-50 text-sky-700', desc: 'Front desk: owners & pets, appointments, billing, forms. Cannot edit diagnoses or inventory.' },
};

/** Doctor-only page to create clinic staff logins and change their roles. */
export function StaffManager({ accessToken, currentUserId }: StaffManagerProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'secretary' });

  const load = async () => {
    setLoading(true);
    try {
      setStaff((await api('/staff', accessToken)).staff || []);
    } catch (e: any) {
      toast.error('Could not load staff: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/staff', accessToken, { body: form });
      toast.success(`Account created for ${form.name}. Share the temporary password with them privately.`);
      setOpen(false);
      setForm({ name: '', email: '', password: '', role: 'secretary' });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: any, role: string) => {
    if (role === 'disabled' && !confirm(`Remove ${member.name}'s access to the clinic system?`)) return;
    setUpdatingId(member.id);
    try {
      await api(`/staff/${member.id}`, accessToken, { method: 'PUT', body: { role } });
      toast.success(role === 'disabled' ? `${member.name} can no longer sign in to the clinic portal` : `${member.name} is now a ${ROLE_INFO[role]?.label}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Staff Accounts</h1>
          <p className="text-muted-foreground">Create logins for veterinarians and front-desk staff</p>
        </div>
        <Button onClick={() => setOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Add staff</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {Object.entries(ROLE_INFO).map(([key, r]) => (
          <Card key={key}>
            <CardContent className="p-4 flex gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.pill}`}><r.icon className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-700" /> Clinic team</CardTitle>
          <CardDescription>Pet owners create their own accounts from the sign-in page; they only see their own pets.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : staff.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No staff accounts.</TableCell></TableRow>
              ) : staff.map(m => {
                const info = ROLE_INFO[m.role];
                const isMe = m.id === currentUserId;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold">{m.name || '—'}{isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell><span className={`vc-pill ${info?.pill || 'bg-muted'}`}>{info?.label || m.role}</span></TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{m.created_at ? formatDate(m.created_at) : '—'}</TableCell>
                    <TableCell className="text-right">
                      {isMe ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          {updatingId === m.id && <Loader2 className="w-4 h-4 animate-spin" />}
                          <Select value={m.role} onValueChange={v => changeRole(m, v)} disabled={updatingId === m.id}>
                            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="doctor">Veterinarian</SelectItem>
                              <SelectItem value="secretary">Secretary</SelectItem>
                              <SelectItem value="disabled"><span className="flex items-center gap-1.5 text-rose-600"><Ban className="w-3.5 h-3.5" /> Remove access</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a staff account</DialogTitle>
            <DialogDescription>They sign in with this email and the temporary password you set.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password *</Label>
              <div className="relative">
                <Input required minLength={8} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Show password">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="secretary">Secretary (front desk)</SelectItem>
                  <SelectItem value="doctor">Veterinarian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
