/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import Goals from './pages/Goals';
import More from './pages/More';
import WealthAcademy from './pages/WealthAcademy';
import Onboarding from './pages/Onboarding';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import { Toaster } from 'sonner';
import { auth } from './firebase';
import { User as UserIcon } from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
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
              <ProtectedRoute>
                <Layout>
                  <FAQ />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/privacy" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Privacy />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
