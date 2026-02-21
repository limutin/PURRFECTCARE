import React, { useState, useEffect } from 'react';
import { getFunctionUrl, publicAnonKey } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import {
  Plus, FileText, Printer, Search, Eye, Trash2, Scale,
  Thermometer, ShieldCheck, Beaker, MessageSquare, Loader2,
  Calendar as CalendarIcon, Pill, Trash, PawPrint, User, ArrowLeft, History
} from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosisManagerProps {
  accessToken: string;
}

export function DiagnosisManager({ accessToken }: DiagnosisManagerProps) {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDiagnosis, setViewingDiagnosis] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);


  // Form states
  const [petId, setPetId] = useState('');
  const [vaccination, setVaccination] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [test, setTest] = useState('');
  const [dx, setDx] = useState('');
  const [rx, setRx] = useState('');
  const [remarks, setRemarks] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedMeds, setSelectedMeds] = useState<any[]>([]);
  const [medId, setMedId] = useState('');
  const [medQty, setMedQty] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [diagnosesRes, petsRes, ownersRes, inventoryRes] = await Promise.all([
        fetch(getFunctionUrl('/diagnoses'), { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(getFunctionUrl('/pets'), { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(getFunctionUrl('/owners'), { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(getFunctionUrl('/inventory'), { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      ]);

      if (!diagnosesRes.ok || !petsRes.ok || !ownersRes.ok || !inventoryRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const dData = await diagnosesRes.json();
      const pData = await petsRes.json();
      const oData = await ownersRes.json();
      const iData = await inventoryRes.json();

      setDiagnoses(dData.diagnoses || []);
      setPets(pData.pets || []);
      setOwners(oData.owners || []);
      setInventory(iData.inventory || []);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(getFunctionUrl('/diagnoses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey
        },
        body: JSON.stringify({
          pet_id: petId,
          vaccination,
          date: diagnosisDate,
          weight: parseFloat(weight) || 0,
          temperature: parseFloat(temperature) || 0,
          test,
          dx,
          rx,
          remarks,
          follow_up_date: followUpDate || undefined,
          medications: selectedMeds,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      if (followUpDate) {
        await fetch(getFunctionUrl('/appointments'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            pet_id: petId,
            date: followUpDate,
            time: "09:00",
            reason: `Follow-up: ${dx.substring(0, 30)}`,
            status: 'Scheduled'
          })
        });
      }

      toast.success('Medical record saved!');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Error saving diagnosis');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiagnosis = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      const res = await fetch(getFunctionUrl(`/diagnoses/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey
        },
      });
      if (!res.ok) throw new Error();
      toast.success('Deleted');
      fetchData();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setPetId('');
    setVaccination('');
    setDiagnosisDate(new Date().toISOString().split('T')[0]);
    setWeight('');
    setTemperature('');
    setTest('');
    setDx('');
    setRx('');
    setRemarks('');
    setFollowUpDate('');
    setSelectedMeds([]);
    setMedId('');
    setMedQty(1);
  };

  const addMedication = () => {
    if (!medId || medQty <= 0) return;
    const item = inventory.find(i => i.key === medId);
    if (!item) return;

    if (selectedMeds.some(m => m.inventory_id === medId)) {
      toast.error('Medication already added');
      return;
    }

    if (medQty > item.value.quantity) {
      toast.error(`Only ${item.value.quantity} units available`);
      return;
    }

    setSelectedMeds([...selectedMeds, {
      inventory_id: medId,
      name: item.value.name,
      price: item.value.price,
      quantity: medQty
    }]);
    setMedId('');
    setMedQty(1);
  };

  const removeMedication = (index: number) => {
    setSelectedMeds(selectedMeds.filter((_, i) => i !== index));
  };

  const handlePrint = (diagnosis: any) => {
    const pet = pets.find(p => p.value.id === diagnosis.value.pet_id || p.key === diagnosis.value.pet_id);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id || o.key === pet?.value.owner_id);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Medical Record - ${pet?.value.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .info { margin: 20px 0; display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
            .section { margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
            .label { font-weight: bold; font-size: 12px; color: #666; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header"><h1>PURRFECTCARE</h1><p>Medical Examination Report</p></div>
          <div class="info">
            <div><div class="label">Patient</div><b>${pet?.value.name} (${pet?.value.type})</b></div>
            <div><div class="label">Owner</div><b>${owner?.value.name}</b></div>
            <div><div class="label">Date</div><b>${formatDate(diagnosis.value.date)}</b></div>
          </div>
          <div class="section"><div class="label">Diagnosis (DX)</div><p>${diagnosis.value.dx}</p></div>
          <div class="section"><div class="label">Prescription (RX)</div><p>${diagnosis.value.rx}</p></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const filteredPets = pets.filter(p => {
    const owner = owners.find(o => o.value.id === p.value.owner_id || o.key === p.value.owner_id);
    const s = searchTerm.toLowerCase();
    return p.value.name?.toLowerCase().includes(s) || owner?.value.name?.toLowerCase().includes(s);
  });

  const selectedPet = selectedPetId ? pets.find(p => p.value.id === selectedPetId || p.key === selectedPetId) : null;
  const petHistory = diagnoses.filter(d => d.value.pet_id === selectedPetId).sort((a, b) => new Date(b.value.date).getTime() - new Date(a.value.date).getTime());

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-11 w-[140px]" />
      </div>
      <div className="border rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-muted/20 space-y-2">
          <Skeleton className="h-5 w-[160px]" />
          <Skeleton className="h-4 w-[280px]" />
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-[120px]" />
                  <Skeleton className="h-3 w-[80px]" />
                  <Skeleton className="h-3 w-[160px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {selectedPetId && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedPetId(null); setSearchTerm(''); }} className="mb-2 p-0 h-auto hover:bg-transparent text-primary flex items-center gap-1 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold">Back to All Patients</span>
            </Button>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight">
            {selectedPetId ? `Medical History: ${selectedPet?.value.name}` : 'Medical Records'}
          </h1>
          <p className="text-muted-foreground">
            {selectedPetId
              ? `Complete visit history and clinical findings.`
              : 'Select a patient to manage their medical examination records.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 h-11 px-6 font-bold shadow-lg shadow-primary/20" onClick={() => { if (selectedPetId) setPetId(selectedPetId); }}>
                <Plus className="w-5 h-5 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                  <FileText className="w-6 h-6" /> New Medical Entry
                </DialogTitle>
                <DialogDescription>Fill out the clinical findings for this patient visit.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDiagnosis} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Patient *</Label>
                    <Select value={petId} onValueChange={setPetId} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map(p => (
                          <SelectItem key={p.key} value={p.key || p.value.id}>
                            {p.value.name} ({owners.find(o => o.value.id === p.value.owner_id || o.key === p.value.owner_id)?.value.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Date *</Label>
                    <Input type="date" value={diagnosisDate} onChange={e => setDiagnosisDate(e.target.value)} required className="h-11" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Vaccination</Label><Input placeholder="anti-rabies" value={vaccination} onChange={e => setVaccination(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Weight (kg)</Label><Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Temp (°C)</Label><Input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} /></div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-emerald-600">Diagnosis (DX) *</Label>
                  <Textarea value={dx} onChange={e => setDx(e.target.value)} className="min-h-[100px] border-emerald-100 bg-emerald-50/20" placeholder="Primary complaint and clinical findings..." required />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-blue-600">Prescription (RX) *</Label>
                  <Textarea value={rx} onChange={e => setRx(e.target.value)} className="min-h-[100px] border-blue-100 bg-blue-50/20" placeholder="Dispensed and prescribed medications..." required />
                </div>

                <div className="space-y-3 bg-muted/10 p-4 rounded-lg border border-muted/50">
                  <Label className="font-bold flex items-center gap-2"><Pill className="w-4 h-4 text-purple-600" /> Dispense Medications (Inventory)</Label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Medicine</Label>
                      <Select value={medId} onValueChange={setMedId}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Select medicine..." /></SelectTrigger>
                        <SelectContent>
                          {inventory.map(i => (
                            <SelectItem key={i.key} value={i.key} disabled={i.value.quantity < 1}>
                              {i.value.name} ({i.value.quantity} in stock) - ₱{i.value.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input type="number" min="1" value={medQty} onChange={e => setMedQty(parseInt(e.target.value) || 0)} className="h-9 bg-background" />
                    </div>
                    <Button type="button" onClick={addMedication} className="h-9 font-bold shadow-sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                  </div>

                  {selectedMeds.length > 0 && (
                    <div className="border rounded-md overflow-hidden bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-8 hover:bg-transparent">
                            <TableHead className="h-8 py-0">Item</TableHead>
                            <TableHead className="h-8 py-0 text-right">Qty</TableHead>
                            <TableHead className="h-8 py-0 text-right">Subtotal</TableHead>
                            <TableHead className="h-8 py-0 w-[40px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedMeds.map((m, idx) => (
                            <TableRow key={idx} className="h-8">
                              <TableCell className="py-1 text-sm">{m.name}</TableCell>
                              <TableCell className="py-1 text-sm text-right">{m.quantity}</TableCell>
                              <TableCell className="py-1 text-sm text-right">₱{(Number(m.price || 0) * m.quantity).toFixed(2)}</TableCell>
                              <TableCell className="py-1 text-right">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeMedication(idx)}><Trash className="w-3 h-3" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="font-bold">Lab Tests</Label><Input value={test} onChange={e => setTest(e.target.value)} placeholder="Laboratory reports..." /></div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><Label className="font-bold">Follow-up</Label>{followUpDate && <Button type="button" variant="ghost" size="sm" onClick={() => setFollowUpDate('')} className="h-5 text-[10px]">Clear</Button>}</div>
                    <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex border-t pt-6 gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" className="bg-primary min-w-[120px]" disabled={saving}>{saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : 'Save Record'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedPetId ? (
        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div><CardTitle className="text-xl">Patients List</CardTitle><CardDescription>Showing all pets with medical history records.</CardDescription></div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search patient or owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPets.map(p => {
                const o = owners.find(owner => owner.value.id === p.value.owner_id || owner.key === p.value.owner_id);
                const count = diagnoses.filter(d => d.value.pet_id === (p.value.id || p.key)).length;
                return (
                  <Card key={p.key} className="cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/5 group" onClick={() => setSelectedPetId(p.value.id || p.key)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <PawPrint className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg leading-none mb-1 group-hover:text-primary">{p.value.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-3">{p.value.type || 'N/A'}</p>
                          <div className="flex items-center gap-2 text-sm text-foreground/80 pt-2 border-t">
                            <User className="w-3.5 h-3.5 opacity-50" />
                            <span className="truncate">Owner: <b>{o?.value.name || 'Unknown'}</b></span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-primary" />
                <CardTitle>Medical History Timeline</CardTitle>
              </div>
              <Input placeholder="Search records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs h-9 bg-background" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="w-[120px] font-bold">Date</TableHead>
                  <TableHead className="font-bold">Condition (DX)</TableHead>
                  <TableHead className="font-bold">Prescription (RX)</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {petHistory.map(d => (
                  <TableRow key={d.key} className="hover:bg-muted/5">
                    <TableCell className="font-semibold">{formatDate(d.value.date)}</TableCell>
                    <TableCell className="font-bold text-primary max-w-sm"><p className="truncate">{d.value.dx}</p></TableCell>
                    <TableCell className="italic text-muted-foreground max-w-xs"><p className="truncate text-sm">{d.value.rx}</p></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingDiagnosis(d)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(d)} className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"><Printer className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDiagnosis(d.key)} className="h-8 w-8 hover:bg-red-100 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {petHistory.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No diagnosis found for this patient.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Viewer */}
      <Dialog open={!!viewingDiagnosis} onOpenChange={(o: boolean) => !o && setViewingDiagnosis(null)}>
        <DialogContent className="max-w-3xl border-none p-0 overflow-hidden shadow-2xl">
          {viewingDiagnosis && (
            <div className="bg-background">
              <div className="p-6 border-b bg-primary/5 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" /> Clinical Visit Detail
                  </h2>
                  <p className="text-sm text-muted-foreground">Examination conducted on {formatDate(viewingDiagnosis.value.date)}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Medical Record</div>
                  <div className="text-lg font-mono font-bold">#{viewingDiagnosis.key.split(':')[1]}</div>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-muted/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Weight</div>
                    <div className="flex items-center gap-2 font-medium text-base text-foreground"><Scale className="w-4 h-4 text-orange-600" />{viewingDiagnosis.value.weight} kg</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-muted/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Temp</div>
                    <div className="flex items-center gap-2 font-medium text-base text-foreground"><Thermometer className="w-4 h-4 text-red-600" />{viewingDiagnosis.value.temperature} °C</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-muted/50 col-span-2 flex flex-col justify-center">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Vaccination</div>
                    <div className="font-medium text-base text-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />{viewingDiagnosis.value.vaccination || 'None'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      Diagnosis (DX)
                    </Label>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm leading-relaxed text-foreground font-normal">
                      {viewingDiagnosis.value.dx}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      Prescription (RX)
                    </Label>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm leading-relaxed text-foreground font-normal">
                      {viewingDiagnosis.value.rx}
                    </div>
                  </div>

                  {viewingDiagnosis.value.remarks && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        Clinical Remarks
                      </Label>
                      <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm leading-relaxed text-muted-foreground font-normal">
                        {viewingDiagnosis.value.remarks}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t bg-muted/10 flex justify-end items-center">
                <Button variant="outline" className="h-11 px-6 font-bold border-2" onClick={() => handlePrint(viewingDiagnosis)}>
                  <Printer className="w-5 h-5 mr-2" /> Print Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
