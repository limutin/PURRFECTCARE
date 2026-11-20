import React, { useState, useEffect } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { projectId, publicAnonKey, getFunctionUrl } from '../../utils/supabase/info';
import { api, blobToBase64 } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
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
  const [petSearch, setPetSearch] = useState('');

  // Walk-in (unregistered) client mode
  const [walkInMode, setWalkInMode] = useState(false);
  const [walkIn, setWalkIn] = useState({
    owner_name: '', owner_address: '', owner_contact: '', owner_email: '',
    pet_name: '', type: 'Dog', breed: '', color: '', sex: 'male', birthday: '', weight: '',
  });
  const updateWalkIn = (field: keyof typeof walkIn, value: string) =>
    setWalkIn(prev => ({ ...prev, [field]: value }));

  // Returns the pet/owner the form is being generated for (registered or walk-in)
  const getSubject = (): { pet: any; owner: any } | null => {
    if (walkInMode) {
      if (!walkIn.pet_name.trim() || !walkIn.owner_name.trim()) return null;
      return {
        pet: {
          value: {
            id: 'walk-in', name: walkIn.pet_name.trim(), type: walkIn.type || 'Dog', breed: walkIn.breed,
            color: walkIn.color, sex: walkIn.sex, birthday: walkIn.birthday || null, weight: walkIn.weight,
          },
        },
        owner: {
          value: {
            name: walkIn.owner_name.trim(), address: walkIn.owner_address,
            contact: walkIn.owner_contact, email: walkIn.owner_email,
          },
        },
      };
    }
    const pet = pets.find(p => p.value.id === selectedPet);
    if (!pet) return null;
    const owner = owners.find(o => o.value.id === pet.value.owner_id);
    return { pet, owner };
  };
  const hasSubject = !!getSubject();

  // Keep a copy of every generated document in the patient's file (non-blocking)
  const archiveDocument = async (out: Blob, fileName: string, docType: string, pet: any, owner: any) => {
    try {
      await api('/documents', accessToken, {
        body: {
          pet_id: walkInMode ? null : pet?.value?.id || null,
          pet_name: pet?.value?.name || '',
          owner_name: owner?.value?.name || '',
          doc_type: docType,
          file_name: fileName,
          content_base64: await blobToBase64(out),
        },
      });
      if (walkInMode) setLastWalkInDoc(docType);
    } catch (e: any) {
      toast.warning('Downloaded, but a copy could not be saved to the patient file: ' + e.message);
    }
  };

  // Walk-in → registered client
  const [lastWalkInDoc, setLastWalkInDoc] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const registerWalkIn = async () => {
    if (!walkIn.owner_name.trim() || !walkIn.pet_name.trim()) {
      toast.error('Owner name and pet name are required');
      return;
    }
    setRegistering(true);
    try {
      await api('/owners', accessToken, {
        body: {
          owner: { name: walkIn.owner_name.trim(), address: walkIn.owner_address, contact: walkIn.owner_contact, email: walkIn.owner_email },
          pet: {
            name: walkIn.pet_name.trim(), type: walkIn.type, breed: walkIn.breed, color: walkIn.color, sex: walkIn.sex,
            birthday: walkIn.birthday || null, weight: walkIn.weight ? parseFloat(walkIn.weight) : null,
          },
        },
      });
      toast.success(`${walkIn.owner_name} and ${walkIn.pet_name} are now registered clients`);
      setLastWalkInDoc(null);
      setWalkInMode(false);
      setWalkIn({ owner_name: '', owner_address: '', owner_contact: '', owner_email: '', pet_name: '', type: 'Dog', breed: '', color: '', sex: 'male', birthday: '', weight: '' });
      fetchData();
    } catch (e: any) {
      toast.error('Could not register: ' + e.message);
    } finally {
      setRegistering(false);
    }
  };

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
  const [vhcVaccineDate, setVhcVaccineDate] = useState(todayLocal());
  const [showVhcDialog, setShowVhcDialog] = useState(false);
  const [loadingControlNo, setLoadingControlNo] = useState(false);

  // Increments the trailing number of a control no. ("2026-007" -> "2026-008").
  // Starts a fresh sequence when the year changes.
  const incrementControlNo = (last: string | null) => {
    const year = String(new Date().getFullYear());
    if (!last) return `${year}-001`;
    const m = last.match(/^(.*?)(\d+)$/);
    if (!m) return `${year}-001`;
    if (/^\d{4}-$/.test(m[1]) && m[1] !== `${year}-`) return `${year}-001`;
    return `${m[1]}${String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0')}`;
  };

  const LAST_CONTROL_KEY = 'purrfectcare_last_vhc_control_no';
  const readLocalControl = () => { try { return localStorage.getItem(LAST_CONTROL_KEY); } catch { return null; } };

  const loadNextControlNo = async () => {
    setLoadingControlNo(true);
    let last: string | null = null;
    try {
      const res = await fetch(getFunctionUrl('/vhc/last-control'), {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
      });
      if (res.ok) last = (await res.json()).control_no || null;
    } catch { /* fall back to this device's last number */ }
    const local = readLocalControl();
    // Prefer whichever is further along (server is shared, local covers offline use)
    if (!last || (local && local.localeCompare(last, undefined, { numeric: true }) > 0)) last = local;
    setVhcControlNo(incrementControlNo(last));
    setLoadingControlNo(false);
  };

  const recordIssuedVhc = async (controlNo: string, petId: string | null, petName: string, ownerName: string) => {
    if (!controlNo) return;
    try { localStorage.setItem(LAST_CONTROL_KEY, controlNo); } catch { /* ignore */ }
    try {
      await fetch(getFunctionUrl('/vhc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
        body: JSON.stringify({
          control_no: controlNo, pet_id: petId, pet_name: petName, owner_name: ownerName,
          vaccine_used: vhcVaccineUsed, vaccine_date: vhcVaccineDate, destination: vhcDestination,
        }),
      });
    } catch { /* non-blocking */ }
  };

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

  // Promissory Note specific states
  const [promissoryBalance, setPromissoryBalance] = useState('');
  const [promissoryBalanceWords, setPromissoryBalanceWords] = useState('');
  const [promissoryService, setPromissoryService] = useState('');
  const [promissoryServiceDate, setPromissoryServiceDate] = useState(todayLocal());
  const [promissoryPaymentDate, setPromissoryPaymentDate] = useState('');
  const [promissoryContactNumber, setPromissoryContactNumber] = useState('');
  const [promissoryValidId, setPromissoryValidId] = useState('');
  const [showPromissoryDialog, setShowPromissoryDialog] = useState(false);

  // Authorization specific states
  const [authVaccine, setAuthVaccine] = useState(false);
  const [authTreatment, setAuthTreatment] = useState(false);
  const [authMedical, setAuthMedical] = useState(false);
  const [authOther, setAuthOther] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Refusal specific states
  const [refusalTreatment, setRefusalTreatment] = useState(false);
  const [refusalTreatmentDesc, setRefusalTreatmentDesc] = useState('');
  const [refusalPresurgical, setRefusalPresurgical] = useState(false);
  const [refusalCbc, setRefusalCbc] = useState(false);
  const [refusalUrinalysis, setRefusalUrinalysis] = useState(false);
  const [refusalSerum, setRefusalSerum] = useState(false);
  const [refusalRadiographs, setRefusalRadiographs] = useState(false);
  const [refusalRadiographsDesc, setRefusalRadiographsDesc] = useState('');
  const [refusalOther, setRefusalOther] = useState(false);
  const [refusalContactNo, setRefusalContactNo] = useState('');
  const [showRefusalDialog, setShowRefusalDialog] = useState(false);

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
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
          species_lower: (pet.value.type || '').toLowerCase(),
          breed: pet.value.breed || '',
          color: pet.value.color || '',
          sex: (pet.value.sex || '').toUpperCase(),
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
        archiveDocument(out, link.download, 'Health Certificate (VHC)', pet, owner);

        recordIssuedVhc(vhcControlNo, walkInMode ? null : pet.value.id, pet.value.name, owner?.value.name || '');
        toast.success("VHC Document generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateEuthanasia = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
        archiveDocument(out, link.download, 'Consent for Euthanasia', pet, owner);

        toast.success("Euthanasia Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateWaiver = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
        archiveDocument(out, link.download, 'Waiver of Release', pet, owner);

        toast.success("Waiver of Release form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateGrooming = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
        archiveDocument(out, link.download, 'Grooming Agreement', pet, owner);

        toast.success("Grooming Agreement generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateConfinement = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
        archiveDocument(out, link.download, 'Consent for Confinement', pet, owner);

        toast.success("Confinement Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generateSurgery = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;

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
        archiveDocument(out, link.download, 'Consent for Surgery', pet, owner);

        toast.success("Surgery Consent form generated successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error("Error generating document: " + err.message);
      }
    });
  };

  const generatePromissory = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;
    if (!pet) return;

    toast.info('Preparing Promissory Note...');

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + '?t=' + new Date().getTime())
        .then(res => { if (!res.ok) throw new Error('Fetch failed: ' + res.statusText); return res.arrayBuffer(); })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile('/PromissoryNote_Template.docx', (error, content) => {
      if (error) { toast.error('Failed to load template'); return; }
      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const formatDate = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
        };
        const signDate = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        doc.render({
          owner_name: owner?.value.name || '',
          owner_address: owner?.value.address || '',
          balance_label: promissoryBalanceWords,
          balance_amount: promissoryBalance,
          service_description: promissoryService,
          service_date: formatDate(promissoryServiceDate),
          payment_date: formatDate(promissoryPaymentDate),
          sign_day: signDate.getDate().toString(),
          sign_month: monthNames[signDate.getMonth()],
          sign_year_2dig: signDate.getFullYear().toString().slice(-2),
          contact_number: promissoryContactNumber,
          valid_id: promissoryValidId,
        });

        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PromissoryNote_${owner?.value.name || pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        archiveDocument(out, link.download, 'Promissory Note', pet, owner);

        toast.success('Promissory Note generated successfully!');
      } catch (err: any) {
        console.error(err);
        toast.error('Error generating document: ' + err.message);
      }
    });
  };

  const generateAuthorization = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;
    if (!pet) return;

    toast.info('Preparing Authorization...');

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + '?t=' + new Date().getTime())
        .then(res => { if (!res.ok) throw new Error('Fetch failed: ' + res.statusText); return res.arrayBuffer(); })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile('/Authorization_Template.docx', (error: any, content: any) => {
      if (error) { toast.error('Failed to load template'); return; }
      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        doc.render({
          date: formattedDate,
          owner_name: owner?.value.name || '',
          pet_name: pet.value.name || '',
          chk_vaccine: authVaccine ? '✓' : ' ',
          chk_treatment: authTreatment ? '✓' : ' ',
          chk_medical: authMedical ? '✓' : ' ',
          chk_other: authOther ? '✓' : ' ',
        });

        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Authorization_${owner?.value.name || pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        archiveDocument(out, link.download, 'Authorization Form', pet, owner);

        toast.success('Authorization form generated successfully!');
      } catch (err: any) {
        console.error(err);
        toast.error('Error generating document: ' + err.message);
      }
    });
  };

  const generateRefusal = () => {
    const subject = getSubject();
    if (!subject) { toast.error('Select a patient or complete the walk-in details first'); return; }
    const { pet, owner } = subject;
    if (!pet) return;

    toast.info('Preparing Refusal Form...');

    const loadFile = (url: string, callback: (err: any, data: any) => void) => {
      fetch(url + '?t=' + new Date().getTime())
        .then(res => { if (!res.ok) throw new Error('Fetch failed: ' + res.statusText); return res.arrayBuffer(); })
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    };

    loadFile('/Refusal_Template.docx', (error: any, content: any) => {
      if (error) { toast.error('Failed to load template'); return; }
      try {
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        doc.render({
          date: formattedDate,
          owner_name: owner?.value.name || '',
          pet_name: pet.value.name || '',
          chk_treatment: refusalTreatment ? '✓' : ' ',
          treatment_desc: refusalTreatmentDesc,
          chk_presurgical: refusalPresurgical ? '✓' : ' ',
          chk_cbc: refusalCbc ? '✓' : ' ',
          chk_urinalysis: refusalUrinalysis ? '✓' : ' ',
          chk_serum: refusalSerum ? '✓' : ' ',
          chk_radiographs: refusalRadiographs ? '✓' : ' ',
          radiographs_desc: refusalRadiographsDesc,
          chk_other: refusalOther ? '✓' : ' ',
          owner_address: owner?.value.address || '',
          contact_number: refusalContactNo,
        });

        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const url = URL.createObjectURL(out);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Refusal_${owner?.value.name || pet.value.name}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        archiveDocument(out, link.download, 'Refusal of Treatment', pet, owner);

        toast.success('Refusal form generated successfully!');
      } catch (err: any) {
        console.error(err);
        toast.error('Error generating document: ' + err.message);
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
            <CardDescription>Choose a registered patient, or fill in details for a walk-in client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-background/70 border">
                <button
                  type="button"
                  onClick={() => setWalkInMode(false)}
                  className={`h-9 rounded-md text-sm font-semibold transition-colors ${!walkInMode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Registered
                </button>
                <button
                  type="button"
                  onClick={() => setWalkInMode(true)}
                  className={`h-9 rounded-md text-sm font-semibold transition-colors ${walkInMode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Walk-in
                </button>
              </div>

              {!walkInMode && (
              <div className="space-y-2 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by pet or owner name..."
                    value={petSearch}
                    onChange={(e) => setPetSearch(e.target.value)}
                    className="bg-background border-none shadow-sm h-12 pl-10 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                
                {petSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-xl max-h-[300px] overflow-y-auto">
                    {pets
                      .filter(pet => {
                        const owner = owners.find(o => o.value.id === pet.value.owner_id);
                        const s = petSearch.toLowerCase();
                        return pet.value.name.toLowerCase().includes(s) || 
                               owner?.value.name.toLowerCase().includes(s);
                      })
                      .map((pet) => {
                        const owner = owners.find((o) => o.value.id === pet.value.owner_id);
                        const isSelected = selectedPet === pet.value.id;
                        return (
                          <div 
                            key={pet.key} 
                            onClick={() => {
                              setSelectedPet(pet.value.id);
                              setPetSearch('');
                            }}
                            className={`px-4 py-3 cursor-pointer border-b border-muted last:border-0 hover:bg-primary/5 transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-primary">{pet.value.name}</span>
                              <span className="text-[10px] text-muted-foreground font-medium uppercase truncate">
                                Owner: {owner?.value.name || 'N/A'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    {pets.filter(pet => {
                      const owner = owners.find(o => o.value.id === pet.value.owner_id);
                      const s = petSearch.toLowerCase();
                      return pet.value.name.toLowerCase().includes(s) || 
                             owner?.value.name.toLowerCase().includes(s);
                    }).length === 0 && (
                      <div className="px-4 py-3 text-sm text-center text-muted-foreground">
                        No matches found
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {walkInMode && (
                <div className="p-4 rounded-xl bg-background/50 border border-dashed border-primary/20 text-xs text-muted-foreground leading-relaxed">
                  Walk-in details are used for the document only. Use <b>Register as client</b> if they will come back.
                  Owner name and pet name are required.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {walkInMode && (
          <Card className="lg:col-span-2 border-none shadow-premium">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Walk-in Client Details</CardTitle>
              <CardDescription>Enter the details that should appear on the document.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Owner</Label>
                  <Input placeholder="Owner full name *" value={walkIn.owner_name} onChange={e => updateWalkIn('owner_name', e.target.value)} />
                  <Input placeholder="Address" value={walkIn.owner_address} onChange={e => updateWalkIn('owner_address', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Contact no." value={walkIn.owner_contact} onChange={e => updateWalkIn('owner_contact', e.target.value)} />
                    <Input placeholder="Email" type="email" value={walkIn.owner_email} onChange={e => updateWalkIn('owner_email', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Pet</Label>
                  <Input placeholder="Pet name *" value={walkIn.pet_name} onChange={e => updateWalkIn('pet_name', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={walkIn.type} onValueChange={v => updateWalkIn('type', v)}>
                      <SelectTrigger><SelectValue placeholder="Species" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={walkIn.sex} onValueChange={v => updateWalkIn('sex', v)}>
                      <SelectTrigger><SelectValue placeholder="Sex" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Breed" value={walkIn.breed} onChange={e => updateWalkIn('breed', e.target.value)} />
                    <Input placeholder="Color" value={walkIn.color} onChange={e => updateWalkIn('color', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Birthday</span>
                      <Input type="date" value={walkIn.birthday} onChange={e => updateWalkIn('birthday', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Weight (kg)</span>
                      <Input type="number" step="0.1" value={walkIn.weight} onChange={e => updateWalkIn('weight', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`mt-5 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${lastWalkInDoc ? 'border-teal-200 bg-teal-50' : 'bg-muted/40'}`}>
                <div className="flex-1 text-sm">
                  {lastWalkInDoc
                    ? <><b className="text-teal-800">{lastWalkInDoc} generated.</b> <span className="text-muted-foreground">Will this client come back? Save them so their records start here.</span></>
                    : <span className="text-muted-foreground">Coming back for future visits? Save this walk-in as a registered client.</span>}
                </div>
                <Button type="button" variant={lastWalkInDoc ? 'default' : 'outline'} onClick={registerWalkIn} disabled={registering || !walkIn.owner_name.trim() || !walkIn.pet_name.trim()}>
                  {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <User className="w-4 h-4 mr-2" />}
                  Register as client
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={`lg:col-span-2 border-none shadow-premium transition-all duration-500 overflow-hidden ${walkInMode ? 'hidden' : ''}`}>
          {!selectedPet && !walkInMode && (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No patient selected</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Search for a registered patient on the left, or switch to Walk-in to enter details manually. The forms below unlock once a patient is chosen.
                </p>
              </div>
            </div>
          )}
          {selectedPet && !walkInMode && (
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
        <Dialog open={showVhcDialog} onOpenChange={(open: boolean) => { setShowVhcDialog(open); if (open) loadNextControlNo(); }}>
          <Card className="group relative overflow-hidden transition-colors hover:border-primary/40">
            <CardHeader className="pb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-green-50 text-green-700 border-green-200`}>
                <FileText className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold">Health Certificate</CardTitle>
              <CardDescription className="leading-relaxed min-h-[60px]">Official Veterinary Health Certificate (VHC) for travel, transport, or general health clearance.</CardDescription>
            </CardHeader>
            <CardContent>
              <DialogTrigger asChild>
                <Button
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate certificate
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
                    placeholder={loadingControlNo ? "Loading..." : "e.g. 2026-001"}
                    value={vhcControlNo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVhcControlNo(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Auto-filled with the next number. Edit if needed.</p>
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
                Generate document
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
          <Card key={form.id} className="group relative overflow-hidden transition-colors hover:border-primary/40">
            <CardHeader className="pb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${form.color}`}>
                <FileText className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold">{form.title}</CardTitle>
              <CardDescription className="leading-relaxed min-h-[60px]">{form.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={form.action}
                disabled={!hasSubject}
                className="w-full h-10 font-medium"
              >
                <FilePlus className="w-4 h-4 mr-2" />
                Generate form
              </Button>
            </CardContent>
          </Card>
        ))}

        <Dialog open={showConfinementDialog} onOpenChange={setShowConfinementDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 border-indigo-100">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-indigo-50 text-indigo-700 border-indigo-200">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold">Consent for Confinement</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official consent for pet confinement, documenting treatment estimates and owner responsibilities.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate form
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
                Generate document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSurgeryDialog} onOpenChange={setShowSurgeryDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 border-blue-100">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-blue-50 text-blue-700 border-blue-200">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold">Consent for Surgery</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official consent for surgical procedures, documenting risks, costs, and owner authorization.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate form
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
                Generate document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPromissoryDialog} onOpenChange={setShowPromissoryDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 border-amber-100">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-amber-50 text-amber-700 border-amber-200">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold">Promissory Note</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official payment commitment form documenting the owner's promise to settle outstanding balances.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate form
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Promissory Note Details
              </DialogTitle>
              <DialogDescription>
                Provide the balance and service details for the promissory note.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Balance Amount (Php)</Label>
                  <Input
                    placeholder="e.g. 2,500"
                    value={promissoryBalance}
                    onChange={(e) => setPromissoryBalance(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Amount in Words</Label>
                  <Input
                    placeholder="e.g. Two Thousand Five Hundred"
                    value={promissoryBalanceWords}
                    onChange={(e) => setPromissoryBalanceWords(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Service Description</Label>
                <Input
                  placeholder="e.g. grooming / surgery / confinement"
                  value={promissoryService}
                  onChange={(e) => setPromissoryService(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Date of Service / Visit</Label>
                <Input
                  type="date"
                  value={promissoryServiceDate}
                  onChange={(e) => setPromissoryServiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Agreed Payment Date</Label>
                <Input
                  type="date"
                  value={promissoryPaymentDate}
                  onChange={(e) => setPromissoryPaymentDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Contact Numbers</Label>
                  <Input
                    placeholder="e.g. 09123456789"
                    value={promissoryContactNumber}
                    onChange={(e) => setPromissoryContactNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Valid ID Presented</Label>
                  <Input
                    placeholder="e.g. Driver's License"
                    value={promissoryValidId}
                    onChange={(e) => setPromissoryValidId(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPromissoryDialog(false)}>Cancel</Button>
              <Button onClick={() => { generatePromissory(); setShowPromissoryDialog(false); }}>
                Generate document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Authorization Dialog */}
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 border-pink-100">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-pink-50 text-pink-700 border-pink-200">
                  <Activity className="w-6 h-6" />
                </div>
                <CardTitle className="text-base font-semibold">Authorization Form</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official medical authorization form for Treatments, Vaccinations, and Medical Tests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate form
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Select Authorized Procedures
              </DialogTitle>
              <DialogDescription>
                Toggle the checkmarks to indicate which procedures the owner is authorizing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md shadow-sm border cursor-pointer hover:bg-muted" onClick={() => setAuthVaccine(!authVaccine)}>
                <input type="checkbox" checked={authVaccine} onChange={() => {}} className="w-5 h-5 accent-primary cursor-pointer rounded-sm" />
                <Label className="cursor-pointer font-medium text-sm">Vaccination</Label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md shadow-sm border cursor-pointer hover:bg-muted" onClick={() => setAuthTreatment(!authTreatment)}>
                <input type="checkbox" checked={authTreatment} onChange={() => {}} className="w-5 h-5 accent-primary cursor-pointer rounded-sm" />
                <Label className="cursor-pointer font-medium text-sm">Treatment</Label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md shadow-sm border cursor-pointer hover:bg-muted" onClick={() => setAuthMedical(!authMedical)}>
                <input type="checkbox" checked={authMedical} onChange={() => {}} className="w-5 h-5 accent-primary cursor-pointer rounded-sm" />
                <Label className="cursor-pointer font-medium text-sm">Medical Test(s)</Label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md shadow-sm border cursor-pointer hover:bg-muted" onClick={() => setAuthOther(!authOther)}>
                <input type="checkbox" checked={authOther} onChange={() => {}} className="w-5 h-5 accent-primary cursor-pointer rounded-sm" />
                <Label className="cursor-pointer font-medium text-sm">Other</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancel</Button>
              <Button onClick={() => { generateAuthorization(); setShowAuthDialog(false); }}>
                Generate document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refusal Dialog */}
        <Dialog open={showRefusalDialog} onOpenChange={setShowRefusalDialog}>
          <DialogTrigger asChild>
            <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 border-amber-100">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border bg-amber-50 text-amber-700 border-amber-200">
                  <Activity className="w-6 h-6" />
                </div>
                <CardTitle className="text-base font-semibold">Refusal of Treatment</CardTitle>
                <CardDescription className="leading-relaxed min-h-[60px]">Official medical form documenting the owner's refusal of optional treatments or medical tests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  disabled={!hasSubject}
                  className="w-full h-10 font-medium"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate form
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Select Refused Procedures
              </DialogTitle>
              <DialogDescription>
                Indicate which treatments or tests the owner is refusing, providing descriptions where necessary.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 md:col-span-1 space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50 shadow-sm">
                <Label className="uppercase text-xs font-bold text-muted-foreground mb-1 block">Treatments</Label>
                <div className="flex items-start gap-2 space-x-2">
                  <input type="checkbox" checked={refusalTreatment} onChange={() => setRefusalTreatment(!refusalTreatment)} className="w-5 h-5 mt-1 accent-amber-600 cursor-pointer rounded-sm" />
                  <div className="space-y-1 block w-full">
                    <Label className="cursor-pointer font-medium text-sm block" onClick={() => setRefusalTreatment(!refusalTreatment)}>Treatment</Label>
                    <Input 
                      placeholder="Describe treatment..." 
                      className="h-8 text-sm w-full" 
                      value={refusalTreatmentDesc} 
                      onChange={(e) => setRefusalTreatmentDesc(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={refusalPresurgical} onChange={() => setRefusalPresurgical(!refusalPresurgical)} className="w-5 h-5 accent-amber-600 cursor-pointer rounded-sm" />
                  <Label className="cursor-pointer font-medium text-sm" onClick={() => setRefusalPresurgical(!refusalPresurgical)}>Presurgical Screen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={refusalOther} onChange={() => setRefusalOther(!refusalOther)} className="w-5 h-5 accent-amber-600 cursor-pointer rounded-sm" />
                  <Label className="cursor-pointer font-medium text-sm" onClick={() => setRefusalOther(!refusalOther)}>Other</Label>
                </div>
                <div className="pt-2 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Emergency Contact / Phone</Label>
                  <Input 
                    placeholder="e.g. 0912 345 6789" 
                    value={refusalContactNo} 
                    onChange={(e) => setRefusalContactNo(e.target.value)} 
                    className="h-9"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50 shadow-sm">
                <Label className="uppercase text-xs font-bold text-muted-foreground mb-1 block">Diagnostics & Tests</Label>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={refusalCbc} onChange={() => setRefusalCbc(!refusalCbc)} className="w-5 h-5 accent-amber-600 cursor-pointer rounded-sm" />
                  <Label className="cursor-pointer font-medium text-sm" onClick={() => setRefusalCbc(!refusalCbc)}>Complete Blood Count (CBC)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={refusalUrinalysis} onChange={() => setRefusalUrinalysis(!refusalUrinalysis)} className="w-5 h-5 accent-amber-600 cursor-pointer rounded-sm" />
                  <Label className="cursor-pointer font-medium text-sm" onClick={() => setRefusalUrinalysis(!refusalUrinalysis)}>Urinalysis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={refusalSerum} onChange={() => setRefusalSerum(!refusalSerum)} className="w-5 h-5 accent-amber-600 cursor-pointer rounded-sm" />
                  <Label className="cursor-pointer font-medium text-sm" onClick={() => setRefusalSerum(!refusalSerum)}>Serum Chemistry Profile</Label>
                </div>
                <div className="flex items-start gap-2 space-x-2 pt-1 border-t border-border/50 mt-2">
                  <input type="checkbox" checked={refusalRadiographs} onChange={() => setRefusalRadiographs(!refusalRadiographs)} className="w-5 h-5 mt-1 accent-amber-600 cursor-pointer rounded-sm" />
                  <div className="space-y-1 block w-full">
                    <Label className="cursor-pointer font-medium text-sm block" onClick={() => setRefusalRadiographs(!refusalRadiographs)}>Radiographs</Label>
                    <Input 
                      placeholder="Describe radiographs..." 
                      className="h-8 text-sm w-full" 
                      value={refusalRadiographsDesc} 
                      onChange={(e) => setRefusalRadiographsDesc(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowRefusalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => { generateRefusal(); setShowRefusalDialog(false); }}>
                Generate document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
