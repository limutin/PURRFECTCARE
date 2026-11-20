import React, { useState } from 'react';
import {
  LayoutDashboard, PawPrint, CalendarHeart, Stethoscope, Receipt, ClipboardList, BarChart3, FileText,
} from 'lucide-react';
import { DashboardOverview } from './secretary/DashboardOverview';
import { OwnersPetsManager } from './secretary/OwnersPetsManager';
import { AppointmentsManager } from './secretary/AppointmentsManager';
import { RecordsViewer } from './secretary/RecordsViewer';
import { BillingManager } from './doctor/BillingManager';
import { ServicesManager } from './doctor/ServicesManager';
import { DailyReport } from './doctor/DailyReport';
import { FormsManager } from './doctor/FormsManager';
import { PatientProfile } from './shared/PatientProfile';
import { ClinicShell, MenuSection } from './shared/ClinicShell';

interface SecretaryDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

const SECTIONS: MenuSection[] = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Front desk',
    items: [
      { id: 'clients', label: 'Owners & Pets', icon: PawPrint },
      { id: 'appointments', label: 'Appointments', icon: CalendarHeart },
      { id: 'records', label: 'Medical Records', icon: Stethoscope },
    ],
  },
  {
    label: 'Cashier',
    items: [
      { id: 'billing', label: 'Billing', icon: Receipt },
      { id: 'services', label: 'Services & Prices', icon: ClipboardList },
      { id: 'report', label: 'Daily Report', icon: BarChart3 },
      { id: 'forms', label: 'Forms', icon: FileText },
    ],
  },
];

export function SecretaryDashboard({ user, accessToken, onLogout }: SecretaryDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [patientId, setPatientId] = useState<string | null>(null);

  const navigate = (tab: string) => setActiveTab(tab === 'diagnosis' ? 'records' : tab);

  const openPatient = (petId: string) => {
    if (activeTab !== 'patient') setPreviousTab(activeTab);
    setPatientId(petId);
    setActiveTab('patient');
  };

  const title = activeTab === 'patient'
    ? 'Patient Profile'
    : SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'Dashboard';

  const renderContent = () => {
    switch (activeTab) {
      case 'clients': return <OwnersPetsManager accessToken={accessToken} />;
      case 'appointments': return <AppointmentsManager accessToken={accessToken} />;
      case 'records': return <RecordsViewer accessToken={accessToken} />;
      case 'billing': return <BillingManager accessToken={accessToken} />;
      case 'services': return <ServicesManager accessToken={accessToken} />;
      case 'report': return <DailyReport accessToken={accessToken} />;
      case 'forms': return <FormsManager accessToken={accessToken} />;
      case 'patient':
        return patientId
          ? <PatientProfile accessToken={accessToken} petId={patientId} onBack={() => setActiveTab(previousTab)} />
          : null;
      default:
        return <DashboardOverview accessToken={accessToken} user={user} onNavigate={navigate} />;
    }
  };

  return (
    <ClinicShell
      user={user}
      accessToken={accessToken}
      portalLabel="Front Desk Portal"
      roleBadge="Secretary"
      sections={SECTIONS}
      activeTab={activeTab === 'patient' ? '' : activeTab}
      title={title}
      onNavigate={navigate}
      onOpenPatient={openPatient}
      onLogout={onLogout}
    >
      {renderContent()}
    </ClinicShell>
  );
}
