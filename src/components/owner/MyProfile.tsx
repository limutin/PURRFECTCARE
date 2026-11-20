import React from 'react';
import { User, Phone, MapPin, Mail, PawPrint, Info } from 'lucide-react';
import { OwnerOverview, Panel, PageHeader, CLINIC_PHONE } from './ownerShared';

interface MyProfileProps {
  user: any;
  data: OwnerOverview;
}

export function MyProfile({ user, data }: MyProfileProps) {
  const owner = data.owners[0];
  const initials = (owner?.name || user?.name || '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const field = (Icon: any, label: string, value?: string | null) => (
    <div className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 break-words">{value || <span className="text-gray-400 font-normal">Not provided</span>}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" subtitle="Your details on file at the clinic" />
      <Panel className="p-5 sm:p-6">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{owner?.name || user?.name}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <PawPrint className="w-3.5 h-3.5" /> {data.pets.length} pet{data.pets.length === 1 ? '' : 's'} registered
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {owner && field(User, 'Name on file', owner.name)}
          {owner && field(Phone, 'Contact number', owner.contact)}
          {owner && field(MapPin, 'Address', owner.address)}
          {field(Mail, 'Account email (sign-in)', user?.email)}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {owner
              ? `Need to update your details? Please let the clinic staff know on your next visit or call ${CLINIC_PHONE}.`
              : `Your account isn't linked to a client record yet. Ask the clinic to register you with this email address, or call ${CLINIC_PHONE}.`}
          </span>
        </div>
      </Panel>
    </div>
  );
}
