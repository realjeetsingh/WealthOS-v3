import React, { useState, useEffect, useRef } from 'react';
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
  Briefcase,
  Plus,
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
  Star,
  Camera,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, collection, query, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { 
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateNetWorth,
  calculateSavingsRate,
  calculateCashBalance,
  calculatePortfolioValue,
  calculateTotalLoanRemaining
} from '../lib/financialEngine';
import { Transaction, Asset, Liability, Loan, PortfolioAsset, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/currency';

const Profile: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const [newName, setNewName] = useState(userProfile?.name || '');
  const [newPhone, setNewPhone] = useState(userProfile?.phone || '');
  const [newCurrency, setNewCurrency] = useState(userProfile?.currency || DEFAULT_CURRENCY);
  const [newBio, setNewBio] = useState(userProfile?.bio || '');
  const [newLocation, setNewLocation] = useState(userProfile?.location || '');
  const [newOccupation, setNewOccupation] = useState(userProfile?.occupation || '');
  const [newFinancialGoals, setNewFinancialGoals] = useState<string[]>(userProfile?.financialGoals || []);
  const [newProfileImage, setNewProfileImage] = useState(userProfile?.profileImage || '');
  const [newCoverImage, setNewCoverImage] = useState(userProfile?.coverImage || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Financial Stats State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const transactionsPath = `users/${user.uid}/transactions`;
    const assetsPath = `users/${user.uid}/assets`;
    const liabilitiesPath = `users/${user.uid}/liabilities`;
    const loansPath = `users/${user.uid}/loans`;
    const portfolioPath = `users/${user.uid}/portfolio`;

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

    const unsubPortfolio = onSnapshot(
      query(collection(db, portfolioPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortfolioAsset[];
        setPortfolioAssets(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, portfolioPath)
    );

    return () => {
      unsubTransactions();
      unsubAssets();
      unsubLiabilities();
      unsubLoans();
      unsubPortfolio();
    };
  }, [user?.uid]);

  const monthlyIncome = calculateMonthlyIncome(transactions);
  const monthlyExpenses = calculateMonthlyExpenses(transactions, loans);
  
  const cashBalance = calculateCashBalance(transactions);
  const portfolioValue = calculatePortfolioValue(portfolioAssets);
  const loanBalance = calculateTotalLoanRemaining(loans);
  const netWorth = calculateNetWorth(cashBalance, portfolioValue, loanBalance);
  
  const savingsRate = calculateSavingsRate(monthlyIncome, monthlyExpenses);
  
  const investedTotal = portfolioAssets.reduce((sum, a) => sum + (Number(a.investedAmount) || 0), 0);
  const portfolioGrowth = investedTotal > 0 ? ((portfolioValue - investedTotal) / investedTotal) * 100 : 0;

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
      description: <span className="flex items-center gap-1">Reached <CurrencyDisplay value={5000} /> in assets</span>,
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      unlocked: portfolioValue >= 5000
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
      text: portfolioGrowth > 0 
        ? `Your portfolio has grown by ${portfolioGrowth.toFixed(1)}% since investment.` 
        : "Your portfolio is currently consolidating. Focus on long-term value.",
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
    if (!user || !newName.trim()) {
      toast.error('Name is required');
      return;
    }

    // Basic phone validation if provided
    if (newPhone.trim() && !/^\+?[\d\s-]{10,}$/.test(newPhone.trim())) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: newName.trim(),
        phone: newPhone.trim(),
        currency: newCurrency,
        bio: newBio.trim(),
        location: newLocation.trim(),
        occupation: newOccupation.trim(),
        financialGoals: newFinancialGoals,
        profileImage: newProfileImage,
        coverImage: newCoverImage
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (type === 'profile') setUploading(true);
    else setUploadingCover(true);

    try {
      const fileName = type === 'profile' ? 'profile.jpg' : 'cover.jpg';
      const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { [type === 'profile' ? 'profileImage' : 'coverImage']: downloadURL });
      
      if (type === 'profile') setNewProfileImage(downloadURL);
      else setNewCoverImage(downloadURL);
      
      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} picture updated!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${type} image`);
    } finally {
      if (type === 'profile') setUploading(false);
      else setUploadingCover(false);
    }
  };

  const handleRemovePhoto = async (type: 'profile' | 'cover') => {
    if (!user?.uid) return;
    
    if (type === 'profile') setUploading(true);
    else setUploadingCover(true);

    try {
      // Update Firestore first
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { [type === 'profile' ? 'profileImage' : 'coverImage']: '' });
      
      if (type === 'profile') setNewProfileImage('');
      else setNewCoverImage('');

      // Optionally delete from storage
      try {
        const fileName = type === 'profile' ? 'profile.jpg' : 'cover.jpg';
        const storageRef = ref(storage, `users/${user.uid}/${fileName}`);
        await deleteObject(storageRef);
      } catch (e) {
        // Ignore if file doesn't exist
      }
      
      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} picture removed`);
    } catch (error) {
      console.error("Remove error:", error);
      toast.error(`Failed to remove ${type} image`);
    } finally {
      if (type === 'profile') setUploading(false);
      else setUploadingCover(false);
    }
  };

  const accountActions = [
    { label: 'Security Settings', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/settings' },
    { label: 'Notification Preferences', icon: Bell, color: 'text-purple-600', bgColor: 'bg-purple-50', path: '/settings' },
    { label: 'Privacy Policy', icon: Lock, color: 'text-gray-600', bgColor: 'bg-gray-50', path: '/settings' },
  ];

  const supportLinks = [
    { label: 'Help Center', icon: LifeBuoy, href: '#' },
    { label: 'Contact Support', icon: MessageSquare, href: '#' },
    { label: 'Community Forum', icon: HelpCircle, href: '#' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-4 space-y-8 pb-20 max-w-full overflow-hidden">
      {/* Cover & Profile Header Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-56 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative">
          {userProfile?.coverImage ? (
            <img 
              src={userProfile.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          )}
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
        
        <div className="px-8 pb-8 pt-[60px] relative -mt-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-white rounded-[2rem] p-1 shadow-sm border border-gray-100 relative shrink-0 z-[2] group">
                <div className="w-full h-full bg-indigo-50 rounded-[1.75rem] flex items-center justify-center border border-indigo-100 overflow-hidden relative">
                  {userProfile?.profileImage ? (
                    <img 
                      src={userProfile.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-16 h-16 text-indigo-600" />
                  )}
                  
                  {/* Overlay for Change Photo */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 mb-1" />
                        <span>Change Photo</span>
                      </>
                    )}
                  </button>
                </div>
                {userProfile?.profileImage ? (
                  <button 
                    onClick={() => handleRemovePhoto('profile')}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50 z-[3]"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm z-[3]">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 z-[1]">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{userProfile?.name || 'WealthOS User'}</h1>
                  {isPremium && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 mt-2 md:mt-0 w-fit">
                      Pro
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-gray-500 font-medium text-sm">
                  <p className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {user?.email}
                  </p>
                  {userProfile?.location && (
                    <p className="flex items-center">
                      <Target className="w-4 h-4 mr-2 text-gray-400" />
                      {userProfile.location}
                    </p>
                  )}
                  {userProfile?.occupation && (
                    <p className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                      {userProfile.occupation}
                    </p>
                  )}
                </div>
                {userProfile?.bio && (
                  <p className="mt-4 text-gray-600 text-sm leading-relaxed max-w-2xl">
                    {userProfile.bio}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  setNewName(userProfile?.name || '');
                  setNewPhone(userProfile?.phone || '');
                  setNewCurrency(userProfile?.currency || DEFAULT_CURRENCY);
                  setNewBio(userProfile?.bio || '');
                  setNewLocation(userProfile?.location || '');
                  setNewOccupation(userProfile?.occupation || '');
                  setNewFinancialGoals(userProfile?.financialGoals || []);
                  setNewProfileImage(userProfile?.profileImage || '');
                  setNewCoverImage(userProfile?.coverImage || '');
                  setIsEditing(true);
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 max-w-full overflow-hidden">
        {[
          { 
            label: 'Achievements', 
            value: `${achievements.filter(a => a.unlocked).length}/${achievements.length}`, 
            icon: Trophy, 
            color: 'text-amber-600', 
            bgColor: 'bg-amber-50' 
          },
          { 
            label: 'Progress Metrics', 
            value: `${(savingsRate * 100).toFixed(1)}% Savings`, 
            icon: Target, 
            color: 'text-emerald-600', 
            bgColor: 'bg-emerald-50' 
          },
          { 
            label: 'Wealth Milestone', 
            value: <CurrencyDisplay value={netWorth} />, 
            icon: Crown, 
            color: 'text-indigo-600', 
            bgColor: 'bg-indigo-50' 
          },
          { 
            label: 'Portfolio Growth', 
            value: portfolioGrowth >= 0 ? `+${portfolioGrowth.toFixed(1)}%` : `${portfolioGrowth.toFixed(1)}%`, 
            icon: TrendingUp, 
            color: portfolioGrowth >= 0 ? 'text-green-600' : 'text-red-600', 
            bgColor: portfolioGrowth >= 0 ? 'bg-green-50' : 'bg-red-50' 
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-5 group hover:shadow-md transition-all">
            <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements & Insights Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 max-w-full overflow-hidden">
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

        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-10 max-w-full overflow-hidden">
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

      {/* Financial Goals Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Goals</h2>
            <p className="text-sm text-gray-500 mt-1">What you're working towards</p>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
            <Target className="w-7 h-7" />
          </div>
        </div>

        {userProfile?.financialGoals && userProfile.financialGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProfile.financialGoals.map((goal, index) => (
              <div 
                key={index}
                className="p-6 rounded-3xl bg-gray-50 border border-gray-100 flex items-center space-x-4 group hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Check className="w-6 h-6" />
                </div>
                <span className="font-bold text-gray-900 tracking-tight">{goal}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Target className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No goals set yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
              Define your financial targets to stay motivated and track your progress.
            </p>
            <button 
              onClick={() => {
                setNewName(userProfile?.name || '');
                setNewPhone(userProfile?.phone || '');
                setNewCurrency(userProfile?.currency || DEFAULT_CURRENCY);
                setNewBio(userProfile?.bio || '');
                setNewLocation(userProfile?.location || '');
                setNewOccupation(userProfile?.occupation || '');
                setNewFinancialGoals(userProfile?.financialGoals || []);
                setNewProfileImage(userProfile?.profileImage || '');
                setNewCoverImage(userProfile?.coverImage || '');
                setIsEditing(true);
              }}
              className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
            >
              Set Your First Goal
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Account Actions Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 max-w-full overflow-hidden">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">System Settings</h2>
            <div className="space-y-3">
              {accountActions.map((action) => (
                <button 
                  key={action.label}
                  onClick={() => navigate(action.path)}
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
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 max-w-full overflow-hidden">
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

      {/* Hidden File Inputs */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, 'profile')}
        accept="image/*"
        className="hidden"
      />
      <input 
        type="file"
        ref={coverFileInputRef}
        onChange={(e) => handleFileChange(e, 'cover')}
        accept="image/*"
        className="hidden"
      />

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl animate-in fade-in zoom-in duration-300 my-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Profile</h3>
                <p className="text-sm text-gray-500 mt-1">Update your personal information and appearance</p>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              {/* Cover & Profile Image Control */}
              <div className="space-y-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Profile Appearance</label>
                
                <div className="relative">
                  {/* Cover Image Preview */}
                  <div className="h-40 w-full bg-gray-100 rounded-3xl overflow-hidden relative group">
                    {newCoverImage ? (
                      <img src={newCoverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                        <ImageIcon className="w-8 h-8 text-indigo-200" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => coverFileInputRef.current?.click()}
                          className="px-4 py-2 bg-white text-gray-900 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center"
                        >
                          <Camera className="w-3 h-3 mr-2" />
                          Change Cover
                        </button>
                        {newCoverImage && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto('cover')}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {uploadingCover && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Profile Image Preview */}
                  <div className="absolute -bottom-6 left-8">
                    <div className="w-24 h-24 bg-white rounded-[2rem] p-1 shadow-lg relative group">
                      <div className="w-full h-full bg-indigo-50 rounded-[1.75rem] flex items-center justify-center border border-indigo-100 overflow-hidden relative">
                        {newProfileImage ? (
                          <img src={newProfileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-indigo-600" />
                        )}
                        
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Camera className="w-5 h-5 text-white" />
                        </button>
                      </div>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-[1.75rem]">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-6" /> {/* Spacer for profile image overlap */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 border border-gray-100 rounded-2xl text-gray-400 font-bold cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Bio</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <textarea 
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900 min-h-[100px] resize-none"
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Location</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="e.g. Mumbai, India"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Occupation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={newOccupation}
                      onChange={(e) => setNewOccupation(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="e.g. Software Engineer"
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

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Financial Goals</label>
                  <div className="flex space-x-2 mb-4">
                    <div className="relative flex-1">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        id="goalInput"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                        placeholder="Add a new goal (e.g. Buy a house)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            if (input.value.trim()) {
                              setNewFinancialGoals([...newFinancialGoals, input.value.trim()]);
                              input.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('goalInput') as HTMLInputElement;
                        if (input.value.trim()) {
                          setNewFinancialGoals([...newFinancialGoals, input.value.trim()]);
                          input.value = '';
                        }
                      }}
                      className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newFinancialGoals.map((goal, index) => (
                      <div 
                        key={index}
                        className="flex items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 group"
                      >
                        <span className="font-bold text-sm">{goal}</span>
                        <button
                          type="button"
                          onClick={() => setNewFinancialGoals(newFinancialGoals.filter((_, i) => i !== index))}
                          className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Preferred Currency</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900 appearance-none cursor-pointer"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} - {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
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
    </div>
  );
};

export default Profile;
