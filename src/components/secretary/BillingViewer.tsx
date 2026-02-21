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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.value.id}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .receipt-container {
              border: 2px solid #e2e8f0;
              padding: 30px;
              border-radius: 12px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #10B981;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .clinic-brand h1 {
              color: #059669;
              margin: 0;
              font-size: 28px;
            }
            .receipt-meta {
              text-align: right;
              font-size: 14px;
              color: #666;
            }
            .info-section {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-box h3 {
              font-size: 14px;
              color: #718096;
              text-transform: uppercase;
              margin-bottom: 8px;
              border-bottom: 1px solid #edf2f7;
            }
            .info-content p {
              margin: 4px 0;
              font-weight: 500;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              text-align: left;
              padding: 12px;
              border-bottom: 2px solid #e2e8f0;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #edf2f7;
            }
            .total-row {
              background-color: #f0fdf4;
              font-weight: bold;
              font-size: 18px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 14px;
              color: #718096;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="clinic-brand">
                <h1>PURRFECTCARE</h1>
                <p>Official Receipt</p>
              </div>
              <div class="receipt-meta">
                <p><b>Date:</b> ${formatDate(bill.value.created_at)}</p>
                <p><b>Receipt #:</b> ${bill.value.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div class="info-section">
              <div class="info-box">
                <h3>Client Details</h3>
                <div class="info-content">
                  <p><b>Owner:</b> ${owner?.value.name || 'N/A'}</p>
                  <p><b>Contact:</b> ${owner?.value.contact || 'N/A'}</p>
                  <p><b>Address:</b> ${owner?.value.address || 'N/A'}</p>
                </div>
              </div>
              <div class="info-box">
                <h3>Patient Details</h3>
                <div class="info-content">
                  <p><b>Pet Name:</b> ${pet?.value.name || 'N/A'}</p>
                  <p><b>Pet ID:</b> ${pet?.value.pet_uid || 'N/A'}</p>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation Fee</td>
                  <td>1</td>
                  <td>₱${(bill.value.consultation_fee || 0).toFixed(2)}</td>
                  <td style="text-align: right;">₱${(bill.value.consultation_fee || 0).toFixed(2)}</td>
                </tr>
                ${bill.value.items?.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>₱${(item.unit_price || 0).toFixed(2)}</td>
                    <td style="text-align: right;">₱${(item.subtotal || 0).toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">TOTAL AMOUNT DUE:</td>
                  <td style="text-align: right;">₱${(bill.value.total_cost || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <p>Thank you for trusting PURRFECTCARE with your pet's health!</p>
              <p style="margin-top: 10px; font-size: 12px;">This is a computer-generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
