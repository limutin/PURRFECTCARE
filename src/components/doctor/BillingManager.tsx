import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Plus, Printer, Loader2, Banknote, Clock, Receipt, PawPrint, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BillingManagerProps {
  accessToken: string;
}

export function BillingManager({ accessToken }: BillingManagerProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [petId, setPetId] = useState('');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  useEffect(() => {
    if (diagnosisId) {
      const selectedDiagnosis = diagnoses.find(d => d.value.id === diagnosisId || d.key === diagnosisId);
      if (selectedDiagnosis?.value?.medications?.length) {
        setSelectedItems(selectedDiagnosis.value.medications);
        toast.info('Medications from diagnosis have been automatically added to this bill.');
      }
    }
  }, [diagnosisId, diagnoses]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, petsRes, ownersRes, diagnosesRes, inventoryRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/billing`, {
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
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/diagnoses`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/inventory`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
      ]);

      const billsData = await billsRes.json();
      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();
      const diagnosesData = await diagnosesRes.json();
      const inventoryData = await inventoryRes.json();

      setBills(billsData.bills || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
      setDiagnoses(diagnosesData.diagnoses || []);
      setInventory(inventoryData.inventory || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { inventory_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b53d76e4/billing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({
            pet_id: petId,
            diagnosis_id: diagnosisId || undefined,
            consultation_fee: parseFloat(consultationFee),
            items: selectedItems.filter(item => item.inventory_id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create bill');
      }

      toast.success('Bill created successfully!');
      setShowAddDialog(false);
      setSaving(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReceipt = (bill: any) => {
    const pet = pets.find((p) => p.value.id === bill.value.pet_id);
    const owner = owners.find((o) => o.value.id === pet?.value.owner_id);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsTotal = bill.value.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.value.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              display: flex;
              justify-content: center;
              background: #f5f5f5;
            }
            .receipt {
              width: 320px;
              background: #fff;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px dashed #333;
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .receipt-header h1 {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            .receipt-header .subtitle {
              font-size: 11px;
              color: #555;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .receipt-header .tagline {
              font-size: 10px;
              color: #888;
              margin-top: 6px;
              font-style: italic;
            }
            .receipt-meta {
              text-align: center;
              font-size: 11px;
              color: #555;
              margin-bottom: 15px;
              padding-bottom: 12px;
              border-bottom: 1px dashed #ccc;
            }
            .receipt-meta p { margin: 2px 0; }
            .receipt-meta .receipt-no {
              font-weight: 700;
              font-size: 13px;
              color: #333;
              margin-top: 4px;
            }
            .info-section {
              margin-bottom: 12px;
              padding-bottom: 12px;
              border-bottom: 1px dashed #ccc;
            }
            .info-section .section-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 6px;
              color: #333;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin: 3px 0;
              color: #444;
            }
            .info-row .label {
              color: #777;
              min-width: 80px;
            }
            .info-row .value {
              font-weight: 600;
              text-align: right;
              flex: 1;
              color: #222;
            }
            .items-header {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 6px 0;
              border-bottom: 1px solid #333;
              border-top: 1px solid #333;
              margin-bottom: 6px;
              color: #333;
            }
            .items-header span:first-child { flex: 2; }
            .items-header span:nth-child(2) { flex: 0.5; text-align: center; }
            .items-header span:nth-child(3) { flex: 1; text-align: right; }
            .items-header span:last-child { flex: 1; text-align: right; }
            .item-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              padding: 4px 0;
              color: #444;
            }
            .item-row span:first-child { flex: 2; }
            .item-row span:nth-child(2) { flex: 0.5; text-align: center; }
            .item-row span:nth-child(3) { flex: 1; text-align: right; }
            .item-row span:last-child { flex: 1; text-align: right; font-weight: 600; }
            .subtotals {
              border-top: 1px dashed #999;
              margin-top: 10px;
              padding-top: 8px;
            }
            .subtotal-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin: 3px 0;
              color: #555;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 2px solid #333;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
              color: #111;
            }
            .status-badge {
              text-align: center;
              margin: 15px 0;
              padding: 6px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 2px;
              text-transform: uppercase;
              border: 2px solid;
            }
            .status-paid {
              color: #059669;
              border-color: #059669;
              background: #ecfdf5;
            }
            .status-unpaid {
              color: #dc2626;
              border-color: #dc2626;
              background: #fef2f2;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 2px dashed #333;
            }
            .receipt-footer .thanks {
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .receipt-footer .notice {
              font-size: 9px;
              color: #888;
              margin-top: 4px;
            }
            .paw-divider {
              text-align: center;
              font-size: 10px;
              color: #ccc;
              letter-spacing: 4px;
              margin: 8px 0;
            }
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
              <div class="tagline">Caring for your furry family members</div>
            </div>

            <div class="receipt-meta">
              <p><strong>OFFICIAL RECEIPT</strong></p>
              <p>Date: ${formatDate(bill.value.created_at)}</p>
              <p class="receipt-no">No. ${bill.value.id.substring(0, 12).toUpperCase()}</p>
            </div>

            <div class="info-section">
              <div class="section-title">🐾 Patient Information</div>
              <div class="info-row"><span class="label">Name:</span><span class="value">${pet?.value.name || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Species:</span><span class="value">${pet?.value.type || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Sex:</span><span class="value">${pet?.value.sex ? pet.value.sex.charAt(0).toUpperCase() + pet.value.sex.slice(1) : 'N/A'}</span></div>
              <div class="info-row"><span class="label">Birthday:</span><span class="value">${pet?.value.birthday ? formatDate(pet.value.birthday) : 'N/A'}</span></div>
              <div class="info-row"><span class="label">Weight:</span><span class="value">${pet?.value.weight ? pet.value.weight + ' kg' : 'N/A'}</span></div>
            </div>

            <div class="info-section">
              <div class="section-title">👤 Owner Information</div>
              <div class="info-row"><span class="label">Name:</span><span class="value">${owner?.value.name || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Contact:</span><span class="value">${owner?.value.contact || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Address:</span><span class="value">${owner?.value.address || 'N/A'}</span></div>
            </div>

            <div class="paw-divider">🐾 🐾 🐾 🐾 🐾</div>

            <div class="items-header">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Amount</span>
            </div>

            <div class="item-row">
              <span>Consultation Fee</span>
              <span>1</span>
              <span>₱${(bill.value.consultation_fee || 0).toFixed(2)}</span>
              <span>₱${(bill.value.consultation_fee || 0).toFixed(2)}</span>
            </div>
            ${bill.value.items?.map((item: any) => `
              <div class="item-row">
                <span>${item.name}</span>
                <span>${item.quantity}</span>
                <span>₱${(item.unit_price || 0).toFixed(2)}</span>
                <span>₱${(item.subtotal || 0).toFixed(2)}</span>
              </div>
            `).join('') || ''}

            <div class="subtotals">
              <div class="subtotal-row">
                <span>Consultation:</span>
                <span>₱${(bill.value.consultation_fee || 0).toFixed(2)}</span>
              </div>
              ${itemsTotal > 0 ? `
              <div class="subtotal-row">
                <span>Medicines/Items:</span>
                <span>₱${itemsTotal.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>

            <div class="total-row">
              <span>TOTAL</span>
              <span>₱${(bill.value.total_cost || 0).toFixed(2)}</span>
            </div>

            <div class="status-badge ${bill.value.status === 'paid' ? 'status-paid' : 'status-unpaid'}">
              ${bill.value.status === 'paid' ? '✓ PAID' : '✗ UNPAID'}
            </div>

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

  const resetForm = () => {
    setPetId('');
    setDiagnosisId('');
    setConsultationFee('500');
    setSelectedItems([]);
  };

  const BillingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[140px]" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-5 w-[80px] ml-auto" />
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Create and manage invoices</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 h-11 px-6 font-bold shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                <Receipt className="w-6 h-6" /> Create New Bill
              </DialogTitle>
              <DialogDescription>
                Generate invoice for veterinary services
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBill} className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Pet *</Label>
                  <Select value={petId} onValueChange={setPetId} required>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => {
                        const owner = owners.find((o) => o.value.id === pet.value.owner_id);
                        return (
                          <SelectItem key={pet.key} value={pet.value.id}>
                            {pet.value.name} - {owner?.value.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Consultation Fee *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Diagnosis (Optional)</Label>
                <Select value={diagnosisId} onValueChange={setDiagnosisId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Link to diagnosis record" />
                  </SelectTrigger>
                  <SelectContent>
                    {diagnoses
                      .filter(d => d.value.pet_id === petId)
                      .map((diagnosis) => (
                        <SelectItem key={diagnosis.key} value={diagnosis.value.id}>
                          {formatDate(diagnosis.value.date)} - {diagnosis.value.dx?.substring(0, 50)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 bg-muted/10 p-4 rounded-lg border border-muted/50">
                <div className="flex justify-between items-center">
                  <Label className="font-bold flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Medicines & Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                {selectedItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={item.inventory_id}
                        onValueChange={(value: string) => handleItemChange(index, 'inventory_id', value)}
                      >
                        <SelectTrigger className="h-9 bg-background">
                          <SelectValue placeholder="Select medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((inv) => (
                            <SelectItem key={inv.key} value={inv.value.id}>
                              {inv.value.name} - ₱{inv.value.price} (Stock: {inv.value.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex border-t pt-5 gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary min-w-[120px]" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Bill
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl bg-card">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Billing History
          </CardTitle>
          <CardDescription>View and manage all financial transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <BillingSkeleton />
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No bills yet</p>
              <p className="text-sm">Create your first invoice to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Pet</TableHead>
                    <TableHead className="font-bold">Owner</TableHead>
                    <TableHead className="font-bold">Total</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills
                    .sort((a, b) => new Date(b.value.created_at).getTime() - new Date(a.value.created_at).getTime())
                    .map((bill) => {
                      const pet = pets.find((p) => p.value.id === bill.value.pet_id);
                      const owner = owners.find((o) => o.value.id === pet?.value.owner_id);
                      return (
                        <TableRow key={bill.key} className="hover:bg-muted/5">
                          <TableCell className="font-medium">{formatDate(bill.value.created_at)}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{pet?.value.name || 'Unknown'}</span>
                          </TableCell>
                          <TableCell>
                            <span>{owner?.value.name || 'Unknown'}</span>
                          </TableCell>
                          <TableCell className="font-bold text-primary text-base">₱{bill.value.total_cost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={bill.value.status === 'paid' ? 'default' : 'secondary'}
                              className={bill.value.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}
                            >
                              {bill.value.status === 'paid' ? '● Paid' : '○ Unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintReceipt(bill)}
                              className="h-8 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
