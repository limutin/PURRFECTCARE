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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
            reason: "Follow-up checkup",
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
    setDeletingId(id);
    try {
      const res = await fetch(getFunctionUrl(`/diagnoses/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': publicAnonKey
        }
      });
      if (res.ok) {
        toast.success('Record deleted');
        fetchData();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      toast.error('Failed to delete record');
    } finally {
      setDeletingId(null);
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

    const medsHtml = diagnosis.value.medications?.length > 0 ? `
      <div class="section">
        <div class="section-title">💊 Medications Dispensed</div>
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${diagnosis.value.medications.map((med: any) => `
              <tr>
                <td>${med.name || 'N/A'}</td>
                <td style="text-align: center;">${med.quantity || 0}</td>
                <td style="text-align: right;">₱${(Number(med.price || 0)).toFixed(2)}</td>
                <td style="text-align: right;">₱${(Number(med.price || 0) * (med.quantity || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Medical Record - ${pet?.value.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 30px;
              color: #1e293b;
              line-height: 1.6;
              background: #f8fafc;
            }
            .report {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .report-header {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              color: #fff;
              padding: 24px 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .report-header h1 {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .report-header .doc-type {
              font-size: 13px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-header .meta {
              text-align: right;
              font-size: 12px;
              opacity: 0.9;
            }
            .report-header .meta .record-id {
              font-family: monospace;
              font-size: 14px;
              font-weight: 700;
              opacity: 1;
              margin-top: 4px;
            }
            .report-body {
              padding: 30px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-bottom: 28px;
            }
            .info-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              background: #fafbfc;
            }
            .info-card .card-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #059669;
              margin-bottom: 10px;
              padding-bottom: 6px;
              border-bottom: 2px solid #d1fae5;
            }
            .info-card .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              padding: 3px 0;
            }
            .info-card .info-row .label {
              color: #64748b;
              font-weight: 500;
            }
            .info-card .info-row .value {
              font-weight: 600;
              color: #1e293b;
              text-align: right;
            }
            .vitals-bar {
              display: flex;
              gap: 16px;
              margin-bottom: 28px;
            }
            .vital-item {
              flex: 1;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              padding: 14px;
              text-align: center;
            }
            .vital-item .vital-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              margin-bottom: 4px;
            }
            .vital-item .vital-value {
              font-size: 20px;
              font-weight: 800;
              color: #059669;
            }
            .vital-item .vital-unit {
              font-size: 11px;
              color: #64748b;
              margin-left: 2px;
            }
            .section {
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #334155;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 1px solid #e2e8f0;
            }
            .section-content {
              font-size: 14px;
              color: #334155;
              background: #f8fafc;
              padding: 14px 16px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              white-space: pre-wrap;
              line-height: 1.7;
            }
            .section-content.dx {
              border-left: 4px solid #059669;
              background: #f0fdf4;
            }
            .section-content.rx {
              border-left: 4px solid #3b82f6;
              background: #eff6ff;
            }
            .section-content.remarks {
              border-left: 4px solid #f59e0b;
              background: #fffbeb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th {
              background: #f1f5f9;
              padding: 10px 12px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
              border-bottom: 2px solid #e2e8f0;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }
            .follow-up-bar {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 12px 16px;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
              font-weight: 600;
              color: #92400e;
              margin-bottom: 24px;
            }
            .report-footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 20px 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #94a3b8;
            }
            .report-footer .clinic-info {
              font-weight: 600;
            }
            .signature-line {
              border-top: 1px solid #1e293b;
              width: 200px;
              text-align: center;
              padding-top: 6px;
              font-size: 11px;
              color: #64748b;
              margin-top: 40px;
              margin-left: auto;
            }
            @media print {
              body { background: #fff; padding: 0; }
              .report { border: none; box-shadow: none; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="report-header">
              <div>
                <h1>PURRFECTCARE</h1>
                <div class="doc-type">Medical Examination Report</div>
              </div>
              <div class="meta">
                <div>Date of Visit</div>
                <div class="record-id">${formatDate(diagnosis.value.date)}</div>
              </div>
            </div>

            <div class="report-body">
              <div class="info-grid">
                <div class="info-card">
                  <div class="card-title">🐾 Patient Information</div>
                  <div class="info-row"><span class="label">Name:</span><span class="value">${pet?.value.name || 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Species:</span><span class="value">${pet?.value.type || 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Sex:</span><span class="value">${pet?.value.sex ? pet.value.sex.charAt(0).toUpperCase() + pet.value.sex.slice(1) : 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Birthday:</span><span class="value">${pet?.value.birthday ? formatDate(pet.value.birthday) : 'N/A'}</span></div>
                </div>
                <div class="info-card">
                  <div class="card-title">👤 Owner Information</div>
                  <div class="info-row"><span class="label">Name:</span><span class="value">${owner?.value.name || 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Contact:</span><span class="value">${owner?.value.contact || 'N/A'}</span></div>
                  <div class="info-row"><span class="label">Address:</span><span class="value">${owner?.value.address || 'N/A'}</span></div>
                </div>
              </div>

              <div class="vitals-bar">
                <div class="vital-item">
                  <div class="vital-label">Weight</div>
                  <div class="vital-value">${diagnosis.value.weight || '—'}<span class="vital-unit">kg</span></div>
                </div>
                <div class="vital-item">
                  <div class="vital-label">Temperature</div>
                  <div class="vital-value">${diagnosis.value.temperature || '—'}<span class="vital-unit">°C</span></div>
                </div>
                <div class="vital-item">
                  <div class="vital-label">Vaccination</div>
                  <div class="vital-value" style="font-size: 14px;">${diagnosis.value.vaccination || 'None'}</div>
                </div>
              </div>

              ${diagnosis.value.follow_up_date ? `
              <div class="follow-up-bar">
                📅 Follow-up Scheduled: <strong>${formatDate(diagnosis.value.follow_up_date)}</strong>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">🩺 Diagnosis (DX)</div>
                <div class="section-content dx">${diagnosis.value.dx || 'No diagnosis recorded.'}</div>
              </div>

              <div class="section">
                <div class="section-title">💊 Prescription (RX)</div>
                <div class="section-content rx">${diagnosis.value.rx || 'No prescription recorded.'}</div>
              </div>

              ${diagnosis.value.test ? `
              <div class="section">
                <div class="section-title">🔬 Laboratory Tests</div>
                <div class="section-content">${diagnosis.value.test}</div>
              </div>
              ` : ''}

              ${medsHtml}

              ${diagnosis.value.remarks ? `
              <div class="section">
                <div class="section-title">📝 Clinical Remarks</div>
                <div class="section-content remarks">${diagnosis.value.remarks}</div>
              </div>
              ` : ''}

              <div class="signature-line">
                Attending Veterinarian
              </div>
            </div>

            <div class="report-footer">
              <div class="clinic-info">PURRFECTCARE Veterinary Clinic</div>
              <div>Computer-generated medical record. Printed on ${formatDate(new Date())}</div>
            </div>
          </div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDiagnosis(d.key)}
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-500"
                          disabled={deletingId === d.key}
                        >
                          {deletingId === d.key ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
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

                  {viewingDiagnosis.value.test && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Beaker className="w-3.5 h-3.5" /> Lab Tests / Observations
                      </Label>
                      <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm leading-relaxed text-foreground font-normal">
                        {viewingDiagnosis.value.test}
                      </div>
                    </div>
                  )}

                  {viewingDiagnosis.value.medications && viewingDiagnosis.value.medications.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5" /> Dispensed Medications
                      </Label>
                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="h-9 hover:bg-transparent">
                              <TableHead className="h-9 py-0 text-xs font-bold uppercase">Item</TableHead>
                              <TableHead className="h-9 py-0 text-xs font-bold uppercase text-right">Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingDiagnosis.value.medications.map((m: any, idx: number) => (
                              <TableRow key={idx} className="h-9">
                                <TableCell className="py-1 text-sm">{m.name}</TableCell>
                                <TableCell className="py-1 text-sm text-right font-medium">{m.quantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

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
