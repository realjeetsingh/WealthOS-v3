import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Eye,
  EyeOff,
  User as UserIcon, 
  Mail, 
  Calendar, 
  HelpCircle, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Trophy,
  X,
  Check,
  Phone,
  Lock,
  LogOut,
  Trash2,
  MessageSquare,
  LifeBuoy,
  TrendingUp,
  TrendingDown,
  Wallet,
  Crown,
  Settings,
  Bell,
  Shield,
  Award,
  Zap,
  Target,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, collection, query, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { formatCurrency } from '../lib/formatCurrency';
import { 
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateNetWorth,
  calculateSavingsRate
} from '../lib/financialEngine';
import { Transaction, Asset, Liability, Loan } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const Profile: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const [newName, setNewName] = useState(userProfile?.name || '');
  const [newPhone, setNewPhone] = useState(userProfile?.phone || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password Visibility States
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Financial Stats State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const transactionsPath = `users/${user.uid}/transactions`;
    const assetsPath = `users/${user.uid}/assets`;
    const liabilitiesPath = `users/${user.uid}/liabilities`;
    const loansPath = `users/${user.uid}/loans`;

    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    const unsubAssets = onSnapshot(
      query(collection(db, assetsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
        setAssets(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, assetsPath)
    );

    const unsubLiabilities = onSnapshot(
      query(collection(db, liabilitiesPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Liability[];
        setLiabilities(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, liabilitiesPath)
    );

    const unsubLoans = onSnapshot(
      query(collection(db, loansPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Loan[];
        setLoans(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, loansPath)
    );

    return () => {
      unsubTransactions();
      unsubAssets();
      unsubLiabilities();
      unsubLoans();
    };
  }, [user?.uid]);

  const monthlyIncome = calculateMonthlyIncome(transactions);
  const monthlyExpenses = calculateMonthlyExpenses(transactions, loans);
  const netWorth = calculateNetWorth(assets, liabilities);
  const savingsRate = calculateSavingsRate(monthlyIncome, monthlyExpenses);

  // Achievement Logic
  const achievements = [
    {
      id: 'transactor',
      title: 'Active Transactor',
      description: `Logged ${transactions.length} transactions`,
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      unlocked: transactions.length >= 10
    },
    {
      id: 'saver',
      title: 'Savings Milestone',
      description: 'Reached $5,000 in assets',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      unlocked: assets.reduce((sum, a) => sum + a.value, 0) >= 5000
    },
    {
      id: 'debt_free',
      title: 'Debt Crusher',
      description: 'Completed a loan repayment',
      icon: Award,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      unlocked: loans.some(l => l.status === 'completed')
    },
    {
      id: 'cashflow',
      title: 'Cashflow King',
      description: 'Positive monthly cashflow',
      icon: Star,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      unlocked: monthlyIncome > monthlyExpenses
    }
  ];

  const insights = [
    {
      text: monthlyIncome > monthlyExpenses 
        ? "You're maintaining a strong positive cashflow this month." 
        : "Your expenses are currently outpacing your income.",
      premium: false
    },
    {
      text: savingsRate > 0.2 
        ? "Your savings rate is above average (20%+). Keep it up!" 
        : "Aiming for a 20% savings rate is a great next goal.",
      premium: false
    },
    {
      text: netWorth > 10000 
        ? "Your net worth is in the top 20% of users in your bracket." 
        : "Building your emergency fund should be your next priority.",
      premium: true
    },
    {
      text: loans.length === 0 
        ? "You are currently debt-free! Great job." 
        : `You have ${loans.length} active loans to manage.`,
      premium: true
    }
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: newName.trim(),
        phone: newPhone.trim()
      });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
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
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
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
      // In a real app, we'd delete all user data first
      // For this demo, we'll just delete the user document and auth account
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

  const accountActions = [
    { label: 'Security Settings', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Notification Preferences', icon: Bell, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Privacy Policy', icon: Lock, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  ];

  const supportLinks = [
    { label: 'Help Center', icon: LifeBuoy, href: '#' },
    { label: 'Contact Support', icon: MessageSquare, href: '#' },
    { label: 'Community Forum', icon: HelpCircle, href: '#' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Cover & Profile Header Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-56 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute top-6 right-6">
            {isPremium ? (
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-white font-bold text-xs">
                <Crown className="w-4 h-4 text-amber-300" />
                <span>PREMIUM MEMBER</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white font-bold text-xs">
                <span>FREE PLAN</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-8 pb-10 relative">
          <div className="flex flex-col md:flex-row md:items-end md:space-x-8 -mt-16 mb-8">
            <div className="w-40 h-40 bg-white rounded-[2.5rem] p-1.5 shadow-2xl relative z-10 mx-auto md:mx-0">
              <div className="w-full h-full bg-indigo-50 rounded-[2rem] flex items-center justify-center border border-indigo-100 overflow-hidden">
                <UserIcon className="w-20 h-20 text-indigo-600" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{userProfile?.name || 'WealthOS User'}</h1>
                {isPremium && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 mt-2 md:mt-0 w-fit mx-auto md:mx-0">
                    Pro
                  </span>
                )}
              </div>
              <p className="text-gray-500 font-medium flex items-center justify-center md:justify-start">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                {user?.email}
              </p>
            </div>
            
            <div className="mt-8 md:mt-0 flex space-x-3 justify-center">
              <button 
                onClick={() => {
                  setNewName(userProfile?.name || '');
                  setNewPhone(userProfile?.phone || '');
                  setIsEditing(true);
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Monthly Income', value: monthlyIncome, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
          { label: 'Monthly Expenses', value: monthlyExpenses, icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50' },
          { label: 'Current Net Worth', value: netWorth, icon: Wallet, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-5 group hover:shadow-md transition-all">
            <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(stat.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements & Insights Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Achievements & Progress</h2>
            <p className="text-sm text-gray-500 mt-1">Your financial journey milestones</p>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <Trophy className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-900">
              {achievements.filter(a => a.unlocked).length}/{achievements.length} Unlocked
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {achievements.map((achievement) => (
            <div 
              key={achievement.id} 
              className={`p-6 rounded-3xl border transition-all ${
                achievement.unlocked 
                  ? 'bg-white border-gray-100 shadow-sm hover:shadow-md' 
                  : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${achievement.bgColor} ${achievement.color}`}>
                <achievement.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{achievement.description}</p>
              {!achievement.unlocked && (
                <div className="mt-3 flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100/50">
          <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-indigo-600" />
            Smart Insights
          </h3>
          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start space-x-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <div className="flex-1">
                  {insight.premium && !isPremium ? (
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-400 italic blur-[2px] select-none">
                        This advanced insight is reserved for premium members.
                      </p>
                      <span className="flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-indigo-800 font-medium leading-relaxed">
                      {insight.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Details Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Details</h2>
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                <p className="text-lg font-bold text-gray-900">{userProfile?.name || 'Not set'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                <p className="text-lg font-bold text-gray-900">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                <p className="text-lg font-bold text-gray-900">{userProfile?.phone || 'Not provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Member Since</p>
                <p className="text-lg font-bold text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                  {userProfile?.createdAt?.toDate().toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Account Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center justify-between p-6 rounded-3xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                    <Lock className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Change Password</p>
                    <p className="text-xs text-gray-500">Update your security</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center justify-between p-6 rounded-3xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                    <LogOut className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Sign Out</p>
                    <p className="text-xs text-gray-500">End your current session</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
              </button>

              <button 
                onClick={() => setIsDeletingAccount(true)}
                className="flex items-center justify-between p-6 rounded-3xl border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Delete Account</p>
                    <p className="text-xs text-gray-500">Permanently remove data</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400" />
              </button>
            </div>

            <div className="mt-8 space-y-3">
              {accountActions.map((action) => (
                <button 
                  key={action.label}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 ${action.bgColor} ${action.color} rounded-xl flex items-center justify-center`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700 group-hover:text-gray-900">{action.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Support & Info */}
        <div className="space-y-8">
          {/* Help & Support Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <LifeBuoy className="w-5 h-5 mr-2 text-indigo-600" />
              Help & Support
            </h2>
            <div className="space-y-2">
              {supportLinks.map((link) => (
                <a 
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-indigo-50 transition-all group border border-transparent hover:border-indigo-100"
                >
                  <div className="flex items-center space-x-3">
                    <link.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-900 transition-colors">{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </a>
              ))}
            </div>
            
            <button className="w-full mt-6 py-4 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all flex items-center justify-center">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Knowledge Base
            </button>
          </div>

          {/* Premium Upsell (if not premium) */}
          {!isPremium && (
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Upgrade to Pro</h3>
                <p className="text-indigo-200 text-sm leading-relaxed mb-8">
                  Unlock advanced financial insights, unlimited accounts, and priority support.
                </p>
                <button className="w-full py-4 bg-amber-400 text-amber-950 rounded-2xl text-sm font-bold hover:bg-amber-300 transition-all shadow-lg shadow-amber-900/20">
                  Get Pro Access
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-30"></div>
            </div>
          )}

          {/* App Version Info */}
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">WealthOS v2.4.0</p>
            <p className="text-[10px] text-gray-300">© 2026 WealthOS Inc. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Profile</h3>
                <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="Enter your name"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Email address cannot be changed directly. Please contact support if you need to update your login email.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || !newName.trim()}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
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
            
            <form onSubmit={handleChangePassword} className="space-y-6">
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
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
            
            <div className="space-y-4 mb-10">
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
      )}
    </div>
  );
};

export default Profile;
