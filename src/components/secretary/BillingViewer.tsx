import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, getFunctionUrl } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Search, Printer, Banknote, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BillingViewerProps {
  accessToken: string;
}

export function BillingViewer({ accessToken }: BillingViewerProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, petsRes, ownersRes] = await Promise.all([
        fetch(getFunctionUrl('/billing'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(getFunctionUrl('/pets'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
        fetch(getFunctionUrl('/owners'), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey
          },
        }),
      ]);

      const billsData = await billsRes.json();
      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();

      setBills(billsData.bills || []);
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (billId: string, newStatus: string) => {
    setUpdatingId(billId);
    try {
      // Direct REST API update as a robust workaround
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/billing?id=eq.${encodeURIComponent(billId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update bill status');
      }

      toast.success(`Bill marked as ${newStatus} successfully!`);
      fetchData();
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingId(null);
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

  const filteredBills = bills.filter((bill) => {
    const pet = pets.find((p) => p.value.id === bill.value.pet_id);
    const owner = owners.find((o) => o.value.id === pet?.value.owner_id);
    const searchLower = searchTerm.toLowerCase();
    return (
      pet?.value.name?.toLowerCase().includes(searchLower) ||
      owner?.value.name?.toLowerCase().includes(searchLower) ||
      bill.value.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Billing & Receipts</h1>
          <p className="text-muted-foreground">Manage payments and generate official receipts</p>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg flex items-center gap-3 border border-primary/20">
          <Banknote className="w-5 h-5 text-primary" />
          <div className="text-sm font-semibold">
            Total Revenue: ₱{bills.reduce((acc, b) => acc + (b.value.total_cost || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>View all transactions and print receipts</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by pet or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-[110px]" />
                  <Skeleton className="h-4 w-[70px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-5 w-[70px] rounded-full" />
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pet Info</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills
                    .sort((a, b) => new Date(b.value.created_at).getTime() - new Date(a.value.created_at).getTime())
                    .map((bill) => {
                      const pet = pets.find((p) => p.value.id === bill.value.pet_id);
                      const owner = owners.find((o) => o.value.id === pet?.value.owner_id);
                      return (
                        <TableRow key={bill.key} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="whitespace-nowrap">
                            {formatDate(bill.value.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{pet?.value.name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{owner?.value.name || 'Unknown'}</TableCell>
                          <TableCell className="font-bold text-primary">
                            ₱{(bill.value.total_cost || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bill.value.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                              {bill.value.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {bill.value.status !== 'paid' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 transition-all font-semibold"
                                  onClick={() => handleUpdateStatus(bill.value.id, 'paid')}
                                  disabled={updatingId === bill.value.id}
                                >
                                  {updatingId === bill.value.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                  )}
                                  <span className="whitespace-nowrap">Mark as Paid</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:border-primary hover:text-primary h-8"
                                onClick={() => handlePrintReceipt(bill)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Receipt
                              </Button>
                            </div>
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
