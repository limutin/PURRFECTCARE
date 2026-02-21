import React, { useState } from 'react';
import { Heart, LayoutDashboard, Users, Calendar, FileText, Banknote, LogOut } from 'lucide-react';
import { DashboardOverview } from './secretary/DashboardOverview';
import { ClientsPetsManager } from './secretary/ClientsPetsManager';
import { AppointmentsManager } from './secretary/AppointmentsManager';
import { RecordsViewer } from './secretary/RecordsViewer';
import { BillingViewer } from './secretary/BillingViewer';

interface SecretaryDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export function SecretaryDashboard({ user, accessToken, onLogout }: SecretaryDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients & Pets', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'records', label: 'Medical Records', icon: FileText },
    { id: 'billing', label: 'Billing', icon: Banknote },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview accessToken={accessToken} />;
      case 'clients':
        return <ClientsPetsManager accessToken={accessToken} />;
      case 'appointments':
        return <AppointmentsManager accessToken={accessToken} />;
      case 'records':
        return <RecordsViewer accessToken={accessToken} />;
      case 'billing':
        return <BillingViewer accessToken={accessToken} />;
      default:
        return <DashboardOverview accessToken={accessToken} />;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'SC';
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
              <div className="vc-sidebar-brand-role">Secretary Portal</div>
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
          {menuItems.slice(1).map((item) => (
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
          <button className="vc-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="vc-main">
        <div className="vc-main-header">
          <h1>{getActiveLabel()}</h1>
          <span className="vc-main-header-badge">Secretary</span>
        </div>
        <div className="vc-main-content vc-animate-in" key={activeTab}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
