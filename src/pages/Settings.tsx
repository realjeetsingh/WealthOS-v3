import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  CreditCard, 
  Globe, 
  Lock, 
  Trash2, 
  LogOut, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  Mail, 
  ShieldCheck,
  User as UserIcon,
  Languages,
  Link as LinkIcon,
  LifeBuoy,
  MessageSquare,
  FileText,
  Download,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CURRENCIES } from '../lib/currency';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';

const Settings: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Delete Account State
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword || !currentPassword) return;
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again to change your password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      await deleteUser(user);
      
      toast.success('Account deleted successfully');
      navigate('/auth/signup');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again to delete your account');
      } else {
        toast.error('Failed to delete account. Please try again later.');
      }
    } finally {
      setIsDeleting(false);
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* STEP 1 — PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200 shrink-0">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-500 font-medium mt-1">Manage your account, preferences, and security</p>
          </div>
        </div>

        {/* User Info Preview */}
        <div className="flex items-center space-x-4 bg-white p-3 pr-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center border border-indigo-100">
            {userProfile?.profileImage ? (
              <img src={userProfile.profileImage} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-6 h-6 text-indigo-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{userProfile?.name || 'User'}</p>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              {isPremium ? 'Pro Member' : 'Free Plan'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* SECTION 1 — ACCOUNT */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Section 1 — Account</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {/* Edit Profile */}
            <button 
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group text-left active:scale-[0.99]"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Edit Profile</p>
                  <p className="text-xs text-gray-500">Update your personal information and appearance</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Change Password */}
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group text-left active:scale-[0.99]"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-500">Update your account security credentials</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Subscription Management (Future Ready) */}
            <div className="w-full flex items-center justify-between p-6 opacity-60 grayscale cursor-not-allowed">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Subscription Management</p>
                  <p className="text-xs text-gray-500">Manage your Pro plan and billing (Coming Soon)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optional Future</span>
            </div>
          </div>
        </div>

        {/* SECTION 2 — PREFERENCES */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Section 2 — Preferences</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {/* Currency Selection */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Currency Selection</p>
                  <p className="text-xs text-gray-500">Currently using: <span className="font-bold text-emerald-600">{userProfile?.currency || 'INR'}</span></p>
                </div>
              </div>
              <div className="relative min-w-[160px]">
                <select
                  value={userProfile?.currency || 'INR'}
                  onChange={(e) => updateCurrency(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer pr-10"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} - {c.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Notification Preferences</p>
                  <p className="text-xs text-gray-500">Receive weekly financial summaries and alerts</p>
                </div>
              </div>
              <button 
                onClick={toggleEmailAlerts}
                disabled={isUpdating}
                className={`w-14 h-7 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
                  userProfile?.emailAlerts ? 'bg-indigo-600' : 'bg-gray-200'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                  userProfile?.emailAlerts ? 'translate-x-8' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* Language (Future Ready) */}
            <div className="w-full flex items-center justify-between p-6 opacity-60 grayscale cursor-not-allowed">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Languages className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Language Settings</p>
                  <p className="text-xs text-gray-500">Choose your preferred application language (Coming Soon)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optional Future</span>
            </div>
          </div>
        </div>

        {/* SECTION 3 — SECURITY */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Section 3 — Security</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {/* Security Settings */}
            <div className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group cursor-pointer active:scale-[0.99]">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Security Settings</p>
                  <p className="text-xs text-gray-500">Review your account security logs and activity</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </div>

            {/* Two-Factor Authentication (Placeholder) */}
            <div className="w-full flex items-center justify-between p-6 opacity-60 grayscale cursor-not-allowed">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500">Add an extra layer of security to your account (Coming Soon)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optional Future</span>
            </div>

            {/* Connected Accounts (Future Ready) */}
            <div className="w-full flex items-center justify-between p-6 opacity-60 grayscale cursor-not-allowed">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Connected Accounts</p>
                  <p className="text-xs text-gray-500">Manage third-party app connections (Coming Soon)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optional Future</span>
            </div>
          </div>
        </div>

        {/* SECTION 4 — SESSION */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Section 4 — Session</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-6 hover:bg-red-50 active:bg-red-100 transition-all group text-left active:scale-[0.99]"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Sign Out</p>
                  <p className="text-xs text-gray-500">Securely log out of your WealthOS account</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        {/* SECTION 5 — SUPPORT & LEGAL */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Section 5 — Support & Legal</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {/* Help Center */}
            <a 
              href="#" 
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Help Center</p>
                  <p className="text-xs text-gray-500">Browse guides and tutorials for WealthOS</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
            </a>

            {/* Contact Support */}
            <button className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group text-left active:scale-[0.99]">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Contact Support</p>
                  <p className="text-xs text-gray-500">Get help from our dedicated support team</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Privacy Policy */}
            <button className="w-full flex items-center justify-between p-6 hover:bg-gray-50 active:bg-gray-100 transition-all group text-left active:scale-[0.99]">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Privacy Policy</p>
                  <p className="text-xs text-gray-500">Review how we handle your data and privacy</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Data Export (Future Ready) */}
            <div className="w-full flex items-center justify-between p-6 opacity-60 grayscale cursor-not-allowed">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Export Your Data</p>
                  <p className="text-xs text-gray-500">Download a copy of your financial records (Coming Soon)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optional Future</span>
            </div>
          </div>
        </div>

        {/* STEP 6 — DANGER ZONE */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] ml-2">Danger Zone</h2>
          <div className="bg-red-50/30 rounded-[2rem] shadow-sm border border-red-100 overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-white border border-red-100 shadow-sm">
                <div className="flex items-start space-x-5">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                    <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                      Permanently remove your account and all associated data. This action is <span className="font-bold text-red-600 uppercase">irreversible</span> and all your financial history will be lost.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDeletingAccount(true)}
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 shrink-0 active:scale-95"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-10 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Change Password</h3>
                <p className="text-sm text-gray-500 mt-1">Enhance your account security</p>
              </div>
              <button 
                onClick={() => setIsChangingPassword(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-10 space-y-6 overflow-y-auto flex-1 pb-32 md:pb-10 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPasswordCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordCurrent(!showPasswordCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPasswordCurrent ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPasswordNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordNew(!showPasswordNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPasswordNew ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type={showPasswordConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPasswordConfirm ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPasswordSaving || !newPassword || !currentPassword}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {isPasswordSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeletingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-10 border-b border-gray-100 shrink-0">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <button 
                onClick={() => setIsDeletingAccount(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-10 space-y-4 overflow-y-auto flex-1 pb-32 md:pb-10 custom-scrollbar">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Delete Account?</h3>
                <p className="text-gray-500 leading-relaxed">
                  This action is <span className="font-bold text-red-600 uppercase">permanent</span>. All your financial data, transactions, and settings will be deleted forever. This cannot be undone.
                </p>
              </div>
              
              <div className="flex space-x-4">
              <button 
                onClick={() => setIsDeletingAccount(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                No, Keep it
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-200 disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Settings;
