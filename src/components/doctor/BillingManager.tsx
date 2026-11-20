import React, { useState, useEffect, useMemo } from 'react';
import { api, peso } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { PetAvatar } from '../shared/PetAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Plus, Printer, Loader2, Pill, Clock, Receipt, Trash2, CheckCircle2, Search, Stethoscope,
  Wallet, Undo2, AlertCircle, CalendarCheck, Banknote, Smartphone, CreditCard, Landmark, CircleDollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface BillingManagerProps {
  accessToken: string;
}

const PAYMENT_METHODS: { value: string; label: string; icon: any }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'gcash', label: 'GCash', icon: Smartphone },
  { value: 'maya', label: 'Maya', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank', label: 'Bank transfer', icon: Landmark },
  { value: 'other', label: 'Other', icon: CircleDollarSign },
];

const methodLabel = (m?: string | null) =>
  PAYMENT_METHODS.find((p) => p.value === m)?.label || (m ? m : '—');

const SERVICE_CATEGORIES = ['Consultation', 'Preventive', 'Grooming', 'Laboratory', 'Surgery', 'Confinement', 'Other'];

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '';

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type ProductLine = { inventory_id: string; quantity: number | string };
type ServiceLine = { service_id: string; quantity: number | string; unit_price: string };
type Filter = 'all' | 'unpaid' | 'paid';

