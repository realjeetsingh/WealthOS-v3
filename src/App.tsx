/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Transactions from './pages/Transactions';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import { auth } from './firebase';
import { LogOut, User as UserIcon, ReceiptText, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <UserIcon className="h-10 w-10 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {userProfile?.name || 'User'}!</h1>
        <p className="text-gray-600 mb-8">You are successfully logged in with {user?.email}.</p>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Financial Dashboard</span>
          </Link>

          <Link
            to="/insights"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-indigo-100 text-sm font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Financial Insights</span>
          </Link>

          <Link
            to="/transactions"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-gray-200 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <ReceiptText className="h-4 w-4" />
            <span>Manage Transactions</span>
          </Link>

          <div className="bg-indigo-50 rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-2">Profile Details</h3>
            <div className="space-y-1 text-sm text-indigo-800">
              <p><span className="font-medium">Role:</span> {userProfile?.role}</p>
              <p><span className="font-medium">Joined:</span> {userProfile?.createdAt?.toDate().toLocaleDateString()}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
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
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/insights" 
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedRoute>
                <Transactions />
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
