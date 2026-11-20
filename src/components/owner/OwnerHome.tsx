import React, { useMemo } from 'react';
import { Calendar, Clock, Syringe, Wallet, ChevronRight, PawPrint, Bug, CheckCircle2 } from 'lucide-react';
import { PetAvatar } from '../shared/PetAvatar';
import { formatDate, todayLocal } from '../../utils/formatDate';
import { peso } from '../../utils/api';
import {
  OwnerOverview, Panel, StatusPill, DueBadge, dueReminders, formatTime, isClosedStatus, isPaid, ymd, daysUntil,
} from './ownerShared';

interface OwnerHomeProps {
  user: any;
  data: OwnerOverview;
  onNavigate: (tab: string, petId?: string) => void;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function OwnerHome({ user, data, onNavigate }: OwnerHomeProps) {
  const petById = useMemo(() => new Map(data.pets.map((p) => [p.id, p])), [data.pets]);
  const today = todayLocal();

  const upcoming = useMemo(
    () =>
      data.appointments
        .filter((a) => ymd(a.date) >= today && !isClosedStatus(a.status))
        .sort((a, b) => `${ymd(a.date)} ${a.time || ''}`.localeCompare(`${ymd(b.date)} ${b.time || ''}`)),
    [data.appointments, today],
  );
  const next = upcoming[0];
  const nextPet = next ? petById.get(next.pet_id) : undefined;

  const due = useMemo(() => dueReminders(data.history), [data.history]);
  const unpaid = data.bills.filter((b) => !isPaid(b));
  const balance = unpaid.reduce((s, b) => s + Number(b.total_cost || 0), 0);

  const firstName = (data.owners[0]?.name || user?.name || '').split(' ')[0];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-5 sm:p-7 shadow-sm">
        <PawPrint className="absolute -right-4 -bottom-6 w-36 h-36 text-white/10 rotate-[-20deg]" aria-hidden />
        <p className="text-emerald-100 text-sm font-medium">{greeting()},</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">{firstName || 'there'}!</h1>
        <p className="text-emerald-50/90 text-sm mt-2 max-w-md">
          {data.pets.length > 0
            ? `Here's what's coming up for ${data.pets.length === 1 ? data.pets[0].name : 'your pets'}.`
            : 'Welcome to your PurrfectCare owner portal.'}
        </p>
        {data.pets.length > 0 && (
          <div className="flex -space-x-2 mt-4">
            {data.pets.slice(0, 6).map((p) => (
              <button key={p.id} onClick={() => onNavigate('pets', p.id)} title={p.name} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <PetAvatar type={p.type || undefined} photoUrl={p.photo_url} name={p.name} size={40} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Next appointment */}
        <Panel className="p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" /> Next appointment
            </h3>
            <button onClick={() => onNavigate('appointments')} className="text-xs font-semibold text-emerald-700 hover:underline flex items-center">
              All appointments <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {next ? (
            <div className="flex items-start gap-4 rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
              <div className="shrink-0 w-14 rounded-xl bg-white border border-emerald-100 text-center py-1.5 shadow-sm">
                <div className="text-[10px] font-bold uppercase text-emerald-700">
                  {new Date(`${ymd(next.date)}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-xl font-bold text-gray-900 leading-tight">{Number(ymd(next.date).slice(8, 10))}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{nextPet?.name || 'Your pet'}</span>
                  <StatusPill status={next.status} />
                </div>
                {next.reason && <p className="text-sm text-gray-600 mt-0.5 break-words">{next.reason}</p>}
                <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(ymd(next.date))}</span>
                  {next.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(next.time)}</span>}
                  <span className="text-emerald-700 font-medium">
                    {daysUntil(next.date) === 0 ? 'Today' : daysUntil(next.date) === 1 ? 'Tomorrow' : `In ${daysUntil(next.date)} days`}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-600">No upcoming visits.</p>
              <button
                onClick={() => onNavigate('appointments')}
                className="mt-3 inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold"
              >
                Request an appointment
              </button>
            </div>
          )}
        </Panel>

        {/* Balance */}
        <Panel className="p-5 flex flex-col">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-orange-500" /> Unpaid balance
          </h3>
          <div className={`text-3xl font-bold tracking-tight ${balance > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{peso(balance)}</div>
          <p className="text-sm text-gray-500 mt-1">
            {unpaid.length > 0 ? `${unpaid.length} unpaid bill${unpaid.length > 1 ? 's' : ''}` : 'You are all settled up.'}
          </p>
          <button onClick={() => onNavigate('bills')} className="mt-auto pt-4 text-xs font-semibold text-emerald-700 hover:underline flex items-center self-start">
            View bills <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Panel>
      </div>

      {/* Due soon */}
      <Panel className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-amber-600" /> Due soon
          </h3>
          <span className="text-xs text-gray-400">Vaccines & deworming, next 30 days</span>
        </div>
        {due.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 rounded-xl bg-gray-50 p-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Nothing due in the next 30 days. Great job keeping up!
          </div>
        ) : (
          <ul className="space-y-2">
            {due.map((h) => {
              const pet = petById.get(h.pet_id);
              const overdue = daysUntil(h.next_due_date!) < 0;
              return (
                <li key={h.id}>
                  <button
                    onClick={() => onNavigate('pets', h.pet_id)}
                    className={`w-full text-left flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      overdue ? 'border-red-200 bg-red-50/70 hover:bg-red-50' : 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                    }`}
                  >
                    <PetAvatar type={pet?.type || undefined} photoUrl={pet?.photo_url} name={pet?.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                        {h.type === 'deworming' ? <Bug className="w-3.5 h-3.5 text-gray-500" /> : <Syringe className="w-3.5 h-3.5 text-gray-500" />}
                        <span className="truncate">{h.name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {pet?.name || 'Pet'} · due {formatDate(ymd(h.next_due_date))}
                      </div>
                    </div>
                    <DueBadge date={h.next_due_date} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
