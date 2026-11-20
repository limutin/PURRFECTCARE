import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Syringe, Bug, Stethoscope, ChevronDown, PawPrint, Scale, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PetAvatar } from '../shared/PetAvatar';
import { formatDate } from '../../utils/formatDate';
import {
  OwnerOverview, OwnerPet, OwnerHistory, OwnerVisit, Panel, PageHeader, EmptyState, DueBadge,
  latestHistoryIds, petAge, parseWeight, ymd, dueState,
} from './ownerShared';

interface MyPetsProps {
  data: OwnerOverview;
  focusPetId?: string | null;
}

export function MyPets({ data, focusPetId }: MyPetsProps) {
  const [openId, setOpenId] = useState<string | null>(focusPetId || (data.pets.length === 1 ? data.pets[0].id : null));
  const latestIds = useMemo(() => latestHistoryIds(data.history), [data.history]);

  return (
    <div>
      <PageHeader title="My Pets" subtitle="Health records, vaccination cards and recent visits" />
      {data.pets.length === 0 ? (
        <Panel>
          <EmptyState icon={PawPrint} title="No pets on file yet" text="Your pets will appear here once the clinic registers them to your account." />
        </Panel>
      ) : (
        <div className="space-y-4">
          {data.pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              open={openId === pet.id}
              scrollIntoView={focusPetId === pet.id}
              onToggle={() => setOpenId(openId === pet.id ? null : pet.id)}
              history={data.history.filter((h) => h.pet_id === pet.id)}
              visits={data.visits.filter((v) => v.pet_id === pet.id)}
              latestIds={latestIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PetCard({
  pet, open, onToggle, history, visits, latestIds, scrollIntoView,
}: {
  pet: OwnerPet;
  open: boolean;
  onToggle: () => void;
  history: OwnerHistory[];
  visits: OwnerVisit[];
  latestIds: Set<string>;
  scrollIntoView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollIntoView) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollIntoView]);

  const age = petAge(pet.birthday);
  const facts = [pet.type, pet.breed, pet.sex, age].filter(Boolean).join(' · ');
  const alerts = history.filter((h) => latestIds.has(h.id) && ['overdue', 'soon'].includes(dueState(h.next_due_date))).length;

  return (
    <div ref={ref} style={{ scrollMarginTop: 120 }}>
      <Panel className={`overflow-hidden transition-shadow ${open ? 'ring-1 ring-emerald-200' : ''}`}>
        <button onClick={onToggle} className="w-full text-left p-4 sm:p-5 flex items-center gap-4" aria-expanded={open}>
          <PetAvatar type={pet.type || undefined} photoUrl={pet.photo_url} name={pet.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">{pet.name}</h3>
              {alerts > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-semibold">
                  {alerts} due
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 capitalize truncate">{facts || 'No details yet'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
              {pet.weight && <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5" />{pet.weight}{/^[\d.]+$/.test(String(pet.weight)) ? ' kg' : ''}</span>}
              {pet.color && <span>Color: {pet.color}</span>}
              {pet.birthday && <span>Born {formatDate(ymd(pet.birthday))}</span>}
              {pet.microchip && <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" />{pet.microchip}</span>}
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {pet.allergies && pet.allergies.trim() && (
          <div className="mx-4 sm:mx-5 mb-4 -mt-1 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span><span className="font-semibold">Allergies:</span> {pet.allergies}</span>
          </div>
        )}

        {open && (
          <div className="border-t border-gray-100 bg-[#fcfbf9] p-4 sm:p-5 space-y-5">
            <VaccinationCard history={history} latestIds={latestIds} />
            <WeightChart visits={visits} />
            <RecentVisits visits={visits} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function VaccinationCard({ history, latestIds }: { history: OwnerHistory[]; latestIds: Set<string> }) {
  const rows = history
    .filter((h) => h.type === 'vaccination' || h.type === 'deworming')
    .sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)));
  const others = history.filter((h) => h.type === 'other').sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)));

  return (
    <section>
      <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
        <Syringe className="w-4 h-4 text-emerald-600" /> Vaccination card
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 p-4 bg-white">No vaccination or deworming records yet.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead className="bg-emerald-50/70 text-emerald-900 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Type</th>
                <th className="text-left font-semibold px-3 py-2">Vaccine / product</th>
                <th className="text-left font-semibold px-3 py-2">Date given</th>
                <th className="text-left font-semibold px-3 py-2">Next due</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((h) => (
                <tr key={h.id} className={latestIds.has(h.id) ? '' : 'text-gray-400'}>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 capitalize">
                      {h.type === 'deworming' ? <Bug className="w-3.5 h-3.5" /> : <Syringe className="w-3.5 h-3.5" />}
                      {h.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {h.name}
                    {h.notes && <div className="text-xs font-normal text-gray-500">{h.notes}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.date ? formatDate(ymd(h.date)) : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.next_due_date ? formatDate(ymd(h.next_due_date)) : '—'}</td>
                  <td className="px-3 py-2 text-right">{latestIds.has(h.id) && <DueBadge date={h.next_due_date} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile list */}
          <ul className="sm:hidden divide-y divide-gray-100">
            {rows.map((h) => (
              <li key={h.id} className={`p-3 ${latestIds.has(h.id) ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                      {h.type === 'deworming' ? <Bug className="w-3.5 h-3.5 text-gray-500" /> : <Syringe className="w-3.5 h-3.5 text-gray-500" />}
                      {h.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Given {h.date ? formatDate(ymd(h.date)) : '—'}
                      {h.next_due_date && <> · Next {formatDate(ymd(h.next_due_date))}</>}
                    </div>
                  </div>
                  {latestIds.has(h.id) && <DueBadge date={h.next_due_date} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {others.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Other treatments</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {others.map((h) => (
              <li key={h.id}>
                <span className="font-medium">{h.name}</span>
                {h.date && <span className="text-gray-500"> · {formatDate(ymd(h.date))}</span>}
                {h.next_due_date && <span className="text-gray-500"> · next {formatDate(ymd(h.next_due_date))}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function WeightChart({ visits }: { visits: OwnerVisit[] }) {
  const points = visits
    .map((v) => ({ date: ymd(v.date), weight: parseWeight(v.weight) }))
    .filter((p): p is { date: string; weight: number } => !!p.date && p.weight !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      ...p,
      label: new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    }));
  if (points.length < 2) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
        <Scale className="w-4 h-4 text-emerald-600" /> Weight over time
      </h4>
      <div className="rounded-xl border border-gray-200 bg-white p-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} unit=" kg" width={64} />
            <Tooltip
              formatter={(v: any) => [`${v} kg`, 'Weight']}
              contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0d9488' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RecentVisits({ visits }: { visits: OwnerVisit[] }) {
  const sorted = [...visits].sort((a, b) => ymd(b.date).localeCompare(ymd(a.date))).slice(0, 8);
  return (
    <section>
      <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
        <Stethoscope className="w-4 h-4 text-emerald-600" /> Recent visits
      </h4>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 p-4 bg-white">No visits recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((v) => (
            <li key={v.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900 text-sm">{formatDate(ymd(v.date))}</span>
                <span className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {v.weight && <span>Weight: {v.weight}{/^[\d.]+$/.test(String(v.weight)) ? ' kg' : ''}</span>}
                  {v.temperature && <span>Temp: {v.temperature}{/^[\d.]+$/.test(String(v.temperature)) ? ' °C' : ''}</span>}
                </span>
              </div>
              {v.dx && (
                <p className="text-sm text-gray-700 mt-1 line-clamp-3 break-words">
                  <span className="text-gray-500">Diagnosis: </span>{v.dx}
                </p>
              )}
              {v.vaccination && (
                <p className="text-sm text-gray-700 mt-1 break-words">
                  <span className="text-gray-500">Vaccination: </span>{v.vaccination}
                </p>
              )}
              {v.follow_up_date && (
                <p className="text-xs text-emerald-700 mt-1 font-medium">Follow-up: {formatDate(ymd(v.follow_up_date))}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
