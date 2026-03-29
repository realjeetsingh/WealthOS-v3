import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Shield, Bell, CreditCard, Globe } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENCIES } from '../lib/currency';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCurrency = async (currency: string) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currency: currency
      });
      toast.success(`Currency updated to ${currency}`);
    } catch (error) {
      console.error("Error updating currency:", error);
      toast.error("Failed to update currency");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleEmailAlerts = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailAlerts: !userProfile?.emailAlerts
      });
    } catch (error) {
      console.error("Error updating settings:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
              <p className="text-gray-900 font-medium">{userProfile?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account Type</label>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${isPremium ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isPremium ? 'Premium' : 'Free'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Email Alerts</p>
                <p className="text-xs text-gray-500">Receive weekly financial summaries</p>
              </div>
              <button 
                onClick={toggleEmailAlerts}
                disabled={isUpdating}
                className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
                  userProfile?.emailAlerts ? 'bg-indigo-600' : 'bg-gray-200'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                  userProfile?.emailAlerts ? 'translate-x-7' : 'translate-x-1'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Display Currency</label>
              <select
                value={userProfile?.currency || 'INR'}
                onChange={(e) => updateCurrency(e.target.value)}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium disabled:opacity-50"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} - {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 mt-2">All financial values will be converted and displayed in this currency.</p>
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Billing & Subscription</h2>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-600 mb-4">
              {isPremium 
                ? "Your premium subscription is active. Thank you for your support!" 
                : "Upgrade to Premium to unlock advanced insights and loan intelligence."}
            </p>
            {!isPremium && (
              <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
