import React, { useState } from 'react';
import {
  LayoutDashboard, PawPrint, CalendarHeart, Stethoscope, Pill, Receipt, ClipboardList, BarChart3, FileText, UserCog,
} from 'lucide-react';
import { DashboardOverview } from './doctor/DashboardOverview';
import { OwnersPetsManager } from './doctor/OwnersPetsManager';
import { AppointmentsManager } from './doctor/AppointmentsManager';
import { DiagnosisManager } from './doctor/DiagnosisManager';
import { InventoryManager } from './doctor/InventoryManager';
import { BillingManager } from './doctor/BillingManager';
import { ServicesManager } from './doctor/ServicesManager';
import { DailyReport } from './doctor/DailyReport';
import { FormsManager } from './doctor/FormsManager';
import { StaffManager } from './doctor/StaffManager';
import { PatientProfile } from './shared/PatientProfile';
import { ClinicShell, MenuSection } from './shared/ClinicShell';

interface DoctorDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

const SECTIONS: MenuSection[] = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Patients',
    items: [
      { id: 'clients', label: 'Owners & Pets', icon: PawPrint },
      { id: 'appointments', label: 'Appointments', icon: CalendarHeart },
      { id: 'diagnosis', label: 'Medical Records', icon: Stethoscope },
    ],
  },
  {
    label: 'Clinic',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Pill },
      { id: 'billing', label: 'Billing', icon: Receipt },
      { id: 'services', label: 'Services & Prices', icon: ClipboardList },
      { id: 'report', label: 'Daily Report', icon: BarChart3 },
      { id: 'forms', label: 'Forms', icon: FileText },
      { id: 'staff', label: 'Staff Accounts', icon: UserCog },
    ],
  },
];

export function DoctorDashboard({ user, accessToken, onLogout }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [patientId, setPatientId] = useState<string | null>(null);

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
      case 'diagnosis': return <DiagnosisManager accessToken={accessToken} />;
      case 'inventory': return <InventoryManager accessToken={accessToken} />;
      case 'billing': return <BillingManager accessToken={accessToken} />;
      case 'services': return <ServicesManager accessToken={accessToken} />;
      case 'report': return <DailyReport accessToken={accessToken} />;
      case 'forms': return <FormsManager accessToken={accessToken} />;
      case 'staff': return <StaffManager accessToken={accessToken} currentUserId={user?.id} />;
      case 'patient':
        return patientId
          ? <PatientProfile accessToken={accessToken} petId={patientId} onBack={() => setActiveTab(previousTab)} />
          : null;
      default:
        return <DashboardOverview accessToken={accessToken} user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <ClinicShell
      user={user}
      accessToken={accessToken}
      portalLabel="Veterinarian Portal"
      roleBadge="Veterinarian"
      sections={SECTIONS}
      activeTab={activeTab === 'patient' ? '' : activeTab}
      title={title}
      onNavigate={setActiveTab}
      onOpenPatient={openPatient}
      onLogout={onLogout}
    >
      {renderContent()}
    </ClinicShell>
  );
}
