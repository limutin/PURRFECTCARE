import React, { useMemo, useState } from 'react';
import { Receipt, ChevronDown, CheckCircle2, Wallet } from 'lucide-react';
import { peso } from '../../utils/api';
import { formatDate } from '../../utils/formatDate';
import { OwnerOverview, OwnerBill, Panel, PageHeader, EmptyState, isPaid, ymd, CLINIC_PHONE } from './ownerShared';

interface MyBillsProps {
  data: OwnerOverview;
}

export function MyBills({ data }: MyBillsProps) {
  const petById = useMemo(() => new Map(data.pets.map((p) => [p.id, p])), [data.pets]);
  const [openId, setOpenId] = useState<string | null>(null);

  const byNewest = (a: OwnerBill, b: OwnerBill) => ymd(b.created_at).localeCompare(ymd(a.created_at));
  const unpaid = data.bills.filter((b) => !isPaid(b)).sort(byNewest);
  const paid = data.bills
    .filter(isPaid)
    .sort((a, b) => ymd(b.paid_at || b.created_at).localeCompare(ymd(a.paid_at || a.created_at)));
  const balance = unpaid.reduce((s, b) => s + Number(b.total_cost || 0), 0);

  const billRow = (b: OwnerBill) => {
    const pet = b.pet_id ? petById.get(b.pet_id) : undefined;
    const open = openId === b.id;
    const items = b.items || [];
    const paidBill = isPaid(b);
    return (
      <li key={b.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button className="w-full text-left p-3 sm:p-4 flex items-center gap-3" onClick={() => setOpenId(open ? null : b.id)} aria-expanded={open}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${paidBill ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
            {paidBill ? <CheckCircle2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm truncate">
              {pet?.name ? `${pet.name}` : 'Clinic bill'}
              <span className="text-gray-400 font-normal"> · {items.length} item{items.length === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-gray-500">
              {paidBill
                ? `Paid ${b.paid_at ? formatDate(ymd(b.paid_at)) : ''}${b.payment_method ? ` via ${b.payment_method}` : ''}`
                : `Billed ${b.created_at ? formatDate(ymd(b.created_at)) : ''}`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-semibold ${paidBill ? 'text-gray-900' : 'text-orange-600'}`}>{peso(b.total_cost)}</div>
            <div className={`text-[11px] font-semibold uppercase ${paidBill ? 'text-emerald-600' : 'text-orange-500'}`}>{paidBill ? 'Paid' : (b.status || 'Unpaid')}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="border-t border-gray-100 bg-[#fcfbf9] px-3 sm:px-4 py-3">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500">No item details.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="text-gray-800 break-words">{it.name}</div>
                      <div className="text-xs text-gray-500">{it.quantity} × {peso(it.unit_price)}</div>
                    </div>
                    <div className="font-medium text-gray-900 shrink-0">{peso(it.subtotal)}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between border-t border-gray-200 mt-1 pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{peso(b.total_cost)}</span>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <PageHeader title="Bills" subtitle="Your clinic bills and payment history" />
      <div className="space-y-5">
        <Panel className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">Unpaid</h3>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${balance > 0 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Balance due:</span>
              <span className="font-bold">{peso(balance)}</span>
            </div>
          </div>
          {unpaid.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="You're all paid up" text="Thank you! There are no outstanding bills." />
          ) : (
            <>
              <ul className="space-y-2">{unpaid.map(billRow)}</ul>
              <p className="text-xs text-gray-500 mt-3">Payments are settled at the clinic. Questions about a bill? Call {CLINIC_PHONE}.</p>
            </>
          )}
        </Panel>

        <Panel className="p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Payment history</h3>
          {paid.length === 0 ? (
            <EmptyState icon={Receipt} title="No payments yet" />
          ) : (
            <ul className="space-y-2">{paid.map(billRow)}</ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
