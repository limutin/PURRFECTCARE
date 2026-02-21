import React, { useState, useEffect } from 'react';
import { projectId } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { FileText, FilePlus, Search, User, PawPrint, Dna, MapPin, Phone, Calendar as CalendarIcon, Info } from 'lucide-react';
import { toast } from 'sonner';

interface FormsManagerProps {
  accessToken: string;
}

export function FormsManager({ accessToken }: FormsManagerProps) {
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [petsRes, ownersRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/pets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/owners`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();

      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFormStyle = () => `
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 50px;
        max-width: 900px;
        margin: 0 auto;
        color: #2D3748;
        line-height: 1.6;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 4px solid #10B981;
        padding-bottom: 20px;
        margin-bottom: 40px;
      }
      .logo-area {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      .logo-circle {
        width: 60px;
        height: 60px;
        background: #10B981;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 30px;
      }
      .clinic-info {
        text-align: right;
      }
      .clinic-name {
        font-size: 32px;
        font-weight: 800;
        color: #059669;
        margin: 0;
      }
      .form-title {
        font-size: 24px;
        text-align: center;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 40px;
        text-transform: uppercase;
        background: #f0fdf4;
        padding: 10px;
        border-radius: 8px;
        letter-spacing: 1px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 700;
        color: #059669;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
        margin-bottom: 20px;
        margin-top: 30px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .data-grid {
        display: grid;
        grid-template-cols: 1fr 1fr;
        gap: 25px;
      }
      .data-item {
        margin-bottom: 12px;
      }
      .data-label {
        font-weight: 600;
        color: #718096;
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .data-value {
        font-size: 16px;
        font-weight: 500;
        border-bottom: 1px dashed #cbd5e0;
        padding-bottom: 4px;
      }
      .main-content {
        margin: 40px 0;
        font-size: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 15px;
        text-align: left;
      }
      th {
        background-color: #f8fafc;
        color: #475569;
        font-weight: 700;
      }
      .footer {
        margin-top: 80px;
        display: flex;
        justify-content: space-between;
      }
      .signature-block {
        text-align: center;
        width: 250px;
      }
      .signature-line {
        border-top: 2px solid #2D3748;
        margin-top: 50px;
        padding-top: 5px;
        font-weight: 600;
      }
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 100px;
        color: rgba(16, 185, 129, 0.05);
        z-index: -1;
        pointer-events: none;
        white-space: nowrap;
      }
      @media print {
        button { display: none; }
        body { padding: 30px; }
      }
    </style>
  `;

  const generateVHC = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>VHC - ${pet.value.name}</title>
          ${getFormStyle()}
        </head>
        <body>
          <div class="watermark">PURRFECTCARE</div>
          <div class="header">
            <div class="logo-area">
              <div class="logo-circle">V</div>
              <div>
                <p style="font-size: 14px; color: #666; margin:0">Standard of Excellence</p>
                <p style="font-size: 14px; color: #666; margin:0">Since 2024</p>
              </div>
            </div>
            <div class="clinic-info">
              <h1 class="clinic-name">PURRFECTCARE</h1>
              <p style="margin: 4px 0">123 Veterinary Lane, Pet City</p>
              <p style="margin: 4px 0">Tel: (02) 8-888-8888</p>
            </div>
          </div>

          <div class="form-title">Veterinary Health Certificate</div>

          <p>Date of Issue: <b>${formatDate(new Date())}</b></p>
          
          <div class="section-title">Owner Information</div>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Full Name</div>
              <div class="data-value">${owner?.value.name || 'N/A'}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Home Address</div>
              <div class="data-value">${owner?.value.address || 'N/A'}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Contact Number</div>
              <div class="data-value">${owner?.value.contact || 'N/A'}</div>
            </div>
          </div>

          <div class="section-title">Animal Identification</div>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Pet Name</div>
              <div class="data-value">${pet.value.name}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Sex</div>
              <div class="data-value">${pet.value.sex.toUpperCase()}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Date of Birth</div>
              <div class="data-value">${formatDate(pet.value.birthday)}</div>
            </div>
          </div>

          <div class="main-content">
            <p>
              This is to officially certify that the animal described above has been examined by the undersigned licensed veterinarian. 
              On clinical examination, the animal appeared healthy and free from any signs of infectious or contagious diseases.
            </p>
            <p>
              The animal is considered <b>FIT FOR TRAVEL / TRANSPORT</b> at the time of examination.
            </p>
          </div>

          <div class="footer">
            <div class="signature-block">
              <div class="signature-line">Pet Owner</div>
            </div>
            <div class="signature-block">
              <div class="signature-line">Licensed Veterinarian</div>
              <div style="font-size: 12px; margin-top: 5px;">License No: 123456-VET</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateLabRequest = (type: 'CBC' | 'CHEM') => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${type} Request - ${pet.value.name}</title>
          ${getFormStyle()}
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <div class="logo-circle">V</div>
            </div>
            <div class="clinic-info">
              <h1 class="clinic-name">PURRFECTCARE</h1>
              <p style="margin: 4px 0">Laboratory Services</p>
            </div>
          </div>

          <div class="form-title">Laboratory Request - ${type === 'CBC' ? 'Complete Blood Count' : 'Blood Chemistry'}</div>

          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Date Requested</div>
              <div class="data-value">${formatDate(new Date())}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Pet Name</div>
              <div class="data-value">${pet.value.name}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Owner Name</div>
              <div class="data-value">${owner?.value.name || 'N/A'}</div>
            </div>
          </div>

          <div class="section-title">Requested parameters</div>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Reference Range</th>
              </tr>
            </thead>
            <tbody>
              ${type === 'CBC' ? `
                <tr><td>WBC (White Blood Cells)</td><td></td><td>6.0-17.0 x10³/μL</td></tr>
                <tr><td>RBC (Red Blood Cells)</td><td></td><td>5.5-8.5 x10⁶/μL</td></tr>
                <tr><td>Hemoglobin</td><td></td><td>12.0-18.0 g/dL</td></tr>
                <tr><td>Hematocrit</td><td></td><td>37-55%</td></tr>
                <tr><td>Platelets</td><td></td><td>200-500 x10³/μL</td></tr>
              ` : `
                <tr><td>Glucose</td><td></td><td>70-110 mg/dL</td></tr>
                <tr><td>BUN</td><td></td><td>7-27 mg/dL</td></tr>
                <tr><td>Creatinine</td><td></td><td>0.5-1.5 mg/dL</td></tr>
                <tr><td>ALT (SGPT)</td><td></td><td>10-100 U/L</td></tr>
                <tr><td>AST (SGOT)</td><td></td><td>10-50 U/L</td></tr>
              `}
            </tbody>
          </table>

          <div class="footer">
            <div class="signature-block">
              <div class="signature-line">Requesting Veterinarian</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Forms & Documents</h1>
          <p className="text-muted-foreground mt-1">Generate official clinic documentation with one click</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-premium bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Patient Selection
            </CardTitle>
            <CardDescription>Select a pet to start generating documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Select value={selectedPet} onValueChange={setSelectedPet}>
                  <SelectTrigger id="pet-select" className="bg-background border-none shadow-sm h-12 focus:ring-2 focus:ring-primary/20 transition-all">
                    <SelectValue placeholder="Find a pet or owner..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {pets.map((pet) => {
                      const owner = owners.find((o) => o.value.id === pet.value.owner_id);
                      return (
                        <SelectItem key={pet.key} value={pet.value.id} className="py-3 border-b border-muted last:border-0">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-primary">{pet.value.name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase truncate max-w-[200px]">
                              Owner: {owner?.value.name || 'N/A'}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {!selectedPet && (
                <div className="p-4 rounded-xl bg-background/50 border border-dashed border-primary/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Search by pet name or owner to unlock official forms
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-2 border-none shadow-premium transition-all duration-500 overflow-hidden ${selectedPet ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute lg:static'}`}>
          {selectedPet && (
            <div className="h-full flex flex-col">
              <div className="px-6 py-4 bg-muted/30 border-b border-muted flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Patient Profile</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Verified Medical Record</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Pet Identification</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-3 rounded-xl border border-muted">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Pet Name</p>
                          <p className="font-bold text-primary flex items-center gap-2">
                            <PawPrint className="w-3.5 h-3.5" />
                            {pets.find(p => p.value.id === selectedPet)?.value.name}
                          </p>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-xl border border-muted">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Type</p>
                          <p className="font-semibold text-sm truncate">
                            {pets.find(p => p.value.id === selectedPet)?.value.type}
                          </p>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-xl border border-muted">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Gender</p>
                          <p className="font-semibold text-sm capitalize">
                            {pets.find(p => p.value.id === selectedPet)?.value.sex}
                          </p>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-xl border border-muted">
                          <p className="text-[10px] text-muted-foreground mb-1 uppercase">Date of Birth</p>
                          <p className="font-semibold text-sm flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {formatDate(pets.find(p => p.value.id === selectedPet)?.value.birthday)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Owner Information</Label>
                      <div className="space-y-3">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-foreground">
                                {owners.find(o => o.value.id === pets.find(p => p.value.id === selectedPet)?.value.owner_id)?.value.name}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {owners.find(o => o.value.id === pets.find(p => p.value.id === selectedPet)?.value.owner_id)?.value.contact}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 italic">
                                <MapPin className="w-3 h-3" />
                                {owners.find(o => o.value.id === pets.find(p => p.value.id === selectedPet)?.value.owner_id)?.value.address}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          {
            id: 'vhc',
            title: 'Health Certificate',
            desc: 'Official Veterinary Health Certificate (VHC) for travel, transport, or general health clearance.',
            action: generateVHC,
            color: 'bg-green-50 text-green-700 border-green-200'
          },
          {
            id: 'cbc',
            title: 'Lab Request: CBC',
            desc: 'Complete Blood Count request form with standard reference ranges for canine/feline patients.',
            action: () => generateLabRequest('CBC'),
            color: 'bg-blue-50 text-blue-700 border-blue-200'
          },
          {
            id: 'blood-chem',
            title: 'Lab Request: CHEM',
            desc: 'Blood Chemistry analysis request covering standard panels like Glucose, BUN, and Creatinine.',
            action: () => generateLabRequest('CHEM'),
            color: 'bg-purple-50 text-purple-700 border-purple-200'
          }
        ].map((form) => (
          <Card key={form.id} className="group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${form.color.split(' ')[0]}`}></div>
            <CardHeader className="pb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${form.color}`}>
                <FileText className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold">{form.title}</CardTitle>
              <CardDescription className="leading-relaxed min-h-[60px]">{form.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={form.action}
                disabled={!selectedPet}
                className="w-full h-11 font-semibold shadow-sm transition-all active:scale-95"
              >
                <FilePlus className="w-4 h-4 mr-2" />
                Generate {form.id.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {
        !selectedPet && (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">Please select a pet above to unlock form generation</p>
          </div>
        )
      }
    </div>
  );
}
