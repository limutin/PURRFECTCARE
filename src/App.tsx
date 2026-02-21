import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, supabaseUrl, getFunctionUrl } from './utils/supabase/info';
import { supabase } from './utils/supabase/client';
import { LoginPage } from './components/LoginPage';
import { DoctorDashboard } from './components/DoctorDashboard';
import { SecretaryDashboard } from './components/SecretaryDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { Toaster } from './components/ui/sonner';


export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        setAccessToken(session.access_token);
        await fetchUserInfo(session.access_token);
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch(
        getFunctionUrl('/user'),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': publicAnonKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Fetch user info error:", error);
    }
  };

  const handleLogin = async (token: string, userData: any) => {
    setAccessToken(token);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafb 50%, #ecfdf5 100%)',
        fontFamily: "'Inter', sans-serif",
        gap: '1.5rem',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(5, 150, 105, 0.2)',
          animation: 'pulse 2s ease-in-out infinite',
          overflow: 'hidden'
        }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            PURRFECTCARE
          </div>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 4 }}>
            Loading your workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  // Route based on user role
  if (user.role === 'doctor') {
    return (
      <>
        <DoctorDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  if (user.role === 'secretary') {
    return (
      <>
        <SecretaryDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  if (user.role === 'client') {
    return (
      <>
        <ClientDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        background: '#f8fafb',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#374151' }}>
          Unknown user role
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#ef4444',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
      <Toaster />
    </>
  );
}
