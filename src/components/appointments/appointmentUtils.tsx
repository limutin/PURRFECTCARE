import React from 'react';

/** Canonical appointment statuses, in workflow order. */
export type AptStatus = 'Requested' | 'Scheduled' | 'Waiting' | 'In consult' | 'completed' | 'cancelled' | 'No-show';

/** Maps legacy / differently-cased values onto the canonical set. */
export function normalizeStatus(status?: string): AptStatus {
  const s = String(status || '').trim();
  const l = s.toLowerCase();
  if (l === 'requested') return 'Requested';
  if (l === 'waiting' || l === 'checked in') return 'Waiting';
  if (l === 'in consult' || l === 'in-consult' || l === 'in_consult') return 'In consult';
  if (l === 'completed' || l === 'done') return 'completed';
  if (l === 'cancelled' || l === 'canceled' || l === 'declined') return 'cancelled';
  if (l === 'no-show' || l === 'noshow' || l === 'no show') return 'No-show';
  // 'Scheduled', legacy 'pending' / 'confirmed', and anything unknown
  return 'Scheduled';
}

export const STATUS_META: Record<AptStatus, { label: string; pill: string; dot: string; chip: string }> = {
  Requested: {
    label: 'Requested',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
    chip: 'border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/80',
  },
  Scheduled: {
    label: 'Scheduled',
    pill: 'bg-sky-50 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
    chip: 'border-l-sky-500 bg-sky-50/70 hover:bg-sky-100/80',
  },
  Waiting: {
    label: 'Waiting',
    pill: 'bg-violet-50 text-violet-800 ring-violet-200',
    dot: 'bg-violet-500',
    chip: 'border-l-violet-500 bg-violet-50/70 hover:bg-violet-100/80',
  },
  'In consult': {
    label: 'In consult',
    pill: 'bg-teal-50 text-teal-800 ring-teal-200',
    dot: 'bg-teal-500',
    chip: 'border-l-teal-500 bg-teal-50/70 hover:bg-teal-100/80',
  },
  completed: {
    label: 'Completed',
    pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
    chip: 'border-l-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/80',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
    chip: 'border-l-slate-400 bg-slate-50 hover:bg-slate-100 opacity-70',
  },
  'No-show': {
    label: 'No-show',
    pill: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    chip: 'border-l-rose-500 bg-rose-50/70 hover:bg-rose-100/80 opacity-80',
  },
};

/** Statuses that occupy a slot on the schedule. */
export const isActive = (status?: string) => {
  const s = normalizeStatus(status);
  return s !== 'cancelled' && s !== 'No-show';
};

export function StatusPill({ status, className = '' }: { status?: string; className?: string }) {
  const meta = STATUS_META[normalizeStatus(status)];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${meta.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** "14:30:00" -> "2:30 PM". */
export function fmtTime(time?: string) {
  if (!time) return '--:--';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

/** Parses "YYYY-MM-DD" as a local date. */
export function parseLocalDate(date?: string) {
  const [y, m, d] = String(date || '').split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/** Sort key "YYYY-MM-DD HH:MM". */
export const aptSortKey = (apt: any) => `${apt.value.date || ''} ${(apt.value.time || '99:99').substring(0, 5)}`;
