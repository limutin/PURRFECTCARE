import React, { useState, useEffect } from 'react';
import { supabaseUrl, publicAnonKey, getFunctionUrl } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Heart, Stethoscope, Shield, Eye, EyeOff, Loader2, PawPrint, Syringe, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (token: string, user: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState('doctor');
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        toast.error(`Login failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data.session?.access_token) {
        const response = await fetch(
          getFunctionUrl('/user'),
          {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
              'apikey': publicAnonKey,
            },
          }
        );

        if (response.ok) {
          const userData = await response.json();
          toast.success('Login successful!');
          onLogin(data.session.access_token, userData.user);
        } else {
          toast.error('Failed to fetch user information');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        getFunctionUrl('/signup'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            email: signupEmail,
            password: signupPassword,
            name: signupName,
            role: signupRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(`Signup failed: ${data.error || data.message || 'Check server logs'}`);
        setLoading(false);
        return;
      }

      toast.success('Account created! Please login.');
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setSignupRole('doctor');
      setActiveTab('login');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #f8fafb;
          overflow: hidden;
        }

        /* ===== LEFT PANEL ===== */
        .login-hero {
          flex: 1;
          display: none;
          position: relative;
          background: linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%);
          overflow: hidden;
          padding: 3rem;
        }

        @media (min-width: 1024px) {
          .login-hero {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
        }

        .login-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 70%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
                      radial-gradient(circle at 70% 30%, rgba(5, 150, 105, 0.2) 0%, transparent 50%);
          animation: float-bg 20s ease-in-out infinite;
        }

        @keyframes float-bg {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 1%) rotate(1deg); }
          66% { transform: translate(-1%, 2%) rotate(-1deg); }
        }

        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 480px;
        }

        .hero-logo-wrapper {
          width: 150px;
          height: 150px;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.2); }
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.75rem;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 400;
          line-height: 1.6;
          margin-bottom: 3rem;
        }

        .hero-features {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .hero-feature {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          transition: all 0.3s ease;
          animation: slide-up 0.5s ease-out both;
        }

        .hero-feature:nth-child(1) { animation-delay: 0.1s; }
        .hero-feature:nth-child(2) { animation-delay: 0.2s; }
        .hero-feature:nth-child(3) { animation-delay: 0.3s; }

        .hero-feature:hover {
          background: rgba(255, 255, 255, 0.14);
          transform: translateX(6px);
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hero-feature-text h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 2px;
        }

        .hero-feature-text p {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.65);
          font-weight: 400;
        }

        /* Floating elements */
        .floating-element {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .float-1 {
          width: 300px; height: 300px;
          top: -100px; right: -80px;
          animation: float-1 15s ease-in-out infinite;
        }
        .float-2 {
          width: 200px; height: 200px;
          bottom: -60px; left: -40px;
          animation: float-2 12s ease-in-out infinite;
        }
        .float-3 {
          width: 120px; height: 120px;
          top: 40%; right: 10%;
          animation: float-3 10s ease-in-out infinite;
        }

        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 30px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(25px, -15px); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, 20px) scale(1.1); }
        }

        /* ===== RIGHT PANEL (FORM) ===== */
        .login-form-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background: #fff;
          max-width: 100%;
        }

        @media (min-width: 1024px) {
          .login-form-panel {
            max-width: 560px;
            box-shadow: -20px 0 60px rgba(0, 0, 0, 0.04);
          }
        }

        .form-container {
          width: 100%;
          max-width: 400px;
          animation: fade-in 0.6s ease-out;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mobile-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
        }

        @media (min-width: 1024px) {
          .mobile-logo {
            display: none;
          }
        }

        .mobile-logo-icon {
          width: 96px;
          height: 96px;
          border-radius: 24px;
          background: linear-gradient(135deg, #059669, #10B981);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.25);
        }

        .mobile-logo-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .form-header {
          margin-bottom: 2rem;
        }

        .form-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .form-header p {
          font-size: 0.95rem;
          color: #6b7280;
          font-weight: 400;
        }

        /* Custom form styles */
        .login-page .form-group {
          margin-bottom: 1.25rem;
        }

        .login-page .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
        }

        .login-page .form-input {
          width: 100%;
          height: 48px;
          padding: 0 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #f9fafb;
          transition: all 0.2s ease;
          outline: none;
        }

        .login-page .form-input:focus {
          border-color: #059669;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .login-page .form-input::placeholder {
          color: #9ca3af;
        }

        .password-wrapper {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #6b7280;
        }

        .login-page .submit-btn {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #fff;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
        }

        .login-page .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.35);
        }

        .login-page .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-page .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Tab styles */
        .login-page .tab-bar {
          display: flex;
          background: #f3f4f6;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 2rem;
        }

        .login-page .tab-btn {
          flex: 1;
          height: 40px;
          border: none;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.25s ease;
          color: #6b7280;
          background: transparent;
        }

        .login-page .tab-btn.active {
          background: #fff;
          color: #059669;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .login-page .tab-btn:hover:not(.active) {
          color: #374151;
        }

        /* Select styles */
        .login-page .form-select {
          width: 100%;
          height: 48px;
          padding: 0 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #f9fafb;
          transition: all 0.2s ease;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 5.793a.5.5 0 0 1 .707 0L8 8.586l2.793-2.793a.5.5 0 0 1 .707.707l-3.147 3.147a.5.5 0 0 1-.707 0L4.5 6.5a.5.5 0 0 1 0-.707z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 20px;
          cursor: pointer;
        }

        .login-page .form-select:focus {
          border-color: #059669;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        /* Divider */
        .form-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
          color: #9ca3af;
          font-size: 0.8rem;
        }

        .form-divider::before,
        .form-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        /* Footer */
        .login-footer {
          margin-top: 2rem;
          text-align: center;
        }

        .login-footer p {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .login-footer-icons {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .login-footer-icons span {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }

        .spinner {
          animation: spin-anim 1s linear infinite;
        }

        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ===== LEFT HERO PANEL ===== */}
      <div className="login-hero">
        <div className="floating-element float-1" />
        <div className="floating-element float-2" />
        <div className="floating-element float-3" />

        <div className="hero-content">
          <div className="hero-logo-wrapper">
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
          </div>
          <h1 className="hero-title">PURRFECTCARE</h1>
          <p className="hero-subtitle">
            Streamline your veterinary practice with our all-in-one management platform
          </p>

          <div className="hero-features">
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <ClipboardList size={22} color="#fff" />
              </div>
              <div className="hero-feature-text">
                <h4>Smart Scheduling</h4>
                <p>Manage appointments with ease</p>
              </div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <Stethoscope size={22} color="#fff" />
              </div>
              <div className="hero-feature-text">
                <h4>Patient Records</h4>
                <p>Complete medical history at your fingertips</p>
              </div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">
                <Shield size={22} color="#fff" />
              </div>
              <div className="hero-feature-text">
                <h4>Secure & Reliable</h4>
                <p>Enterprise-grade data protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT FORM PANEL ===== */}
      <div className="login-form-panel">
        <div className="form-container">

          {/* Mobile logo */}
          <div className="mobile-logo">
            <div className="mobile-logo-icon">
              <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
            </div>
            <span className="mobile-logo-title">PURRFECTCARE</span>
          </div>

          {/* Tab bar */}
          <div className="tab-bar">
            <button
              id="login-tab"
              type="button"
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button
              id="signup-tab"
              type="button"
              className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Create Account
            </button>
          </div>

          {/* ===== LOGIN FORM ===== */}
          {activeTab === 'login' && (
            <>
              <div className="form-header">
                <h2>Welcome back</h2>
                <p>Sign in to continue managing your clinic</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email" className="form-label">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password" className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginPassword(e.target.value)}
                      required
                      style={{ paddingRight: '3rem' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ===== SIGNUP FORM ===== */}
          {activeTab === 'signup' && (
            <>
              <div className="form-header">
                <h2>Create account</h2>
                <p>Join PURRFECTCARE and get started</p>
              </div>

              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label htmlFor="signup-name" className="form-label">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    className="form-input"
                    placeholder="Dr. Jane Smith"
                    value={signupName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password" className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min. 6 characters"
                      value={signupPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupPassword(e.target.value)}
                      required
                      style={{ paddingRight: '3rem' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-role" className="form-label">Role</label>
                  <select
                    id="signup-role"
                    className="form-select"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="secretary">Secretary</option>
                  </select>
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Footer */}
          <div className="login-footer">
            <p>Trusted by veterinary professionals worldwide</p>
            <div className="login-footer-icons">
              <span><PawPrint size={16} /></span>
              <span><Heart size={16} /></span>
              <span><Syringe size={16} /></span>
              <span><Stethoscope size={16} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
