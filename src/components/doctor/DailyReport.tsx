import React, { useEffect, useState } from 'react';
import { api, peso } from '../../utils/api';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { PetAvatar } from '../shared/PetAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import {
  Printer, Wallet, Receipt, AlertCircle, ChevronLeft, ChevronRight, ClipboardList, Banknote, Smartphone,
  CreditCard, Landmark, CircleDollarSign, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const METHODS: { value: string; label: string; icon: any; bar: string }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote, bar: 'bg-emerald-500' },
  { value: 'gcash', label: 'GCash', icon: Smartphone, bar: 'bg-sky-500' },
  { value: 'maya', label: 'Maya', icon: Smartphone, bar: 'bg-teal-500' },
  { value: 'card', label: 'Card', icon: CreditCard, bar: 'bg-violet-500' },
  { value: 'bank', label: 'Bank transfer', icon: Landmark, bar: 'bg-amber-500' },
  { value: 'other', label: 'Other', icon: CircleDollarSign, bar: 'bg-slate-400' },
];
const methodInfo = (m?: string | null) =>
  METHODS.find((x) => x.value === (m || 'cash')) || { value: m || 'other', label: m || 'Other', icon: CircleDollarSign, bar: 'bg-slate-400' };

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '—';

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const shiftDate = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return todayLocal(new Date(y, m - 1, d + days));
};

const itemsSummary = (bill: any) => {
  const parts: string[] = [];
  if (Number(bill.consultation_fee) > 0) parts.push('Consultation');
  for (const it of bill.items || []) parts.push(Number(it.quantity) > 1 ? `${it.name} ×${it.quantity}` : it.name);
  return parts.join(', ') || '—';
};

interface Report {
  date: string;
  bills: any[];
  byMethod: Record<string, number>;
  total: number;
  count: number;
  unpaidCount: number;
}

