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

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.value.id.substring(0, 8)}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .clinic-brand h1 { margin: 0; color: #059669; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; }
            .clinic-brand p { margin: 4px 0 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
            .receipt-meta { text-align: right; }
            .receipt-meta p { margin: 2px 0; color: #64748b; font-size: 13px; }
            .receipt-id { font-family: monospace; font-weight: 700; color: #0f172a; font-size: 16px; margin-top: 4px; }
            
            .info-section { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .info-box h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.05em; }
            .info-box p { margin: 4px 0; font-weight: 500; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
            td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .text-right { text-align: right; }
            
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.grand-total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 16px; font-weight: 800; font-size: 20px; color: #059669; }
            
            .footer { margin-top: 60px; padding-top: 30px; border-top: 1px dashed #e2e8f0; text-align: center; }
            .footer p { margin: 4px 0; color: #64748b; font-size: 13px; }
            @media print { body { padding: 0; } .receipt-container { border: none; box-shadow: none; width: 100%; max-width: 100%; } }
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
                <p>Date Generated</p>
                <p class="receipt-id">${formatDate(new Date())}</p>
                <p style="margin-top: 10px;">Transaction ID</p>
                <p class="receipt-id">#${bill.value.id.substring(0, 12).toUpperCase()}</p>
              </div>
            </div>

            <div class="info-section">
              <div class="info-box">
                <h3>Client & Patient</h3>
                <p><b>Pet:</b> ${pet?.value.name || 'N/A'}</p>
                <p><b>Owner:</b> ${owner?.value.name || 'N/A'}</p>
              </div>
              <div class="info-box" style="text-align: right;">
                <h3>Status</h3>
                <p><b style="color: ${bill.value.status === 'paid' ? '#059669' : '#ef4444'}">${bill.value.status.toUpperCase()}</b></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation Fee</td>
                  <td class="text-right">1</td>
                  <td class="text-right">₱${bill.value.consultation_fee.toFixed(2)}</td>
                  <td class="text-right">₱${bill.value.consultation_fee.toFixed(2)}</td>
                </tr>
                ${bill.value.items?.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">₱${item.unit_price.toFixed(2)}</td>
                    <td class="text-right">₱${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row grand-total">
                <span>TOTAL</span>
                <span>₱${bill.value.total_cost.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for trusting PURRFECTCARE with your pet's health!</p>
              <p style="margin-top: 10px; font-size: 11px;">Computer-generated receipt. Valid without signature.</p>
            </div>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
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
