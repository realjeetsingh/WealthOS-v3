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
import Loans from './pages/Loans';
import Settings from './pages/Settings';
import { auth } from './firebase';
import { User as UserIcon } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, userProfile } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <UserIcon className="h-10 w-10 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {userProfile?.name || 'User'}!</h1>
        <p className="text-gray-600 mb-8">You are successfully logged in with {user?.email}.</p>
        
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-2">Profile Details</h3>
            <div className="space-y-1 text-sm text-indigo-800">
              <p><span className="font-medium">Role:</span> {userProfile?.role}</p>
              <p><span className="font-medium">Joined:</span> {userProfile?.createdAt?.toDate().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
