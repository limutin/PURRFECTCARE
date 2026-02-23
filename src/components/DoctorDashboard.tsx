import React, { useState } from 'react';
import { Heart, LayoutDashboard, Users, Calendar, FileText, Package, Banknote, FilePlus, LogOut, User } from 'lucide-react';
import { DashboardOverview } from './doctor/DashboardOverview';
import { ClientsPetsManager } from './doctor/ClientsPetsManager';
import { AppointmentsManager } from './doctor/AppointmentsManager';
import { DiagnosisManager } from './doctor/DiagnosisManager';
import { InventoryManager } from './doctor/InventoryManager';
import { BillingManager } from './doctor/BillingManager';
import { FormsManager } from './doctor/FormsManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface DoctorDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export function DoctorDashboard({ user, accessToken, onLogout }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients & Pets', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'diagnosis', label: 'Diagnosis', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'billing', label: 'Billing', icon: Banknote },
    { id: 'forms', label: 'Forms', icon: FilePlus },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview accessToken={accessToken} onNavigate={setActiveTab} />;
      case 'clients':
        return <ClientsPetsManager accessToken={accessToken} />;
      case 'appointments':
        return <AppointmentsManager accessToken={accessToken} />;
      case 'diagnosis':
        return <DiagnosisManager accessToken={accessToken} />;
      case 'inventory':
        return <InventoryManager accessToken={accessToken} />;
      case 'billing':
        return <BillingManager accessToken={accessToken} />;
      case 'forms':
        return <FormsManager accessToken={accessToken} />;
      default:
        return <DashboardOverview accessToken={accessToken} onNavigate={setActiveTab} />;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';
  };

  const getActiveLabel = () => {
    return menuItems.find(item => item.id === activeTab)?.label || 'Dashboard';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <aside className="vc-sidebar">
        <div className="vc-sidebar-header">
          <div className="vc-sidebar-brand">
            <div className="vc-sidebar-logo">
              <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
            </div>
            <div>
              <div className="vc-sidebar-brand-name">PURRFECTCARE</div>
              <div className="vc-sidebar-brand-role">Doctor Portal</div>
            </div>
          </div>
        </div>

        <nav className="vc-sidebar-nav">
          <div className="vc-sidebar-section-label">Main Menu</div>
          {menuItems.slice(0, 1).map((item) => (
            <button
              key={item.id}
              className={`vc-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={20} className="vc-nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}

          <div className="vc-sidebar-section-label">Management</div>
          {menuItems.slice(1, 4).map((item) => (
            <button
              key={item.id}
              className={`vc-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={20} className="vc-nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}

          <div className="vc-sidebar-section-label">Operations</div>
          {menuItems.slice(4).map((item) => (
            <button
              key={item.id}
              className={`vc-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={20} className="vc-nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="vc-sidebar-footer">
          <div className="vc-sidebar-user">
            <div className="vc-sidebar-avatar">{getInitials(user.name)}</div>
            <div>
              <div className="vc-sidebar-user-name">{user.name}</div>
              <div className="vc-sidebar-user-email">{user.email}</div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="vc-logout-btn">
                <LogOut size={16} />
                <span>Sign Out</span>
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
      </aside>

      {/* Main Content */}
      <main className="vc-main">
        <div className="vc-main-header">
          <div className="vc-main-header-left">
            <div className="vc-mobile-logo">
              <img src="/logo.jpg" alt="Logo" />
            </div>
            <h1>{getActiveLabel()}</h1>
          </div>
          <div className="vc-main-header-right">
            <span className="vc-main-header-badge">Doctor</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="vc-mobile-logout">
                  <LogOut size={18} />
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
        <div className="vc-main-content vc-animate-in" key={activeTab}>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="vc-bottom-nav">
        <div className="vc-bottom-nav-container">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`vc-bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
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
