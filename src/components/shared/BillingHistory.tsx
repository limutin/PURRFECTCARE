import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Printer, Calendar, Banknote, Clock, Filter } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getFunctionUrl } from '../../utils/supabase/info';
import { formatDate } from '../../utils/formatDate';
import { toast } from 'sonner';

interface BillingHistoryProps {
  accessToken: string;
  petId?: string;
  showFilters?: boolean;
}

export function BillingHistory({ accessToken, petId, showFilters = true }: BillingHistoryProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [petId]);

  const fetchData = async () => {
    try {
      const [billsRes, petsRes, ownersRes] = await Promise.all([
        fetch(getFunctionUrl('/billing'), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(getFunctionUrl('/pets'), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(getFunctionUrl('/owners'), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const billsData = await billsRes.json();
      const petsData = await petsRes.json();
      const ownersData = await ownersRes.json();

      let allBills = billsData.bills || [];
      if (petId) {
        allBills = allBills.filter((b: any) => b.value.pet_id === petId);
      }

      setBills(allBills.sort((a: any, b: any) =>
        new Date(b.value.created_at).getTime() - new Date(a.value.created_at).getTime()
      ));
      setPets(petsData.pets || []);
      setOwners(ownersData.owners || []);
    } catch (error) {
      console.error('Error fetching billing history:', error);
      toast.error('Failed to load billing history');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (bill: any) => {
    const pet = pets.find((p) => p.value.id === bill.value.pet_id || p.key === bill.value.pet_id);
    const owner = owners.find((o) => o.value.id === pet?.value.owner_id || o.key === pet?.value.owner_id);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsTotal = bill.value.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.value.id.substring(0, 8)}</title>
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

  const filteredBills = bills.filter(bill => {
    const pet = pets.find(p => p.value.id === bill.value.pet_id || p.key === bill.value.pet_id);
    const owner = owners.find(o => o.value.id === pet?.value.owner_id || o.key === pet?.value.owner_id);
    const s = searchTerm.toLowerCase();
    const matchesSearch = (
      pet?.value.name?.toLowerCase().includes(s) ||
      owner?.value.name?.toLowerCase().includes(s) ||
      bill.value.id.toLowerCase().includes(s)
    );
    const matchesStatus = statusFilter === 'all' || bill.value.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
            <Skeleton className="h-10 w-10 rounded-full" />
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
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Bill ID, Pet or Owner..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'all' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'paid' ? 'bg-background text-emerald-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Paid
              </button>
              <button
                onClick={() => setStatusFilter('unpaid')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'unpaid' ? 'bg-background text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Unpaid
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-none shadow-premium overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[120px]">Bill ID</TableHead>
                  {!petId && <TableHead>Pet / Owner</TableHead>}
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => {
                  const pet = pets.find(p => p.value.id === bill.value.pet_id || p.key === bill.value.pet_id);
                  const owner = owners.find(o => o.value.id === pet?.value.owner_id || o.key === pet?.value.owner_id);
                  const isPaid = bill.value.status === 'paid';

                  return (
                    <TableRow key={bill.key} className="hover:bg-muted/10 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{formatDate(bill.value.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground bg-muted px-2 py-1 rounded">
                          #{bill.value.id.substring(0, 8)}
                        </span>
                      </TableCell>
                      {!petId && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-primary group-hover:underline underline-offset-4 pointer-events-none">
                              {pet?.value.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                              Owner: {owner?.value.name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <Banknote className="w-4 h-4 text-emerald-600/70" />
                          ₱{bill.value.total_cost.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isPaid ? "default" : "secondary"}
                          className={`
                            px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold
                            ${isPaid ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-orange-500/10 text-orange-600 border-orange-200"}
                          `}
                        >
                          {bill.value.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintReceipt(bill)}
                          className="hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          <span className="text-xs">Receipt</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredBills.length === 0 && (
            <div className="p-12 text-center text-muted-foreground italic flex flex-col items-center gap-2">
              <Clock className="w-10 h-10 opacity-20 mb-2" />
              No billing records found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {!petId && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2">
          <p>Showing {filteredBills.length} transactions</p>
          <p>Refreshed at {new Date().toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}
