import React, { useEffect, useMemo, useState } from 'react';
import { api, peso } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import {
  Plus, Search, Pencil, Loader2, Tags, Stethoscope, Syringe, Scissors, FlaskConical, HeartPulse, BedDouble, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = ['Consultation', 'Preventive', 'Grooming', 'Laboratory', 'Surgery', 'Confinement', 'Other'];

const CATEGORY_STYLE: Record<string, { icon: any; cls: string }> = {
  Consultation: { icon: Stethoscope, cls: 'bg-teal-50 text-teal-700' },
  Preventive: { icon: Syringe, cls: 'bg-sky-50 text-sky-700' },
  Grooming: { icon: Scissors, cls: 'bg-pink-50 text-pink-700' },
  Laboratory: { icon: FlaskConical, cls: 'bg-violet-50 text-violet-700' },
  Surgery: { icon: HeartPulse, cls: 'bg-rose-50 text-rose-700' },
  Confinement: { icon: BedDouble, cls: 'bg-amber-50 text-amber-700' },
  Other: { icon: Sparkles, cls: 'bg-slate-100 text-slate-700' },
};

type Service = { id: string; name: string; category: string; price: number; active: boolean };

export function ServicesManager({ accessToken }: { accessToken: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Consultation');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api<{ services: Service[] }>('/services', accessToken);
      setServices(data.services || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = (cat?: string) => {
    setEditing(null);
    setName('');
    setCategory(cat || 'Consultation');
    setPrice('');
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setCategory(SERVICE_CATEGORIES.includes(s.category) ? s.category : 'Other');
    setPrice(String(s.price ?? ''));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const priceNum = Number(price);
    if (!trimmed) return toast.error('Service name is required');
    if (price === '' || isNaN(priceNum) || priceNum < 0) return toast.error('Enter a valid price');
    setSaving(true);
    try {
      if (editing) {
        await api(`/services/${encodeURIComponent(editing.id)}`, accessToken, {
          method: 'PUT',
          body: { name: trimmed, category, price: priceNum },
        });
        toast.success('Service updated');
      } else {
        await api('/services', accessToken, { method: 'POST', body: { name: trimmed, category, price: priceNum } });
        toast.success('Service added to the price list');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Service, active: boolean) => {
    setTogglingId(s.id);
    setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, active } : x)));
    try {
      await api(`/services/${encodeURIComponent(s.id)}`, accessToken, { method: 'PUT', body: { active } });
      toast.success(`${s.name} ${active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !active } : x)));
      toast.error(err?.message || 'Failed to update service');
    } finally {
      setTogglingId(null);
    }
  };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups: Record<string, Service[]> = {};
    for (const s of services) {
      if (q && !s.name.toLowerCase().includes(q) && !(s.category || '').toLowerCase().includes(q)) continue;
      const cat = SERVICE_CATEGORIES.includes(s.category) ? s.category : 'Other';
      (groups[cat] ||= []).push(s);
    }
    Object.values(groups).forEach((g) =>
      g.sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || a.name.localeCompare(b.name)),
    );
    return SERVICE_CATEGORIES.filter((c) => groups[c]?.length).map((c) => ({ category: c, items: groups[c] }));
  }, [services, search]);

  const activeCount = services.filter((s) => s.active !== false).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Services & Prices</h1>
          <p className="text-muted-foreground">The clinic's price list used when creating bills</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 h-11 px-6 font-bold shadow-lg shadow-primary/20 w-full sm:w-auto"
          onClick={() => openNew()}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Service
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-card">
        <CardHeader className="border-b bg-muted/20 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-primary" /> Price List
              </CardTitle>
              <CardDescription>
                {activeCount} active · {services.length - activeCount} inactive. Inactive services can't be added to new bills.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tags className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No services yet</p>
              <p className="text-sm mb-4">Add consultations, vaccinations, grooming and more.</p>
              <Button variant="outline" onClick={() => openNew()}>
                <Plus className="w-4 h-4 mr-1" /> Add the first service
              </Button>
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No services match "{search}"</p>
            </div>
          ) : (
            grouped.map((g) => {
              const style = CATEGORY_STYLE[g.category] || CATEGORY_STYLE.Other;
              const Icon = style.icon;
              return (
                <section key={g.category} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-bold">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.cls}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      {g.category}
                      <span className="text-xs font-semibold text-muted-foreground">({g.items.length})</span>
                    </h2>
                    <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => openNew(g.category)}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/10 hidden sm:table-header-group">
                        <TableRow>
                          <TableHead className="font-bold">Service</TableHead>
                          <TableHead className="font-bold text-right w-32">Price</TableHead>
                          <TableHead className="font-bold w-28">Active</TableHead>
                          <TableHead className="w-12"><span className="sr-only">Edit</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((s) => {
                          const active = s.active !== false;
                          return (
                            <TableRow key={s.id} className={active ? '' : 'bg-muted/30'}>
                              <TableCell className={`whitespace-normal ${active ? '' : 'opacity-50'}`}>
                                <div className="font-semibold">{s.name}</div>
                                {!active && <div className="text-xs text-muted-foreground">Inactive</div>}
                              </TableCell>
                              <TableCell className={`text-right font-bold tabular-nums whitespace-nowrap ${active ? 'text-primary' : 'opacity-50'}`}>
                                {peso(s.price)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={active}
                                    disabled={togglingId === s.id}
                                    onCheckedChange={(v: boolean) => toggleActive(s, v)}
                                    aria-label={`${active ? 'Deactivate' : 'Activate'} ${s.name}`}
                                  />
                                  <span className="hidden sm:inline text-xs text-muted-foreground">{active ? 'On' : 'Off'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => openEdit(s)}
                                  aria-label={`Edit ${s.name}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">{editing ? 'Edit service' : 'Add service'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Price changes apply to new bills only.' : 'Add a service to the clinic price list.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name" className="font-bold">Service name *</Label>
              <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anti-rabies vaccination" autoFocus />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price" className="font-bold">Price (₱) *</Label>
                <Input
                  id="svc-price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" className="bg-primary min-w-[120px]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Save changes' : 'Add service'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
