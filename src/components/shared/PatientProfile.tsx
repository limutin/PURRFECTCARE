import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ArrowLeft, Camera, Phone, MapPin, Mail, AlertTriangle, Calendar, Scale, Thermometer,
  FileText, Download, Loader2, Stethoscope, Wallet, Pencil, Save, X, Cpu, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, blobToBase64, peso } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { PetAvatar } from './PetAvatar';
import { PetHistoryPanel } from './PetHistoryPanel';

interface PatientProfileProps {
  accessToken: string;
  petId: string;
  onBack?: () => void;
  /** Hide editing controls (photo, allergies, history). */
  readOnly?: boolean;
}

function ageText(birthday?: string) {
  if (!birthday) return null;
  const b = new Date(birthday + 'T00:00:00');
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 1) return 'under 1 month';
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12), m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} yr${y > 1 ? 's' : ''}`;
}

/** Resize an image file to fit within `max` px and return a JPEG blob. */
async function resizeImage(file: File, max = 640): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PatientProfile({ accessToken, petId, onBack, readOnly = false }: PatientProfileProps) {
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [openingDoc, setOpeningDoc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, o, d, b, a] = await Promise.all([
        api('/pets', accessToken), api('/owners', accessToken), api('/diagnoses', accessToken),
        api('/billing', accessToken), api('/appointments', accessToken),
      ]);
      const thePet = (p.pets || []).find((x: any) => x.value.id === petId || x.key === petId);
      setPet(thePet?.value || null);
      setOwner((o.owners || []).find((x: any) => x.value.id === thePet?.value.owner_id || x.key === thePet?.value.owner_id)?.value || null);
      setVisits((d.diagnoses || []).filter((x: any) => x.value.pet_id === petId).map((x: any) => x.value)
        .sort((x: any, y: any) => String(y.date).localeCompare(String(x.date))));
      setBills((b.bills || []).filter((x: any) => x.value.pet_id === petId).map((x: any) => x.value)
        .sort((x: any, y: any) => String(y.created_at).localeCompare(String(x.created_at))));
      setAppointments((a.appointments || []).filter((x: any) => x.value.pet_id === petId).map((x: any) => x.value));
      setAllergies(thePet?.value.allergies || '');
      setNotes(thePet?.value.notes || '');
    } catch (e: any) {
      toast.error('Failed to load patient: ' + e.message);
    } finally {
      setLoading(false);
    }
    api(`/documents?pet_id=${encodeURIComponent(petId)}`, accessToken)
      .then(r => setDocuments(r.documents || []))
      .catch(() => setDocuments([]));
  };

  useEffect(() => { load(); }, [petId]);

  const weightData = useMemo(() => {
    const pts = visits
      .filter(v => Number(v.weight) > 0 && v.date)
      .map(v => ({ date: v.date, label: formatDate(v.date).replace(/, \d{4}$/, ''), weight: Number(v.weight) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return pts;
  }, [visits]);

  const today = todayLocal();
  const upcoming = appointments
    .filter(a => a.date >= today && !['completed', 'cancelled', 'Cancelled', 'No-show'].includes(a.status))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const balance = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const latest = visits[0];

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const res = await api(`/pets/${encodeURIComponent(petId)}/photo`, accessToken, {
        body: { content_base64: await blobToBase64(blob), content_type: 'image/jpeg' },
      });
      setPet((p: any) => ({ ...p, photo_url: res.photo_url }));
      toast.success('Photo updated');
    } catch (e: any) {
      toast.error('Photo upload failed: ' + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await api(`/pets/${encodeURIComponent(petId)}`, accessToken, { method: 'PUT', body: { allergies: allergies.trim() || null, notes: notes.trim() || null } });
      setPet((p: any) => ({ ...p, allergies: allergies.trim(), notes: notes.trim() }));
      setEditingNotes(false);
      toast.success('Patient notes saved');
    } catch (e: any) {
      toast.error('Could not save: ' + e.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const openDocument = async (doc: any) => {
    setOpeningDoc(doc.id);
    try {
      const { url } = await api(`/documents/${doc.id}/url`, accessToken);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast.error('Could not open document: ' + e.message);
    } finally {
      setOpeningDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="space-y-4">
        {onBack && <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
        <Card><CardContent className="p-10 text-center text-muted-foreground">This patient could not be found.</CardContent></Card>
      </div>
    );
  }

  const sexLabel = pet.sex ? pet.sex.charAt(0).toUpperCase() + pet.sex.slice(1) : null;
  const age = ageText(pet.birthday);

  return (
    <div className="space-y-5">
      {onBack && (
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* Patient header */}
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500" />
        <CardContent className="pt-0 pb-5 px-5">
          <div className="flex flex-col md:flex-row md:items-start gap-x-5 gap-y-2">
            <div className="relative self-start -mt-10">
              <PetAvatar type={pet.type} photoUrl={pet.photo_url} name={pet.name} size={96} className="ring-4" />
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border shadow flex items-center justify-center text-teal-700 hover:bg-teal-50"
                    title="Change photo"
                    aria-label="Change photo"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files?.[0])} />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 md:pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-foreground">{pet.name}</h2>
                {pet.pet_uid && <span className="vc-pill bg-teal-50 text-teal-800 font-mono">{pet.pet_uid}</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {[pet.type, pet.breed, sexLabel, pet.color, age].filter(Boolean).join(' · ')}
              </p>
              {pet.microchip && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> Microchip {pet.microchip}</p>
              )}
            </div>
            {owner && (
              <div className="md:text-right text-sm space-y-0.5 md:max-w-[280px] md:pt-3">
                <p className="font-semibold text-foreground">{owner.name}</p>
                {owner.contact && <p className="text-muted-foreground flex md:justify-end items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {owner.contact}</p>}
                {owner.email && <p className="text-muted-foreground flex md:justify-end items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {owner.email}</p>}
                {owner.address && <p className="text-muted-foreground flex md:justify-end items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {owner.address}</p>}
              </div>
            )}
          </div>

          {/* Allergies & notes */}
          <div className="mt-4">
            {editingNotes ? (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Allergies / alerts</Label>
                  <Textarea rows={2} value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin allergy, aggressive when muzzled" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Diet, behaviour, chronic conditions…" />
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setEditingNotes(false); setAllergies(pet.allergies || ''); setNotes(pet.notes || ''); }} disabled={savingNotes}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  <Button size="sm" onClick={saveNotes} disabled={savingNotes}>{savingNotes ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-3">
                <div className={`flex-1 rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${pet.allergies ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span><b>Allergies / alerts:</b> {pet.allergies || 'None recorded'}</span>
                </div>
                <div className="flex-1 rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground">
                  <b className="text-foreground/80">Notes:</b> {pet.notes || '—'}
                </div>
                {!readOnly && (
                  <Button variant="outline" size="sm" className="self-start" onClick={() => setEditingNotes(true)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Fact icon={Scale} label="Latest weight" value={latest?.weight ? `${latest.weight} kg` : pet.weight ? `${pet.weight} kg` : '—'} tone="teal" />
        <Fact icon={Thermometer} label="Latest temp" value={latest?.temperature ? `${latest.temperature} °C` : '—'} tone="rose" />
        <Fact icon={Calendar} label="Next appointment" value={upcoming[0] ? formatDate(upcoming[0].date) : 'None'} tone="sky" />
        <Fact icon={Wallet} label="Unpaid balance" value={peso(balance)} tone={balance > 0 ? 'amber' : 'emerald'} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vaccines">Vaccines &amp; deworming</TabsTrigger>
          <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents{documents ? ` (${documents.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="w-4 h-4 text-teal-700" /> Weight over time</CardTitle>
              <CardDescription>From recorded visits</CardDescription>
            </CardHeader>
            <CardContent>
              {weightData.length >= 2 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#ece7dd" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7872' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7872' }} tickLine={false} axisLine={false} unit=" kg" width={56} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v: any) => [`${v} kg`, 'Weight']} contentStyle={{ borderRadius: 10, border: '1px solid #e8e4dc', fontSize: 12 }} />
                      <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0d9488' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Weight trend appears after two or more visits with a recorded weight.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-700" /> Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming appointments.</p>}
              {upcoming.slice(0, 5).map(a => (
                <div key={a.id} className="rounded-lg border px-3 py-2">
                  <p className="text-sm font-semibold">{formatDate(a.date)} · {String(a.time || '').slice(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{a.reason || 'Check-up'} · {a.status}</p>
                </div>
              ))}
              {latest && (
                <div className="pt-3 mt-2 border-t">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Last visit</p>
                  <p className="text-sm font-semibold">{formatDate(latest.date)}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{latest.dx}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaccines">
          <PetHistoryPanel accessToken={accessToken} petId={petId} diagnoses={visits.map(v => ({ key: v.id, value: v }))} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Prescription</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Temp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No visits recorded yet.</TableCell></TableRow>}
                  {visits.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(v.date)}</TableCell>
                      <TableCell className="max-w-xs"><p className="line-clamp-2">{v.dx}</p></TableCell>
                      <TableCell className="max-w-xs text-muted-foreground"><p className="line-clamp-2">{v.rx}</p></TableCell>
                      <TableCell className="text-right">{v.weight ? `${v.weight} kg` : '—'}</TableCell>
                      <TableCell className="text-right">{v.temperature ? `${v.temperature} °C` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No bills yet.</TableCell></TableRow>}
                  {bills.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(b.created_at)}</TableCell>
                      <TableCell className="max-w-sm text-muted-foreground">
                        <p className="truncate">{(b.items || []).map((i: any) => i.name).join(', ') || 'Consultation'}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`vc-pill ${b.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                          {b.status === 'paid' ? `Paid${b.payment_method ? ` · ${b.payment_method.toUpperCase()}` : ''}` : 'Unpaid'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{peso(b.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-700" /> Generated documents</CardTitle>
              <CardDescription>Certificates and consent forms created for this patient in the Forms page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents === null && <Skeleton className="h-12 w-full" />}
              {documents?.length === 0 && <p className="text-sm text-muted-foreground">No documents saved yet.</p>}
              {documents?.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{doc.doc_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name} · {formatDate(doc.created_at)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openDocument(doc)} disabled={openingDoc === doc.id}>
                    {openingDoc === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span className="ml-1.5 hidden sm:inline">Download</span>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TONES: Record<string, string> = {
  teal: 'bg-teal-50 text-teal-700',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
};

function Fact({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-foreground truncate vc-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
