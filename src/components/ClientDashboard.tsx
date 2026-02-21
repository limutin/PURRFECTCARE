import React, { useState } from 'react';
import { Heart, Calendar, PawPrint, Banknote, User, LogOut } from 'lucide-react';
import { MyAppointments } from './client/MyAppointments';
import { MyPets } from './client/MyPets';
import { MyBills } from './client/MyBills';
import { MyProfile } from './client/MyProfile';

interface ClientDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export function ClientDashboard({ user, accessToken, onLogout }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState('appointments');

  const menuItems = [
    { id: 'appointments', label: 'My Appointments', icon: Calendar },
    { id: 'pets', label: 'My Pets', icon: PawPrint },
    { id: 'bills', label: 'My Bills', icon: Banknote },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <MyAppointments accessToken={accessToken} />;
      case 'pets':
        return <MyPets accessToken={accessToken} />;
      case 'bills':
        return <MyBills accessToken={accessToken} />;
      case 'profile':
        return <MyProfile user={user} accessToken={accessToken} />;
      default:
        return <MyAppointments accessToken={accessToken} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
                <div className="vc-topbar-subtitle">Client Portal</div>
              </div>
            </div>

            <div className="vc-topbar-right">
              <div className="vc-topbar-user">
                <div className="vc-topbar-user-name">{user.name}</div>
                <div className="vc-topbar-user-email">{user.email}</div>
              </div>
              <button className="vc-topbar-logout" onClick={onLogout}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="vc-tab-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`vc-tab-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="vc-client-main vc-animate-in" key={activeTab}>
        {renderContent()}
      </main>
    </div>
  );
}
