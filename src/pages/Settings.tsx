import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
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
  LifeBuoy,
  MessageSquare,
  FileText,
  Download,
  AlertTriangle,
  Phone,
  Moon,
  Database,
  RefreshCw,
  Camera
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CURRENCIES } from '../lib/currency';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import Button from '../components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';

const Settings: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Account State
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [currency, setCurrency] = useState(userProfile?.currency || 'INR');

  // Notification State
  const [expenseAlerts, setExpenseAlerts] = useState(userProfile?.emailAlerts ?? true);
  const [budgetAlerts, setBudgetAlerts] = useState(userProfile?.budgetAlerts ?? true);

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

  // Reset Data State
  const [isResettingData, setIsResettingData] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Contact Support State
  const [isContactingSupport, setIsContactingSupport] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setPhone(userProfile.phone || '');
      setCurrency(userProfile.currency || 'INR');
      setExpenseAlerts(userProfile.emailAlerts ?? true);
      setBudgetAlerts(userProfile.budgetAlerts ?? true);
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        phone,
        currency,
        emailAlerts: expenseAlerts,
        budgetAlerts: budgetAlerts
      });
      toast.success('Account settings saved successfully');
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Failed to save settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      
      // Collections to clear
      const collectionsToClear = ['transactions', 'budgets', 'loans', 'assets', 'liabilities', 'goals', 'portfolio', 'netWorthSnapshots'];
      
      for (const collName of collectionsToClear) {
        const collRef = collection(db, 'users', user.uid, collName);
        const snapshot = await getDocs(collRef);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      toast.success('All financial data has been reset');
      setIsResettingData(false);
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error('Failed to reset data');
    } finally {
      setIsResetting(false);
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

  const Card = ({ title, children, icon: Icon, description }: { title: string, children: React.ReactNode, icon?: any, description?: string }) => (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-8 space-y-6">
        {children}
      </div>
    </div>
  );

  const Toggle = ({ label, description, enabled, onChange, disabled = false }: { label: string, description?: string, enabled: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <div className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50 grayscale' : ''}`}>
      <div className="space-y-0.5">
        <p className="font-bold text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button 
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-[#4F46E5]' : 'bg-gray-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}></div>
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* HEADER */}
      <div className="flex items-center space-x-5">
        <div className="w-14 h-14 bg-[#4F46E5] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <SettingsIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 font-medium">System control center & preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* SECTION 1 — ACCOUNT */}
        <Card title="Account" icon={UserIcon} description="Manage your personal information">
          <div className="flex flex-col md:flex-row items-center gap-8 pb-4">
            <div className="relative group">
              <div className="w-24 h-24 bg-gray-100 rounded-[2rem] overflow-hidden border-4 border-white shadow-md">
                {userProfile?.profileImage ? (
                  <img src={userProfile.profileImage} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                    <UserIcon className="w-10 h-10" />
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    placeholder="Your Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl outline-none font-bold text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Default Currency</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
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
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSaveChanges} 
              loading={isUpdating}
              icon={<Check className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </Card>

        {/* SECTION 2 — SECURITY */}
        <Card title="Security" icon={ShieldCheck} description="Manage your account protection">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Account Password</p>
                  <p className="text-xs text-gray-500">Last changed: {userProfile?.createdAt ? new Date(userProfile.createdAt.toMillis()).toLocaleDateString() : 'Recently'}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsChangingPassword(true)}>
                Change Password
              </Button>
            </div>
            
            <Toggle 
              label="Two-factor authentication" 
              description="Add an extra layer of security to your account"
              enabled={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </Card>

        {/* SECTION 3 — PREFERENCES */}
        <Card title="App Preferences" icon={Globe} description="Customize your application experience">
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900">Currency</p>
                <p className="text-xs text-gray-500">Global display currency for all modules</p>
              </div>
              <div className="relative min-w-[140px]">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer pr-10"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 opacity-50 grayscale cursor-not-allowed">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900">Language</p>
                <p className="text-xs text-gray-500">Choose your preferred language</p>
              </div>
              <div className="flex items-center space-x-2 text-sm font-bold text-gray-500">
                <Languages className="w-4 h-4" />
                <span>English (US)</span>
              </div>
            </div>

            <Toggle 
              label="Dark Mode" 
              description="Switch between light and dark themes"
              enabled={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </Card>

        {/* SECTION 4 — NOTIFICATIONS */}
        <Card title="Notifications" icon={Bell} description="Control how you receive alerts">
          <div className="space-y-6">
            <Toggle 
              label="Expense alerts" 
              description="Get notified when you record a large expense"
              enabled={expenseAlerts}
              onChange={setExpenseAlerts}
            />
            <Toggle 
              label="Budget alerts" 
              description="Receive warnings when you approach budget limits"
              enabled={budgetAlerts}
              onChange={setBudgetAlerts}
            />
            <Toggle 
              label="Investment alerts" 
              description="Real-time updates on your portfolio performance"
              enabled={false}
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </Card>

        {/* SECTION 5 — DATA MANAGEMENT */}
        <Card title="Data & Privacy" icon={Database} description="Manage your financial records and privacy">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Export Data</p>
                  <p className="text-xs text-gray-500">Download all your records in CSV format</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50/30 rounded-2xl border border-red-100">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Reset Data</p>
                  <p className="text-xs text-gray-500">Clear all transactions and financial history</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setIsResettingData(true)}>
                Reset Now
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50/30 rounded-2xl border border-red-100">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Delete Account</p>
                  <p className="text-xs text-gray-500">Permanently remove your account and data</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setIsDeletingAccount(true)}>
                Delete Account
              </Button>
            </div>
          </div>
        </Card>

        {/* SECTION 6 — HELP & SUPPORT */}
        <Card title="Help & Support" icon={LifeBuoy} description="Get assistance and review policies">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setIsContactingSupport(true)}
              className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group text-center"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900">Contact Support</p>
              <p className="text-xs text-gray-500 mt-1">Talk to our team</p>
            </button>

            <button className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group text-center">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900">FAQs</p>
              <p className="text-xs text-gray-500 mt-1">Common questions</p>
            </button>

            <button className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group text-center">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900">Privacy Policy</p>
              <p className="text-xs text-gray-500 mt-1">Data protection</p>
            </button>
          </div>
        </Card>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Change Password Modal */}
        {isChangingPassword && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-8 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Change Password</h3>
                  <p className="text-sm text-gray-500 mt-1">Enhance your account security</p>
                </div>
                <button onClick={() => setIsChangingPassword(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
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
                  <Button variant="secondary" fullWidth onClick={() => setIsChangingPassword(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth loading={isPasswordSaving} icon={<Check className="w-4 h-4" />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Reset Data Modal */}
        {isResettingData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Reset Financial Data?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                This will permanently delete all your transactions, budgets, and financial records. Your account settings will remain intact.
              </p>
              <div className="flex flex-col space-y-3">
                <Button variant="danger" fullWidth size="lg" onClick={handleResetData} loading={isResetting}>
                  Yes, Reset Everything
                </Button>
                <Button variant="secondary" fullWidth size="lg" onClick={() => setIsResettingData(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Account Modal */}
        {isDeletingAccount && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Account?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                This action is <span className="font-bold text-red-600 uppercase">irreversible</span>. All your data will be permanently removed from our servers.
              </p>
              <div className="flex flex-col space-y-3">
                <Button variant="danger" fullWidth size="lg" onClick={handleDeleteAccount} loading={isDeleting}>
                  Delete Permanently
                </Button>
                <Button variant="secondary" fullWidth size="lg" onClick={() => setIsDeletingAccount(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Contact Support Modal */}
        {isContactingSupport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 text-center"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Contact Support</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Our support team is available 24/7 to help you with any issues. You can reach us at <span className="font-bold text-indigo-600">support@wealthos.app</span>
              </p>
              <div className="flex flex-col space-y-3">
                <Button fullWidth size="lg" onClick={() => window.location.href = 'mailto:support@wealthos.app'}>
                  Send Email
                </Button>
                <Button variant="secondary" fullWidth size="lg" onClick={() => setIsContactingSupport(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