export function DailyReport({ accessToken }: { accessToken: string }) {
  const [date, setDate] = useState(todayLocal());
  const [report, setReport] = useState<Report | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/pets', accessToken)
      .then((d) => setPets(d.pets || []))
      .catch(() => {});
  }, [accessToken]);

  const load = async (d: string) => {
    setLoading(true);
    try {
      const data = await api<Report>(`/reports/daily?date=${encodeURIComponent(d)}`, accessToken);
      setReport(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load the daily report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const petOf = (bill: any) => pets.find((p) => p.value.id === bill.pet_id)?.value;
  const isToday = date === todayLocal();
  const total = Number(report?.total || 0);
  const methodRows = Object.entries(report?.byMethod || {})
    .map(([m, amt]) => ({ ...methodInfo(m), amount: Number(amt || 0), count: (report?.bills || []).filter((b) => (b.payment_method || 'cash') === m).length }))
    .sort((a, b) => b.amount - a.amount);

  const handlePrint = () => {
    if (!report) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const methodsHtml = methodRows.length
      ? methodRows
          .map((m) => `<tr><td>${esc(m.label)}</td><td class="c">${m.count}</td><td class="r">${peso(m.amount)}</td></tr>`)
          .join('')
      : `<tr><td colspan="3" class="muted">No payments recorded</td></tr>`;
    const billsHtml = report.bills.length
      ? report.bills
          .map(
            (b, i) => `<tr>
              <td class="c">${i + 1}</td>
              <td>${esc(fmtTime(b.paid_at))}</td>
              <td><strong>${esc(b.pets?.name || '—')}</strong><div class="muted">${esc(b.pets?.owners?.name || '')}</div></td>
              <td class="small">${esc(itemsSummary(b))}</td>
              <td>${esc(methodInfo(b.payment_method).label)}</td>
              <td class="r">${peso(b.total_cost)}</td>
            </tr>`,
          )
          .join('')
      : `<tr><td colspan="6" class="muted c">No paid bills on this date</td></tr>`;

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Report - ${esc(report.date)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 32px; font-size: 12px; }
    .page { max-width: 760px; margin: 0 auto; }
    header { text-align: center; border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
    header h1 { font-size: 20px; letter-spacing: 1px; color: #0f766e; }
    header .addr { color: #555; margin-top: 2px; }
    header h2 { font-size: 14px; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; }
    header .date { margin-top: 2px; font-weight: 600; }
    .stats { display: flex; gap: 12px; margin-bottom: 18px; }
    .stat { flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; text-align: center; }
    .stat .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
    .stat .val { font-size: 18px; font-weight: 800; margin-top: 4px; }
    h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 6px; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .r { text-align: right; white-space: nowrap; }
    .c { text-align: center; }
    .muted { color: #6b7280; font-size: 11px; }
    .small { font-size: 11px; }
    tfoot td { font-weight: 800; border-top: 2px solid #1f2937; border-bottom: none; font-size: 13px; }
    .methods { max-width: 360px; }
    .sign { margin-top: 48px; display: flex; justify-content: space-between; gap: 40px; }
    .sign div { flex: 1; text-align: center; }
    .sign .line { border-top: 1px solid #1f2937; margin-top: 36px; padding-top: 4px; font-size: 11px; }
    .gen { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 10px; }
    @media print { body { padding: 0; } @page { margin: 14mm; } }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1>PURRFECTCARE Veterinary Clinic</h1>
      <div class="addr">Barrientos Street, Layawan, Oroquieta City</div>
      <h2>Daily Collection Report</h2>
      <div class="date">${esc(formatDate(report.date))}</div>
    </header>

    <div class="stats">
      <div class="stat"><div class="lbl">Total collected</div><div class="val">${peso(total)}</div></div>
      <div class="stat"><div class="lbl">Paid bills</div><div class="val">${report.count}</div></div>
      <div class="stat"><div class="lbl">Still unpaid (all dates)</div><div class="val">${report.unpaidCount}</div></div>
    </div>

    <h3>Totals by payment method</h3>
    <table class="methods">
      <thead><tr><th>Method</th><th class="c">Bills</th><th class="r">Amount</th></tr></thead>
      <tbody>${methodsHtml}</tbody>
      <tfoot><tr><td>Total</td><td class="c">${report.count}</td><td class="r">${peso(total)}</td></tr></tfoot>
    </table>

    <h3>Paid bills</h3>
    <table>
      <thead><tr><th class="c">#</th><th>Time</th><th>Patient / Owner</th><th>Items</th><th>Method</th><th class="r">Amount</th></tr></thead>
      <tbody>${billsHtml}</tbody>
      <tfoot><tr><td colspan="5">Total collected</td><td class="r">${peso(total)}</td></tr></tfoot>
    </table>

    <div class="sign">
      <div><div class="line">Prepared by (signature over printed name)</div></div>
      <div><div class="line">Received / Verified by</div></div>
    </div>
    <div class="gen">Generated ${esc(new Date().toLocaleString('en-PH'))}</div>
  </div>
</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Daily Report</h1>
          <p className="text-muted-foreground">End-of-day collections for {isToday ? 'today' : formatDate(date)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="report-date" className="text-xs font-semibold text-muted-foreground">Date</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input
                id="report-date"
                type="date"
                value={date}
                max={todayLocal()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-10 flex-1 sm:w-44"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setDate(shiftDate(date, 1))}
                disabled={isToday}
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            {!isToday && (
              <Button variant="ghost" className="h-10" onClick={() => setDate(todayLocal())}>Today</Button>
            )}
            <Button variant="outline" className="h-10" onClick={() => load(date)} disabled={loading} aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              className="h-10 flex-1 sm:flex-none bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
              onClick={handlePrint}
              disabled={loading || !report}
            >
              <Printer className="w-4 h-4 mr-2" /> Print report
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
            <Wallet className="w-4 h-4" /> Total collected
          </div>
          {loading ? <Skeleton className="h-9 w-40 mt-2 bg-white/30" /> : <div className="text-3xl font-extrabold tabular-nums mt-1">{peso(total)}</div>}
        </div>
        <div className="rounded-xl border p-4 bg-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="w-4 h-4 text-primary" /> Paid bills
          </div>
          {loading ? <Skeleton className="h-9 w-16 mt-2" /> : <div className="text-3xl font-extrabold tabular-nums mt-1">{report?.count ?? 0}</div>}
        </div>
        <div className="rounded-xl border p-4 bg-amber-50/70 border-amber-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800/80">
            <AlertCircle className="w-4 h-4" /> Still unpaid
          </div>
          {loading ? (
            <Skeleton className="h-9 w-16 mt-2" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tabular-nums text-amber-900">{report?.unpaidCount ?? 0}</span>
              <span className="text-xs text-amber-800/80">open bills (all dates)</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By method */}
        <Card className="border-none shadow-xl bg-card lg:col-span-1">
          <CardHeader className="border-b bg-muted/20 p-4 sm:p-6">
            <CardTitle className="text-lg font-bold">By payment method</CardTitle>
            <CardDescription>How today's money came in</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : methodRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments recorded.</p>
            ) : (
              methodRows.map((m) => {
                const Icon = m.icon;
                const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                return (
                  <div key={m.value} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon className="w-4 h-4 text-muted-foreground" /> {m.label}
                        <span className="text-xs font-normal text-muted-foreground">({m.count})</span>
                      </span>
                      <span className="font-bold tabular-nums">{peso(m.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden>
                      <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
            {!loading && methodRows.length > 0 && (
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Total</span>
                <span className="tabular-nums text-primary">{peso(total)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paid bills */}
        <Card className="border-none shadow-xl bg-card lg:col-span-2">
          <CardHeader className="border-b bg-muted/20 p-4 sm:p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Paid bills
            </CardTitle>
            <CardDescription>In order of payment time</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !report || report.bills.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No paid bills on {isToday ? 'today' : formatDate(date)}</p>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="space-y-2 md:hidden">
                  {report.bills.map((b) => {
                    const pet = petOf(b);
                    return (
                      <div key={b.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <PetAvatar type={pet?.type} photoUrl={pet?.photo_url} name={b.pets?.name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold truncate">{b.pets?.name || '—'}</span>
                            <span className="font-bold tabular-nums text-primary">{peso(b.total_cost)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{b.pets?.owners?.name || ''}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{itemsSummary(b)}</div>
                          <div className="text-xs mt-1">
                            <span className="font-medium">{fmtTime(b.paid_at)}</span>
                            <span className="text-muted-foreground"> · {methodInfo(b.payment_method).label}</span>
                          </div>
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
                        <TableHead className="font-bold">Time</TableHead>
                        <TableHead className="font-bold">Patient</TableHead>
                        <TableHead className="font-bold">Items</TableHead>
                        <TableHead className="font-bold">Method</TableHead>
                        <TableHead className="font-bold text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.bills.map((b) => {
                        const pet = petOf(b);
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium whitespace-nowrap tabular-nums">{fmtTime(b.paid_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <PetAvatar type={pet?.type} photoUrl={pet?.photo_url} name={b.pets?.name} size={32} />
                                <div className="min-w-0">
                                  <div className="font-semibold">{b.pets?.name || '—'}</div>
                                  <div className="text-xs text-muted-foreground">{b.pets?.owners?.name || ''}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-normal max-w-[260px]">{itemsSummary(b)}</TableCell>
                            <TableCell className="whitespace-nowrap">{methodInfo(b.payment_method).label}</TableCell>
                            <TableCell className="text-right font-bold tabular-nums text-primary whitespace-nowrap">{peso(b.total_cost)}</TableCell>
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
      </div>
    </div>
  );
}
