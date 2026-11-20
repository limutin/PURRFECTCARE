import React from 'react';
import { todayLocal } from '../../utils/formatDate';

/* ---------- Types for GET /my/overview ---------- */

export interface OwnerRecord {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface OwnerPet {
  id: string;
  name: string;
  type?: string | null;
  breed?: string | null;
  sex?: string | null;
  birthday?: string | null;
  color?: string | null;
  weight?: string | number | null;
  microchip?: string | null;
  photo_url?: string | null;
  allergies?: string | null;
}

export interface OwnerAppointment {
  id: string;
  pet_id: string;
  date: string;
  time?: string | null;
  reason?: string | null;
  status?: string | null;
}

export interface OwnerBillItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OwnerBill {
  id: string;
  pet_id?: string | null;
  total_cost: number;
  status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  items?: OwnerBillItem[];
}

export interface OwnerHistory {
  id: string;
  pet_id: string;
  type: 'vaccination' | 'deworming' | 'other';
  name: string;
  date?: string | null;
  next_due_date?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface OwnerVisit {
  id: string;
  pet_id: string;
  date: string;
  weight?: string | number | null;
  temperature?: string | number | null;
  vaccination?: string | null;
  dx?: string | null;
  rx?: string | null;
  follow_up_date?: string | null;
}

export interface OwnerOverview {
  owners: OwnerRecord[];
  pets: OwnerPet[];
  appointments: OwnerAppointment[];
  bills: OwnerBill[];
  history: OwnerHistory[];
  visits: OwnerVisit[];
}

export const CLINIC_PHONE = '0926 740 8552';

/* ---------- Date helpers ---------- */

/** Adds `days` to a YYYY-MM-DD string and returns YYYY-MM-DD (local time). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return todayLocal(new Date(y, m - 1, d + days));
}

/** First 10 chars of an ISO-ish date, for string comparison. */
export const ymd = (s?: string | null) => (s ? String(s).slice(0, 10) : '');

/** Whole days from today until `date` (negative if in the past). */
export function daysUntil(date: string): number {
  const [y, m, d] = ymd(date).split('-').map(Number);
  const [ty, tm, td] = todayLocal().split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000);
}

/** "14:30" -> "2:30 PM" */
export function formatTime(t?: string | null): string {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function petAge(birthday?: string | null): string {
  if (!birthday) return '';
  const [y, m, d] = ymd(birthday).split('-').map(Number);
  if (!y) return '';
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - (m - 1));
  if (now.getDate() < d) months -= 1;
  if (months < 0) return '';
  if (months < 12) return `${months} mo${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} yr${years > 1 ? 's' : ''}`;
}

export const parseWeight = (w?: string | number | null): number | null => {
  if (w === null || w === undefined || w === '') return null;
  const n = parseFloat(String(w));
  return isNaN(n) ? null : n;
};

/* ---------- Due-date logic ---------- */

export type DueState = 'overdue' | 'soon' | 'ok' | 'none';

export function dueState(next?: string | null): DueState {
  if (!next) return 'none';
  const days = daysUntil(next);
  if (days < 0) return 'overdue';
  if (days <= 30) return 'soon';
  return 'ok';
}

/**
 * Only the latest record of each (pet, type, name) counts for reminders,
 * so an old record isn't flagged "overdue" after the shot was repeated.
 */
export function latestHistoryIds(history: OwnerHistory[]): Set<string> {
  const latest = new Map<string, OwnerHistory>();
  for (const h of history) {
    if (h.type !== 'vaccination' && h.type !== 'deworming') continue;
    const key = `${h.pet_id}|${h.type}|${(h.name || '').trim().toLowerCase()}`;
    const cur = latest.get(key);
    if (!cur || ymd(h.date) > ymd(cur.date)) latest.set(key, h);
  }
  return new Set([...latest.values()].map((h) => h.id));
}

/** Vaccines / dewormings that are overdue or due within 30 days. */
export function dueReminders(history: OwnerHistory[]): OwnerHistory[] {
  const ids = latestHistoryIds(history);
  return history
    .filter((h) => ids.has(h.id) && (dueState(h.next_due_date) === 'overdue' || dueState(h.next_due_date) === 'soon'))
    .sort((a, b) => ymd(a.next_due_date).localeCompare(ymd(b.next_due_date)));
}

export function DueBadge({ date }: { date?: string | null }) {
  const s = dueState(date);
  if (s === 'overdue') {
    return <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">Overdue</span>;
  }
  if (s === 'soon') {
    const d = daysUntil(date!);
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
        {d === 0 ? 'Due today' : `Due in ${d} day${d === 1 ? '' : 's'}`}
      </span>
    );
  }
  return null;
}

/* ---------- Appointment status ---------- */

export const normStatus = (s?: string | null) => (s || '').trim().toLowerCase();

export const isCancellable = (a: OwnerAppointment) => ['requested', 'scheduled'].includes(normStatus(a.status));

export const isClosedStatus = (s?: string | null) => ['completed', 'cancelled', 'canceled', 'no-show', 'no show'].includes(normStatus(s));

export function StatusPill({ status }: { status?: string | null }) {
  const s = normStatus(status);
  const map: Record<string, { label: string; cls: string }> = {
    requested: { label: 'Awaiting confirmation', cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
    pending: { label: 'Awaiting confirmation', cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
    scheduled: { label: 'Scheduled', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
    completed: { label: 'Completed', cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
    canceled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
  };
  const m = map[s] || { label: status || 'Unknown', cls: 'bg-gray-100 text-gray-700 ring-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

export const isPaid = (b: OwnerBill) => normStatus(b.status) === 'paid';

/* ---------- Layout bits ---------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: any; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-semibold text-gray-800">{title}</p>
      {text && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** Plain white rounded panel used throughout the owner portal. */
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm ${className}`}>{children}</div>;
}
