import React, { useState, useEffect } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { projectId, publicAnonKey, getFunctionUrl } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  FileText, FilePlus, Search, User, PawPrint, Dna,
  MapPin, Phone, Calendar as CalendarIcon, Info, Loader2,
  Map, Fingerprint, Activity, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../ui/dialog';

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

  // VHC specific states
  const [vhcControlNo, setVhcControlNo] = useState('');
  const [vhcDestination, setVhcDestination] = useState('');
  const [vhcVaccineUsed, setVhcVaccineUsed] = useState('Rabies Vaccine');
  const [vhcVaccineDate, setVhcVaccineDate] = useState(new Date().toISOString().split('T')[0]);
  const [showVhcDialog, setShowVhcDialog] = useState(false);

  // Confinement specific states
  const [confinementFirstDayCost, setConfinementFirstDayCost] = useState('2,000');
  const [confinementSucceedingDayCost, setConfinementSucceedingDayCost] = useState('500');
  const [showConfinementDialog, setShowConfinementDialog] = useState(false);

  // Surgery specific states
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeryProcedure, setSurgeryProcedure] = useState('');
  const [surgeryCost, setSurgeryCost] = useState('');
  const [surgeryDeposit, setSurgeryDeposit] = useState('');
  const [surgeryMedication, setSurgeryMedication] = useState('');
  const [surgeryBalance, setSurgeryBalance] = useState('');
  const [surgeryLabTests, setSurgeryLabTests] = useState('');
  const [surgeryTotal, setSurgeryTotal] = useState('');
  const [showSurgeryDialog, setShowSurgeryDialog] = useState(false);

  useEffect(() => {
    const parseValue = (val: string) => {
      if (!val) return 0;
      // Remove commas and parse
      return parseFloat(val.replace(/,/g, '')) || 0;
    };

    const total = 
      parseValue(surgeryProcedure) + 
      parseValue(surgeryCost) + 
      parseValue(surgeryDeposit) +
      parseValue(surgeryMedication) + 
      parseValue(surgeryLabTests) + 
      parseValue(surgeryBalance);
      
    if (total > 0) {
      setSurgeryTotal(total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    } else {
      setSurgeryTotal('');
    }
  }, [surgeryProcedure, surgeryCost, surgeryDeposit, surgeryMedication, surgeryLabTests, surgeryBalance]);

  const generateVHC = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    // Calculate age
    let ageText = 'N/A';
    if (pet.value.birthday) {
      const birthDate = new Date(pet.value.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      ageText = age <= 0 ? (m <= 0 ? 'Less than 1 month' : `${m} months`) : `${age} years old`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    console.log("Starting VHC generation for:", pet.value.name);

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime()) // Cache buster
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/VHC_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          owner_contact: owner?.value.contact || '',
          owner_email: owner?.value.email || '',
          destination: vhcDestination || '',
          pet_name: pet.value.name,
          species: pet.value.type,
          species_lower: pet.value.type.toLowerCase(),
          breed: pet.value.breed || '',
          color: pet.value.color || '',
          sex: pet.value.sex.toUpperCase(),
          age: ageText,
          weight: pet.value.weight ? pet.value.weight + ' kg' : '',
          vaccine_date: formatDate(vhcVaccineDate),
          current_date: formatDate(new Date()),
          time: timeStr,
          vaccine_used: vhcVaccineUsed,
          control_no: vhcControlNo || ''
        };

        console.log("Rendering VHC with data:", renderData);
        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `VHC_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("VHC Document generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateEuthanasia = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    if (!pet) return;

    toast.info("Preparing euthanasia consent form...");

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime())
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/Euthanasia_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          pet_name: pet.value.name,
          species: pet.value.type,
          breed: pet.value.breed || '',
          color: pet.value.color || '',
          sex: pet.value.sex,
          current_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        };

        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Euthanasia_Consent_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Euthanasia Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateWaiver = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    if (!pet) return;

    toast.info("Preparing Waiver of Release form...");

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime())
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/Waiver_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          owner_name: owner?.value.name || '',
          pet_name: pet.value.name,
          current_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        };

        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Waiver_of_Release_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Waiver of Release form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateGrooming = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    if (!pet) return;

    toast.info("Preparing Grooming Treatment Agreement...");

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime())
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/Grooming_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Split current date
        const now = new Date();
        const suffixes = ["th", "st", "nd", "rd"];
        const d = now.getDate();
        const dayWithSuffix = d + (suffixes[(d - 20) % 10] || suffixes[d] || suffixes[0]);

        const renderData = {
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          owner_contact: owner?.value.contact || '',
          pet_name: pet.value.name,
          day: dayWithSuffix.toUpperCase(),
          month: now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
          year_2dig: now.getFullYear().toString().slice(-2)
        };

        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Grooming_Agreement_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Grooming Agreement generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateConfinement = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    if (!pet) return;

    toast.info("Preparing Consent for Confinement...");

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime())
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/Confinement_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          pet_name: pet.value.name,
          species: pet.value.type,
          breed: pet.value.breed || '',
          color: pet.value.color || '',
          sex: pet.value.sex,
          first_day_cost: confinementFirstDayCost,
          succeeding_day_cost: confinementSucceedingDayCost
        };

        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Confinement_Consent_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Confinement Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateSurgery = () => {
    if (!selectedPet) return;
    const pet = pets.find(p => p.value.id === selectedPet);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id);

    if (!pet) return;

    toast.info("Preparing Consent for Surgery...");

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + "?t=" + new Date().getTime())
        .then(response => {
          if (!response.ok) throw new Error("Fetch failed: " + response.statusText);
          return response.arrayBuffer();
        })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile("/Surgery_Template.docx", (error, content) => {
      if (error) {
        console.error(error);
        toast.error("Failed to load template file");
        return;
      }

      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          pet_name: pet.value.name,
          species: pet.value.type,
          breed: pet.value.breed || '',
          color: pet.value.color || '',
          sex: pet.value.sex,
          procedure_name: surgeryName,
          procedure_cost: surgeryProcedure,
          cost: surgeryCost,
          deposit: surgeryDeposit,
          medication: surgeryMedication,
          balance: surgeryBalance,
          lab_tests: surgeryLabTests,
          total: surgeryTotal
        };

        doc.render(renderData);

        const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Surgery_Consent_${pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Surgery Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
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
        <Dialog open={showVhcDialog} onOpenChange={setShowVhcDialog}>
          <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 bg-green-50 text-green-700`}></div>
            <CardHeader className="pb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border bg-green-50 text-green-700 border-green-200`}>
                <FileText className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold">Health Certificate</CardTitle>
              <CardDescription className="leading-relaxed min-h-[60px]">Official Veterinary Health Certificate (VHC) for travel, transport, or general health clearance.</CardDescription>
            </CardHeader>
            <CardContent>
              <DialogTrigger asChild>
                <Button
                  disabled={!selectedPet}
                  className="w-full h-11 font-semibold shadow-sm transition-all active:scale-95"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate VHC
                </Button>
              </DialogTrigger>
            </CardContent>
          </Card>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                VHC Additional Information
              </DialogTitle>
              <DialogDescription>
                Please provide the missing details required for the Health Certificate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Fingerprint className="w-3 h-3" /> Control No.
                  </Label>
                  <Input
                    placeholder="e.g. 2024-001"
                    value={vhcControlNo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVhcControlNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Map className="w-3 h-3" /> Destination
                  </Label>
                  <Input
                    placeholder="e.g. Cebu City"
                    value={vhcDestination}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVhcDestination(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Rabies Vaccine Used
                </Label>
                <Input
                  placeholder="e.g. Nobivac Rabies"
                  value={vhcVaccineUsed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVhcVaccineUsed(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Vaccination Date
                </Label>
                <Input
                  type="date"
                  value={vhcVaccineDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVhcVaccineDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVhcDialog(false)}>Cancel</Button>
              <Button onClick={() => { generateVHC(); setShowVhcDialog(false); }}>
                Generate PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {[
          {
            id: 'euthanasia',
            title: 'Consent for Euthanasia',
            desc: 'Official consent form for requested euthanasia procedures, documenting veterinarian discussion and rabies status.',
            action: generateEuthanasia,
            color: 'bg-red-50 text-red-700 border-red-200'
          },
          {
            id: 'waiver',
            title: 'Waiver of Release',
            desc: 'Waiver for patients leaving the clinic prematurely against veterinary advice.',
            action: generateWaiver,
            color: 'bg-orange-50 text-orange-700 border-orange-200'
          },
          {
            id: 'grooming',
            title: 'Grooming Agreement',
            desc: 'Terms and conditions for grooming and skin treatments, ensuring client acknowledgement of risks.',
            action: generateGrooming,
            color: 'bg-teal-50 text-teal-700 border-teal-200'
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

        <Dialog open={showConfinementDialog} onOpenChange={setShowConfinementDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary border-indigo-100">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 bg-indigo-200"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border bg-indigo-50 text-indigo-700 border-indigo-200">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold">Consent for Confinement</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official consent for pet confinement, documenting treatment estimates and owner responsibilities.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!selectedPet}
                  className="w-full h-11 font-semibold shadow-sm transition-all active:scale-95"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate CONFINEMENT
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Confinement Estimates
              </DialogTitle>
              <DialogDescription>
                Provide the estimated treatment costs for the confinement form.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">First Day Cost (Php)</Label>
                <Input 
                  placeholder="e.g. 2,000" 
                  value={confinementFirstDayCost}
                  onChange={(e) => setConfinementFirstDayCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Succeeding Days Cost (Php)</Label>
                <Input 
                  placeholder="e.g. 500" 
                  value={confinementSucceedingDayCost}
                  onChange={(e) => setConfinementSucceedingDayCost(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfinementDialog(false)}>Cancel</Button>
              <Button onClick={() => { generateConfinement(); setShowConfinementDialog(false); }}>
                Generate PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSurgeryDialog} onOpenChange={setShowSurgeryDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary border-blue-100">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 bg-blue-200"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border bg-blue-50 text-blue-700 border-blue-200">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold">Consent for Surgery</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official consent for surgical procedures, documenting risks, costs, and owner authorization.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!selectedPet}
                  className="w-full h-11 font-semibold shadow-sm transition-all active:scale-95"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate SURGERY
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Surgical Procedure Details
              </DialogTitle>
              <DialogDescription>
                Provide the procedure details and cost estimates for the surgery consent form.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase text-primary">Surgery to Perform</Label>
                <Input 
                  placeholder="e.g. Spay / Neuter / Tumor Removal" 
                  value={surgeryName}
                  onChange={(e) => setSurgeryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Surgical Procedure Cost (Php)</Label>
                <Input 
                  placeholder="e.g. 1,500" 
                  value={surgeryProcedure}
                  onChange={(e) => setSurgeryProcedure(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Estimated Cost (Php)</Label>
                <Input 
                  placeholder="e.g. 5,000" 
                  value={surgeryCost}
                  onChange={(e) => setSurgeryCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Deposit (Php)</Label>
                <Input 
                  placeholder="e.g. 1,000" 
                  value={surgeryDeposit}
                  onChange={(e) => setSurgeryDeposit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Medication (Php)</Label>
                <Input 
                  placeholder="e.g. 1,200" 
                  value={surgeryMedication}
                  onChange={(e) => setSurgeryMedication(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Balance (Php)</Label>
                <Input 
                  placeholder="e.g. 2,800" 
                  value={surgeryBalance}
                  onChange={(e) => setSurgeryBalance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Laboratory Test(s) (Php)</Label>
                <Input 
                  placeholder="e.g. 1,500" 
                  value={surgeryLabTests}
                  onChange={(e) => setSurgeryLabTests(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-primary">TOTAL AMOUNT (Php)</Label>
                <Input 
                  className="border-primary ring-offset-primary"
                  placeholder="e.g. 6,500" 
                  value={surgeryTotal}
                  onChange={(e) => setSurgeryTotal(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSurgeryDialog(false)}>Cancel</Button>
              <Button onClick={() => { generateSurgery(); setShowSurgeryDialog(false); }}>
                Generate PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
