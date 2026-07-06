/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Transactions from './pages/Transactions';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Portfolio from './pages/Portfolio';
import Loans from './pages/Loans';
import Settings from './pages/Settings';
import AccountSettings from './pages/settings/AccountSettings';
import SecuritySettings from './pages/settings/SecuritySettings';
import PreferencesSettings from './pages/settings/PreferencesSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import PrivacySettings from './pages/settings/PrivacySettings';
import SupportSettings from './pages/settings/SupportSettings';
import Profile from './pages/Profile';
import Budgets from './pages/Budgets';
import DetectedTransactions from './pages/DetectedTransactions';
import Goals from './pages/Goals';
import More from './pages/More';
import WealthAcademy from './pages/WealthAcademy';
import Onboarding from './pages/Onboarding';
import FinancialReveal from './pages/FinancialReveal';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Disclaimer from './pages/Disclaimer';
import AppPermissions from './pages/AppPermissions';
import { Toaster } from 'sonner';
import { auth } from './firebase';
import { User as UserIcon } from 'lucide-react';
import SMSSyncListener from './components/SMSSyncListener';
import NotificationSimulator from './components/NotificationSimulator';

import ErrorBoundary from './components/ErrorBoundary';
import NotificationListener from './components/NotificationListener';
import AndroidRecoveryManager from './components/AndroidRecoveryManager';
import OfflineBanner from './components/OfflineBanner';
import { mapError } from './lib/errorMapper';

function AppContent() {
  const { loading, error, retryAuth } = useAuth();

  if (error) {
    const friendlyMsg = mapError(error);
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 p-6 select-none">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Session Verification Failed</h2>
          <p className="text-gray-600 mb-8">{friendlyMsg}</p>
          <button
            onClick={retryAuth}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white p-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative animate-pulse">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150"></div>
            <img
              src="/logo.png"
              alt="WealthOS Logo"
              width={80}
              height={80}
              className="relative z-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter">WealthOS</h1>
            <p className="text-indigo-200 text-sm font-medium tracking-wide">Securing your financial future...</p>
          </div>
          <div className="pt-4">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <SMSSyncListener />
      <NotificationListener />
      <AndroidRecoveryManager />
      <Router>
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/insights" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Insights />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/review" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <DetectedTransactions />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Transactions />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/budgets" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Budgets />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/portfolio" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Portfolio />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/loans" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Loans />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/account" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <AccountSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/security" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SecuritySettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/preferences" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <PreferencesSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/notifications" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/privacy" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <PrivacySettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/support" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SupportSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/permissions" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <AppPermissions />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/more" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <More />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/academy" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <WealthAcademy />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/onboarding" 
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial-reveal" 
              element={
                <ProtectedRoute>
                  <FinancialReveal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/goals" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Goals />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/faq" 
              element={
                <Layout>
                  <FAQ />
                </Layout>
              } 
            />
            <Route 
              path="/privacy" 
              element={
                <Layout>
                  <Privacy />
                </Layout>
              } 
            />
            <Route 
              path="/terms" 
              element={
                <Layout>
                  <Terms />
                </Layout>
              } 
            />
            <Route 
              path="/disclaimer" 
              element={
                <Layout>
                  <Disclaimer />
                </Layout>
              } 
            />
            <Route 
              path="/auth/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/auth/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          richColors 
          toastOptions={{
            style: {
              fontFamily: '"Inter", sans-serif',
              borderRadius: '1rem',
              padding: '1rem',
            },
            classNames: {
              toast: 'rounded-2xl border font-sans text-sm shadow-xl',
              success: 'bg-green-50 text-green-900 border-green-200',
              error: 'bg-red-50 text-red-900 border-red-200',
              warning: 'bg-amber-50 text-amber-900 border-amber-200',
              info: 'bg-indigo-50 text-indigo-900 border-indigo-200',
            }
          }}
        />
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
