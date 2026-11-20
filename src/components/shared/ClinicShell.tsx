import React from 'react';
import { LogOut } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../ui/alert-dialog';
import { GlobalSearch } from './GlobalSearch';
import { PatientNavContext } from './PatientNav';

export interface MenuItem { id: string; label: string; icon: any; }
export interface MenuSection { label: string; items: MenuItem[]; }

interface ClinicShellProps {
  user: any;
  accessToken: string;
  portalLabel: string;       // e.g. "Doctor Portal"
  roleBadge: string;         // e.g. "Doctor"
  sections: MenuSection[];
  activeTab: string;
  title: string;
  onNavigate: (tab: string) => void;
  onOpenPatient: (petId: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

function SignOutDialog({ onLogout, children }: { onLogout: () => void; children: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of PURRFECTCARE?</AlertDialogTitle>
          <AlertDialogDescription>You will be returned to the login screen.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout}>Sign out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export { greeting };

/** Sidebar + header + mobile nav shared by the doctor and secretary portals. */
export function ClinicShell(props: ClinicShellProps) {
  const { user, accessToken, portalLabel, roleBadge, sections, activeTab, title, onNavigate, onOpenPatient, onLogout, children } = props;
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PC';
  const allItems = sections.flatMap(s => s.items);

  return (
    <PatientNavContext.Provider value={{ openPatient: onOpenPatient }}>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <aside className="vc-sidebar">
          <div className="vc-sidebar-header">
            <div className="vc-sidebar-brand">
              <div className="vc-sidebar-logo">
                <img src="/logo.jpg" alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
              </div>
              <div>
                <div className="vc-sidebar-brand-name">PURRFECTCARE</div>
                <div className="vc-sidebar-brand-role">{portalLabel}</div>
              </div>
            </div>
          </div>

          <nav className="vc-sidebar-nav" aria-label="Main">
            {sections.map(section => (
              <React.Fragment key={section.label}>
                <div className="vc-sidebar-section-label">{section.label}</div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className={`vc-nav-item ${activeTab === item.id ? 'active' : ''}`}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                    onClick={() => onNavigate(item.id)}
                  >
                    <item.icon size={18} className="vc-nav-icon" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
            <div className="vc-sidebar-clinic">
              <strong>PURRFECTCARE Animal Clinic</strong>
              Barrientos St., Layawan, Oroquieta City
              <br />0926 740 8552
            </div>
          </nav>

          <div className="vc-sidebar-footer">
            <div className="vc-sidebar-user">
              <div className="vc-sidebar-avatar">{initials}</div>
              <div className="min-w-0">
                <div className="vc-sidebar-user-name truncate">{user?.name}</div>
                <div className="vc-sidebar-user-email">{user?.email}</div>
              </div>
            </div>
            <SignOutDialog onLogout={onLogout}>
              <button className="vc-logout-btn"><LogOut size={15} /><span>Sign out</span></button>
            </SignOutDialog>
          </div>
        </aside>

        <main className="vc-main">
          <div className="vc-main-header">
            <div className="vc-main-header-left flex items-center gap-4 min-w-0">
              <div className="vc-mobile-logo"><img src="/logo.jpg" alt="" /></div>
              <h1 className="truncate">{title}</h1>
            </div>
            <div className="vc-main-header-right">
              <GlobalSearch accessToken={accessToken} onOpenPatient={onOpenPatient} />
              <span className="vc-main-header-date hidden xl:inline">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="vc-main-header-badge">{roleBadge}</span>
              <SignOutDialog onLogout={onLogout}>
                <button className="vc-mobile-logout" aria-label="Sign out"><LogOut size={18} /></button>
              </SignOutDialog>
            </div>
          </div>
          <div className="vc-main-content vc-animate-in" key={activeTab}>
            {children}
          </div>
        </main>

        <nav className="vc-bottom-nav" aria-label="Main">
          <div className="vc-bottom-nav-container">
            {allItems.map(item => (
              <button
                key={item.id}
                className={`vc-bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <item.icon size={20} className="vc-nav-icon" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </PatientNavContext.Provider>
  );
}
