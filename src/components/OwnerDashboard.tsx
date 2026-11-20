import React, { useCallback, useEffect, useState } from 'react';
import { Home, Calendar, PawPrint, Banknote, User, LogOut, RefreshCw, Phone, Link2Off } from 'lucide-react';
import { api } from '../utils/api';
import { OwnerHome } from './owner/OwnerHome';
import { MyAppointments } from './owner/MyAppointments';
import { MyPets } from './owner/MyPets';
import { MyBills } from './owner/MyBills';
import { MyProfile } from './owner/MyProfile';
import { OwnerOverview, CLINIC_PHONE, Panel } from './owner/ownerShared';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface OwnerDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

type TabId = 'home' | 'pets' | 'appointments' | 'bills' | 'profile';

const EMPTY: OwnerOverview = { owners: [], pets: [], appointments: [], bills: [], history: [], visits: [] };

export function OwnerDashboard({ user, accessToken, onLogout }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [data, setData] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusPetId, setFocusPetId] = useState<string | null>(null);

  // Owner-scoped data only: the server matches the signed-in email to owners.email.
  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api<Partial<OwnerOverview>>('/my/overview', accessToken);
      setData({ ...EMPTY, ...res, owners: res.owners || [], pets: res.pets || [], appointments: res.appointments || [], bills: res.bills || [], history: res.history || [], visits: res.visits || [] });
    } catch (e: any) {
      setError(e?.message || 'Could not load your information.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const menuItems: { id: TabId; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'pets', label: 'My Pets', icon: PawPrint },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'bills', label: 'Bills', icon: Banknote },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const goTo = (tab: string, petId?: string) => {
    setFocusPetId(petId || null);
    setActiveTab(tab as TabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      );
    }

    if (error || !data) {
      return (
        <Panel className="p-8 text-center max-w-lg mx-auto">
          <p className="font-semibold text-gray-900">We couldn't load your information</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => { setLoading(true); load(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Try again
          </Button>
        </Panel>
      );
    }

    if (data.owners.length === 0 && activeTab !== 'profile') {
      return (
        <Panel className="p-8 sm:p-10 text-center max-w-xl mx-auto">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
            <Link2Off className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Welcome to PurrfectCare!</h2>
          <p className="text-gray-600 mt-2">
            Your account isn't linked to a client record yet. Please ask the clinic to register you using the
            same email address you signed in with:
          </p>
          <p className="mt-3 inline-block rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 font-medium text-gray-800 break-all">
            {user?.email}
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Once linked, your pets, appointments, vaccination records and bills will appear here.
          </p>
          <a
            href={`tel:${CLINIC_PHONE.replace(/\s/g, '')}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold"
          >
            <Phone className="w-4 h-4" /> Call the clinic: {CLINIC_PHONE}
          </a>
        </Panel>
      );
    }

    switch (activeTab) {
      case 'home':
        return <OwnerHome user={user} data={data} onNavigate={goTo} />;
      case 'pets':
        return <MyPets data={data} focusPetId={focusPetId} />;
      case 'appointments':
        return <MyAppointments data={data} accessToken={accessToken} onChanged={load} />;
      case 'bills':
        return <MyBills data={data} />;
      case 'profile':
        return <MyProfile user={user} data={data} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <header className="vc-topbar">
        <div className="vc-topbar-inner">
          <div className="vc-topbar-main">
            <div className="vc-topbar-brand">
              <div className="vc-topbar-logo">
                <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
              </div>
              <div>
                <div className="vc-topbar-title">PURRFECTCARE</div>
                <div className="vc-topbar-subtitle">Owner Portal</div>
              </div>
            </div>

            <div className="vc-topbar-right">
              <div className="vc-topbar-user hidden sm:block">
                <div className="vc-topbar-user-name">{user?.name}</div>
                <div className="vc-topbar-user-email">{user?.email}</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="vc-topbar-logout" aria-label="Sign out">
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be returned to the login screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onLogout}>Sign Out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Tab Navigation (desktop/tablet) */}
          <nav className="vc-tab-nav" aria-label="Owner portal sections">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`vc-tab-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => goTo(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="vc-owner-main vc-animate-in" key={activeTab}>
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="vc-bottom-nav" aria-label="Owner portal sections">
        <div className="vc-bottom-nav-container">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`vc-bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => goTo(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              style={{ minWidth: 0 }}
            >
              <item.icon size={20} className="vc-nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
