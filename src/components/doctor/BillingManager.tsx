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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.value.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #2E7D32;
              border-bottom: 3px solid #2E7D32;
              padding-bottom: 10px;
            }
            .header {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #2E7D32;
              color: white;
            }
            .total {
              text-align: right;
              font-size: 1.2em;
              font-weight: bold;
              margin-top: 20px;
              color: #2E7D32;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PURRFECTCARE - Official Receipt</h1>
            <p>Date: ${formatDate(bill.value.created_at)}</p>
            <p>Receipt #: ${bill.value.id.substring(0, 12).toUpperCase()}</p>
          </div>
          <div class="section">
            <h2>Client Information</h2>
            <p><span class="label">Pet Name:</span> ${pet?.value.name || 'N/A'}</p>
            <p><span class="label">Owner:</span> ${owner?.value.name || 'N/A'}</p>
            <p><span class="label">Address:</span> ${owner?.value.address || 'N/A'}</p>
            <p><span class="label">Contact:</span> ${owner?.value.contact || 'N/A'}</p>
          </div>
          <div class="section">
            <h2>Billing Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation Fee</td>
                  <td>1</td>
                  <td>₱${bill.value.consultation_fee.toFixed(2)}</td>
                  <td>₱${bill.value.consultation_fee.toFixed(2)}</td>
                </tr>
                ${bill.value.items?.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>₱${item.unit_price.toFixed(2)}</td>
                    <td>₱${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            <div class="total">
              TOTAL: ₱${bill.value.total_cost.toFixed(2)}
            </div>
          </div>
          <div class="section">
            <p style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px;">
              Thank you for choosing PURRFECTCARE!<br>
              For inquiries, please contact us.
            </p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