export function BillingManager({ accessToken }: BillingManagerProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Create bill form
  const [petId, setPetId] = useState('');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [selectedItems, setSelectedItems] = useState<ProductLine[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceLine[]>([]);

  // Record payment dialog
  const [payBill, setPayBill] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState('cash');

  useEffect(() => {
    if (!diagnosisId) return;
    const selectedDiagnosis = diagnoses.find((d) => d.value.id === diagnosisId || d.key === diagnosisId);
    const meds = selectedDiagnosis?.value?.medications || [];
    if (meds.length) {
      setSelectedItems(meds.filter((m: any) => m.inventory_id).map((m: any) => ({ inventory_id: m.inventory_id, quantity: m.quantity || 1 })));
      toast.info('Medications from the diagnosis were added to this bill.');
    }
  }, [diagnosisId, diagnoses]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [billsData, petsData, ownersData, diagnosesData, inventoryData, servicesData] = await Promise.all([
        api('/billing', accessToken),
        api('/pets', accessToken),
        api('/owners', accessToken),
        api('/diagnoses', accessToken),
        api('/inventory', accessToken),
        api('/services', accessToken).catch(() => ({ services: [] })),
      ]);
      setBills(billsData.bills || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
      setDiagnoses(diagnosesData.diagnoses || []);
      setInventory(inventoryData.inventory || []);
      setServices(servicesData.services || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const petById = (id: string) => pets.find((p) => p.value.id === id);
  const ownerOfPet = (pet: any) => owners.find((o) => o.value.id === pet?.value.owner_id);
  const invById = (id: string) => inventory.find((i) => i.value.id === id);
  const svcById = (id: string) => services.find((s) => s.id === id);

  const activeServicesByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const s of services.filter((x) => x.active !== false)) {
      const cat = SERVICE_CATEGORIES.includes(s.category) ? s.category : 'Other';
      (groups[cat] ||= []).push(s);
    }
    Object.values(groups).forEach((g) => g.sort((a, b) => a.name.localeCompare(b.name)));
    return SERVICE_CATEGORIES.filter((c) => groups[c]?.length).map((c) => ({ category: c, items: groups[c] }));
  }, [services]);

  // ---------- Form helpers ----------
  const updateItem = (index: number, patch: Partial<ProductLine>) =>
    setSelectedItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const updateService = (index: number, patch: Partial<ServiceLine>) =>
    setSelectedServices((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const productsTotal = selectedItems.reduce((sum, it) => {
    const inv = invById(it.inventory_id);
    return sum + (inv ? Number(inv.value.price || 0) * Number(it.quantity || 0) : 0);
  }, 0);
  const servicesTotal = selectedServices.reduce(
    (sum, s) => sum + (s.service_id ? Number(s.unit_price || 0) * Number(s.quantity || 0) : 0),
    0,
  );
  const consultNum = Number(consultationFee || 0);
  const liveTotal = consultNum + productsTotal + servicesTotal;

  const resetForm = () => {
    setPetId('');
    setDiagnosisId('');
    setConsultationFee('500');
    setSelectedItems([]);
    setSelectedServices([]);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) {
      toast.error('Please choose a patient');
      return;
    }
    setSaving(true);
    try {
      await api('/billing', accessToken, {
        method: 'POST',
        body: {
          pet_id: petId,
          diagnosis_id: diagnosisId || undefined,
          consultation_fee: consultNum,
          items: selectedItems
            .filter((it) => it.inventory_id && Number(it.quantity) > 0)
            .map((it) => ({ inventory_id: it.inventory_id, quantity: Number(it.quantity) })),
          services: selectedServices
            .filter((s) => s.service_id && Number(s.quantity) > 0)
            .map((s) => ({
              service_id: s.service_id,
              quantity: Number(s.quantity),
              unit_price: s.unit_price === '' ? undefined : Number(s.unit_price),
            })),
        },
      });
      toast.success('Bill created');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating bill:', error);
      toast.error(error?.message || 'Failed to create bill');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Payment ----------
  const openPayment = (bill: any) => {
    setPayMethod('cash');
    setPayBill(bill);
  };

  const handleRecordPayment = async () => {
    if (!payBill) return;
    const id = payBill.value.id;
    setUpdatingId(id);
    try {
      await api(`/billing/${encodeURIComponent(id)}/pay`, accessToken, { method: 'POST', body: { payment_method: payMethod } });
      toast.success(`Payment recorded (${methodLabel(payMethod)})`);
      setPayBill(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record payment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkUnpaid = async (bill: any) => {
    if (!window.confirm('Mark this bill as unpaid? The recorded payment will be removed.')) return;
    const id = bill.value.id;
    setUpdatingId(id);
    try {
      await api(`/billing/${encodeURIComponent(id)}/unpay`, accessToken, { method: 'POST', body: {} });
      toast.success('Bill marked as unpaid');
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update bill');
    } finally {
      setUpdatingId(null);
    }
  };

  // ---------- Receipt ----------
  const handlePrintReceipt = (bill: any) => {
    const pet = petById(bill.value.pet_id);
    const owner = ownerOfPet(pet);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items: any[] = bill.value.items || [];
    const serviceLines = items.filter((i) => i.item_type === 'service');
    const productLines = items.filter((i) => i.item_type !== 'service');
    const svcTotal = serviceLines.reduce((s, i) => s + Number(i.subtotal || 0), 0);
    const prodTotal = productLines.reduce((s, i) => s + Number(i.subtotal || 0), 0);
    const consult = Number(bill.value.consultation_fee || 0);
    const isPaid = bill.value.status === 'paid';
    const row = (name: string, qty: any, price: any, amount: any) => `
      <div class="item-row">
        <span>${esc(name)}</span>
        <span>${esc(qty)}</span>
        <span>${peso(price)}</span>
        <span>${peso(amount)}</span>
      </div>`;
    const groupTitle = (t: string) => `<div class="group-title">${t}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${esc(bill.value.id)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; display: flex; justify-content: center; background: #f5f5f5; }
            .receipt { width: 320px; background: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .receipt-header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px; }
            .receipt-header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px; }
            .receipt-header .subtitle { font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; }
            .receipt-header .address { font-size: 10px; color: #666; margin-top: 4px; }
            .receipt-header .tagline { font-size: 10px; color: #888; margin-top: 6px; font-style: italic; }
            .receipt-meta { text-align: center; font-size: 11px; color: #555; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
            .receipt-meta p { margin: 2px 0; }
            .receipt-meta .receipt-no { font-weight: 700; font-size: 13px; color: #333; margin-top: 4px; }
            .info-section { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
            .info-section .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; color: #333; }
            .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; color: #444; }
            .info-row .label { color: #777; min-width: 80px; }
            .info-row .value { font-weight: 600; text-align: right; flex: 1; color: #222; }
            .items-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0; border-bottom: 1px solid #333; border-top: 1px solid #333; margin-bottom: 6px; color: #333; }
            .items-header span:first-child, .item-row span:first-child { flex: 2; }
            .items-header span:nth-child(2), .item-row span:nth-child(2) { flex: 0.5; text-align: center; }
            .items-header span:nth-child(3), .item-row span:nth-child(3) { flex: 1; text-align: right; }
            .items-header span:last-child, .item-row span:last-child { flex: 1; text-align: right; }
            .item-row { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #444; }
            .item-row span:last-child { font-weight: 600; }
            .group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #777; margin-top: 8px; }
            .subtotals { border-top: 1px dashed #999; margin-top: 10px; padding-top: 8px; }
            .subtotal-row { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; color: #555; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 8px; padding: 8px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; color: #111; }
            .status-badge { text-align: center; margin: 15px 0 6px; padding: 6px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border: 2px solid; }
            .status-paid { color: #059669; border-color: #059669; background: #ecfdf5; }
            .status-unpaid { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
            .pay-info { text-align: center; font-size: 11px; color: #444; margin-bottom: 10px; }
            .receipt-footer { text-align: center; margin-top: 15px; padding-top: 15px; border-top: 2px dashed #333; }
            .receipt-footer .thanks { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
            .receipt-footer .notice { font-size: 9px; color: #888; margin-top: 4px; }
            .paw-divider { text-align: center; font-size: 10px; color: #ccc; letter-spacing: 4px; margin: 8px 0; }
            @media print {
              body { background: #fff; padding: 0; }
              .receipt { box-shadow: none; width: 100%; max-width: 320px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="receipt-header">
              <h1>PURRFECTCARE</h1>
              <div class="subtitle">Veterinary Clinic</div>
              <div class="address">Barrientos Street, Layawan, Oroquieta City</div>
              <div class="tagline">Caring for your furry family members</div>
            </div>

            <div class="receipt-meta">
              <p><strong>OFFICIAL RECEIPT</strong></p>
              <p>Date: ${esc(formatDate(bill.value.created_at))}</p>
              <p class="receipt-no">No. ${esc(String(bill.value.id).substring(0, 14).toUpperCase())}</p>
            </div>

            <div class="info-section">
              <div class="section-title">🐾 Patient Information</div>
              <div class="info-row"><span class="label">Name:</span><span class="value">${esc(pet?.value.name || 'N/A')}</span></div>
              <div class="info-row"><span class="label">Species:</span><span class="value">${esc(pet?.value.type || 'N/A')}</span></div>
              <div class="info-row"><span class="label">Sex:</span><span class="value">${esc(pet?.value.sex ? pet.value.sex.charAt(0).toUpperCase() + pet.value.sex.slice(1) : 'N/A')}</span></div>
              <div class="info-row"><span class="label">Weight:</span><span class="value">${esc(pet?.value.weight ? pet.value.weight + ' kg' : 'N/A')}</span></div>
            </div>

            <div class="info-section">
              <div class="section-title">👤 Owner Information</div>
              <div class="info-row"><span class="label">Name:</span><span class="value">${esc(owner?.value.name || 'N/A')}</span></div>
              <div class="info-row"><span class="label">Contact:</span><span class="value">${esc(owner?.value.contact || 'N/A')}</span></div>
              <div class="info-row"><span class="label">Address:</span><span class="value">${esc(owner?.value.address || 'N/A')}</span></div>
            </div>

            <div class="items-header">
              <span>Item</span><span>Qty</span><span>Price</span><span>Amount</span>
            </div>

            ${consult > 0 ? row('Consultation Fee', 1, consult, consult) : ''}
            ${serviceLines.length ? groupTitle('Services') + serviceLines.map((i) => row(i.name, i.quantity, i.unit_price, i.subtotal)).join('') : ''}
            ${productLines.length ? groupTitle('Medicines / Items') + productLines.map((i) => row(i.name, i.quantity, i.unit_price, i.subtotal)).join('') : ''}

            <div class="subtotals">
              <div class="subtotal-row"><span>Consultation:</span><span>${peso(consult)}</span></div>
              ${svcTotal > 0 ? `<div class="subtotal-row"><span>Services:</span><span>${peso(svcTotal)}</span></div>` : ''}
              ${prodTotal > 0 ? `<div class="subtotal-row"><span>Medicines/Items:</span><span>${peso(prodTotal)}</span></div>` : ''}
            </div>

            <div class="total-row"><span>TOTAL</span><span>${peso(bill.value.total_cost)}</span></div>

            <div class="status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}">${isPaid ? '✓ PAID' : '✗ UNPAID'}</div>
            ${isPaid ? `<div class="pay-info">Paid via <strong>${esc(methodLabel(bill.value.payment_method))}</strong>${bill.value.paid_at ? `<br/>${esc(formatDate(bill.value.paid_at))} ${esc(fmtTime(bill.value.paid_at))}` : ''}</div>` : ''}

            <div class="receipt-footer">
              <div class="thanks">Thank you for choosing PURRFECTCARE!</div>
              <div class="notice">This is a computer-generated receipt.</div>
              <div class="notice">No signature required.</div>
              <div class="paw-divider" style="margin-top: 10px;">🐾 🐾 🐾</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  // ---------- Derived lists ----------
  const today = todayLocal();
  const summary = useMemo(() => {
    let unpaidCount = 0;
    let unpaidAmount = 0;
    let paidTodayCount = 0;
    let paidTodayAmount = 0;
    for (const b of bills) {
      const amt = Number(b.value.total_cost || 0);
      if (b.value.status === 'paid') {
        if (b.value.paid_at && todayLocal(new Date(b.value.paid_at)) === today) {
          paidTodayCount++;
          paidTodayAmount += amt;
        }
      } else {
        unpaidCount++;
        unpaidAmount += amt;
      }
    }
    return { unpaidCount, unpaidAmount, paidTodayCount, paidTodayAmount };
  }, [bills, today]);

  const counts = {
    all: bills.length,
    unpaid: bills.filter((b) => b.value.status !== 'paid').length,
    paid: bills.filter((b) => b.value.status === 'paid').length,
  };

  const visibleBills = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return bills
      .filter((bill) => {
        if (filter === 'paid' && bill.value.status !== 'paid') return false;
        if (filter === 'unpaid' && bill.value.status === 'paid') return false;
        if (!q) return true;
        const pet = pets.find((p) => p.value.id === bill.value.pet_id);
        const owner = owners.find((o) => o.value.id === pet?.value.owner_id);
        return (
          pet?.value.name?.toLowerCase().includes(q) ||
          owner?.value.name?.toLowerCase().includes(q) ||
          String(bill.value.id).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.value.created_at).getTime() - new Date(a.value.created_at).getTime());
  }, [bills, pets, owners, filter, searchTerm]);

  const itemsSummary = (bill: any) => {
    const items: any[] = bill.value.items || [];
    const svc = items.filter((i) => i.item_type === 'service').length;
    const prod = items.length - svc;
    const parts: string[] = [];
    if (Number(bill.value.consultation_fee) > 0) parts.push('Consultation');
    if (svc) parts.push(`${svc} service${svc > 1 ? 's' : ''}`);
    if (prod) parts.push(`${prod} item${prod > 1 ? 's' : ''}`);
    return parts.join(' · ') || '—';
  };

  // ---------- Small UI pieces ----------
  const StatusCell = ({ bill }: { bill: any }) =>
    bill.value.status === 'paid' ? (
      <div className="space-y-0.5">
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </Badge>
        <div className="text-xs text-muted-foreground leading-tight">
          {methodLabel(bill.value.payment_method)}
          {bill.value.paid_at && (
            <>
              {' · '}
              {todayLocal(new Date(bill.value.paid_at)) === today ? 'Today' : formatDate(bill.value.paid_at)} {fmtTime(bill.value.paid_at)}
            </>
          )}
        </div>
      </div>
    ) : (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 gap-1">
        <AlertCircle className="w-3 h-3" /> Unpaid
      </Badge>
    );

  const Actions = ({ bill }: { bill: any }) => {
    const busy = updatingId === bill.value.id;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {bill.value.status !== 'paid' ? (
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => openPayment(bill)}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Wallet className="w-3.5 h-3.5 mr-1.5" />}
            Record payment
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-amber-700 hover:bg-amber-50"
            onClick={() => handleMarkUnpaid(bill)}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Undo2 className="w-3.5 h-3.5 mr-1.5" />}
            Mark unpaid
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePrintReceipt(bill)}
          className="h-8 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        >
          <Printer className="w-3.5 h-3.5 mr-1" />
          Receipt
        </Button>
      </div>
    );
  };

  const BillingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[60%] max-w-[200px]" />
            <Skeleton className="h-3 w-[40%] max-w-[140px]" />
          </div>
          <Skeleton className="h-5 w-[80px]" />
        </div>
      ))}
    </div>
  );

  const payBillPet = payBill ? petById(payBill.value.pet_id) : null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Create invoices and record payments</p>
        </div>
        <Dialog
          open={showAddDialog}
          onOpenChange={(o) => {
            setShowAddDialog(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 h-11 px-6 font-bold shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-primary">
                <Receipt className="w-6 h-6" /> Create New Bill
              </DialogTitle>
              <DialogDescription>Consultation, services and medicines for one visit</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBill} className="space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Patient *</Label>
                  <Select
                    value={petId}
                    onValueChange={(v: string) => {
                      setPetId(v);
                      setDiagnosisId('');
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => {
                        const owner = ownerOfPet(pet);
                        return (
                          <SelectItem key={pet.key} value={pet.value.id}>
                            {pet.value.name} – {owner?.value.name || 'No owner'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Consultation Fee (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Diagnosis (optional)</Label>
                <Select value={diagnosisId} onValueChange={setDiagnosisId} disabled={!petId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={petId ? 'Link to a diagnosis record' : 'Choose a patient first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {diagnoses
                      .filter((d) => d.value.pet_id === petId)
                      .map((diagnosis) => (
                        <SelectItem key={diagnosis.key} value={diagnosis.value.id}>
                          {formatDate(diagnosis.value.date)} – {diagnosis.value.dx?.substring(0, 50)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {diagnosisId && (
                  <p className="text-xs text-muted-foreground">
                    Medicines already dispensed by this diagnosis won't be deducted from stock again.
                  </p>
                )}
              </div>

              {/* Services */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border bg-primary/[0.03]">
                <div className="flex justify-between items-center gap-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" /> Services
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedServices([...selectedServices, { service_id: '', quantity: 1, unit_price: '' }])}
                    disabled={activeServicesByCategory.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Service
                  </Button>
                </div>
                {activeServicesByCategory.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active services in the price list yet.</p>
                )}
                {selectedServices.map((line, index) => {
                  const def = svcById(line.service_id);
                  const custom = def && line.unit_price !== '' && Number(line.unit_price) !== Number(def.price);
                  return (
                    <div key={index} className="rounded-md border bg-background p-2 sm:p-0 sm:border-0 sm:bg-transparent">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex-1 min-w-0">
                          <Select
                            value={line.service_id}
                            onValueChange={(v: string) => {
                              const s = svcById(v);
                              updateService(index, { service_id: v, unit_price: s ? String(s.price ?? '') : '' });
                            }}
                          >
                            <SelectTrigger className="h-9 bg-background">
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeServicesByCategory.map((g) => (
                                <SelectGroup key={g.category}>
                                  <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">{g.category}</SelectLabel>
                                  {g.items.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name} – {peso(s.price)}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            min="1"
                            aria-label="Quantity"
                            placeholder="Qty"
                            value={line.quantity}
                            onChange={(e) => updateService(index, { quantity: e.target.value })}
                            className="h-9 w-16"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label="Unit price"
                              placeholder="Price"
                              value={line.unit_price}
                              onChange={(e) => updateService(index, { unit_price: e.target.value })}
                              className={`h-9 pl-6 ${custom ? 'border-amber-400' : ''}`}
                            />
                          </div>
                          <span className="hidden sm:block w-24 text-right text-sm font-semibold tabular-nums">
                            {peso(Number(line.unit_price || 0) * Number(line.quantity || 0))}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove service"
                            className="h-9 w-9 ml-auto sm:ml-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setSelectedServices(selectedServices.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {custom && (
                        <p className="text-[11px] text-amber-700 mt-1">Custom price (list price {peso(def.price)})</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Products */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border bg-muted/10">
                <div className="flex justify-between items-center gap-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" /> Medicines & Items
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems([...selectedItems, { inventory_id: '', quantity: 1 }])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                {selectedItems.map((item, index) => {
                  const inv = invById(item.inventory_id);
                  return (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-md border bg-background p-2 sm:p-0 sm:border-0 sm:bg-transparent">
                      <div className="flex-1 min-w-0">
                        <Select value={item.inventory_id} onValueChange={(v: string) => updateItem(index, { inventory_id: v })}>
                          <SelectTrigger className="h-9 bg-background">
                            <SelectValue placeholder="Select medicine / item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((iv) => (
                              <SelectItem key={iv.key} value={iv.value.id}>
                                {iv.value.name} – {peso(iv.value.price)} (Stock: {iv.value.quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min="1"
                          aria-label="Quantity"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: e.target.value })}
                          className="h-9 w-16"
                        />
                        <span className="w-28 sm:w-24 text-right text-sm font-semibold tabular-nums">
                          {peso(inv ? Number(inv.value.price || 0) * Number(item.quantity || 0) : 0)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove item"
                          className="h-9 w-9 ml-auto sm:ml-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live total */}
              <div className="rounded-lg border bg-card p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Consultation</span><span className="tabular-nums">{peso(consultNum)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Services</span><span className="tabular-nums">{peso(servicesTotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Medicines & items</span><span className="tabular-nums">{peso(productsTotal)}</span></div>
                <div className="flex justify-between items-baseline border-t pt-2 mt-2">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-extrabold text-primary tabular-nums">{peso(liveTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row border-t pt-5 gap-3 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary min-w-[120px]" disabled={saving || !petId}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Bill
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-amber-50/70 border-amber-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">Unpaid bills</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-900">
              {summary.unpaidCount} <span className="text-sm font-semibold text-amber-800/80">· {peso(summary.unpaidAmount)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-emerald-50/70 border-emerald-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Collected today</div>
            <div className="text-xl font-extrabold tabular-nums text-emerald-900">{peso(summary.paidTodayAmount)}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid today</div>
            <div className="text-xl font-extrabold tabular-nums">
              {summary.paidTodayCount} <span className="text-sm font-semibold text-muted-foreground">bill{summary.paidTodayCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card">
        <CardHeader className="border-b bg-muted/20 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Billing History
              </CardTitle>
              <CardDescription>All invoices, newest first</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="inline-flex rounded-lg border bg-background p-1 self-start" role="tablist" aria-label="Filter bills">
                {(['all', 'unpaid', 'paid'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md capitalize transition-colors ${
                      filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f}
                    <span className={`ml-1.5 text-xs tabular-nums ${filter === f ? 'opacity-90' : 'opacity-60'}`}>{counts[f]}</span>
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner or bill no."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <BillingSkeleton />
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No bills yet</p>
              <p className="text-sm">Create your first invoice to get started.</p>
            </div>
          ) : visibleBills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No bills match this view</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {visibleBills.map((bill) => {
                  const pet = petById(bill.value.pet_id);
                  const owner = ownerOfPet(pet);
                  return (
                    <div key={bill.key} className="rounded-xl border p-3 space-y-3">
                      <div className="flex items-start gap-3">
                        <PetAvatar type={pet?.value.type} photoUrl={pet?.value.photo_url} name={pet?.value.name} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{pet?.value.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground truncate">{owner?.value.name || 'Unknown owner'}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(bill.value.created_at)} · {itemsSummary(bill)}</div>
                        </div>
                        <div className="text-right font-extrabold text-primary tabular-nums">{peso(bill.value.total_cost)}</div>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <StatusCell bill={bill} />
                        <Actions bill={bill} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Patient</TableHead>
                      <TableHead className="font-bold">Details</TableHead>
                      <TableHead className="font-bold text-right">Total</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBills.map((bill) => {
                      const pet = petById(bill.value.pet_id);
                      const owner = ownerOfPet(pet);
                      return (
                        <TableRow key={bill.key} className="hover:bg-muted/5">
                          <TableCell className="font-medium whitespace-nowrap">{formatDate(bill.value.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PetAvatar type={pet?.value.type} photoUrl={pet?.value.photo_url} name={pet?.value.name} size={34} />
                              <div className="min-w-0">
                                <div className="font-semibold">{pet?.value.name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{owner?.value.name || 'Unknown owner'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{itemsSummary(bill)}</TableCell>
                          <TableCell className="font-bold text-primary text-base text-right tabular-nums whitespace-nowrap">
                            {peso(bill.value.total_cost)}
                          </TableCell>
                          <TableCell><StatusCell bill={bill} /></TableCell>
                          <TableCell className="text-right"><Actions bill={bill} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Record payment dialog */}
      <Dialog open={!!payBill} onOpenChange={(o) => !o && setPayBill(null)}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="w-5 h-5 text-emerald-600" /> Record payment
            </DialogTitle>
            <DialogDescription>Choose how the client paid. The time of payment is saved automatically.</DialogDescription>
          </DialogHeader>
          {payBill && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                <PetAvatar type={payBillPet?.value.type} photoUrl={payBillPet?.value.photo_url} name={payBillPet?.value.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{payBillPet?.value.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {ownerOfPet(payBillPet)?.value.name || 'Unknown owner'} · {formatDate(payBill.value.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount due</div>
                  <div className="text-xl font-extrabold text-primary tabular-nums">{peso(payBill.value.total_cost)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Payment method</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const selected = payMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPayMethod(m.value)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'hover:bg-muted/40 text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setPayBill(null)} disabled={updatingId === payBill.value.id}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={handleRecordPayment}
                  disabled={updatingId === payBill.value.id}
                >
                  {updatingId === payBill.value.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm {peso(payBill.value.total_cost)} paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
