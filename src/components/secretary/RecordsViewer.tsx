import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent } from '../ui/dialog';
import { Search, Eye, Printer, PawPrint, User, ArrowLeft, History, FileText, Scale, Thermometer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface RecordsViewerProps {
  accessToken: string;
}

export function RecordsViewer({ accessToken }: RecordsViewerProps) {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [viewingDiagnosis, setViewingDiagnosis] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [diagnosesRes, petsRes, ownersRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/diagnoses`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/owners`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
      ]);

      const diagnosesData = await diagnosesRes.json();
      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();

      setDiagnoses(diagnosesData.diagnoses || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
      <div className="border rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-muted/20 space-y-2">
          <Skeleton className="h-5 w-[160px]" />
          <Skeleton className="h-4 w-[280px]" />
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-3 w-[160px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
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
            ? `Read-only view of patient findings and clinical history.`
            : 'Select a patient to view their medical examination history.'}
        </p>
      </div>

      {!selectedPetId ? (
        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div><CardTitle className="text-xl">Patients List</CardTitle><CardDescription>Showing all pets with medical records.</CardDescription></div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search patient or owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">No patients found.</div>
              ) : (
                filteredPets.map(p => {
                  const o = owners.find(owner => owner.value.id === p.value.owner_id || owner.key === p.value.owner_id);
                  return (
                    <Card key={p.key} className="cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/5 group" onClick={() => setSelectedPetId(p.value.id || p.key)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <PawPrint className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg leading-none mb-1 group-hover:text-primary">{p.value.name}</h3>
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
                })
              )}
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
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {petHistory.map(d => (
                  <TableRow key={d.key} className="hover:bg-muted/5">
                    <TableCell className="font-semibold">{formatDate(d.value.date)}</TableCell>
                    <TableCell className="font-bold text-primary max-w-sm px-4"><p className="truncate">{d.value.dx}</p></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingDiagnosis(d)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(d)} className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"><Printer className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {petHistory.length === 0 && <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">No diagnosis records found for this patient.</TableCell></TableRow>}
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
