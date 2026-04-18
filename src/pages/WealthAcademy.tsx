import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Play, 
  BookOpen, 
  TrendingUp, 
  PieChart, 
  Wallet, 
  ShieldCheck,
  Search,
  ChevronRight,
  Clock,
  Star,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import PricingModal from '../components/PricingModal';
import { handleUpgrade } from '../lib/paymentService';
import { Transaction, Loan } from '../types';
import { calculateMonthlyIncome, calculateMonthlyExpenses } from '../lib/financialEngine';

const CATEGORIES = [
  { id: 'basics', label: 'Basics', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'investing', label: 'Investing', icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { id: 'budgeting', label: 'Budgeting', icon: PieChart, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'debt', label: 'Loans & Debt', icon: Wallet, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { id: 'advanced', label: 'Advanced', icon: ShieldCheck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  actionLabel: string;
  actionPath: string;
  isPremium: boolean;
  videoUrl?: string;
}

const LESSONS: Lesson[] = [
  {
    id: '1',
    title: 'Financial Freedom 101',
    description: 'Understand the core principles of building wealth and achieving financial independence.',
    category: 'basics',
    duration: '5 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance1/800/450',
    actionLabel: 'Set a Goal',
    actionPath: '/goals',
    isPremium: false
  },
  {
    id: '2',
    title: 'The Power of Compounding',
    description: 'Learn why starting early is the single most important factor in long-term investing.',
    category: 'basics',
    duration: '8 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance2/800/450',
    actionLabel: 'View Portfolio',
    actionPath: '/portfolio',
    isPremium: false
  },
  {
    id: '3',
    title: 'Stock Market Essentials',
    description: 'A complete guide to how the stock market works and how to pick your first shares.',
    category: 'investing',
    duration: '12 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance3/800/450',
    actionLabel: 'Invest Now',
    actionPath: '/portfolio',
    isPremium: true
  },
  {
    id: '4',
    title: '50/30/20 Budgeting Rule',
    description: 'Master the simplest and most effective budgeting framework for everyday life.',
    category: 'budgeting',
    duration: '6 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance4/800/450',
    actionLabel: 'Create Budget',
    actionPath: '/budgets',
    isPremium: true
  },
  {
    id: '5',
    title: 'Good Debt vs Bad Debt',
    description: 'Not all debt is equal. Learn how to leverage low-interest loans to build wealth.',
    category: 'debt',
    duration: '10 min',
    level: 'Intermediate',
    thumbnail: 'https://picsum.photos/seed/finance5/800/450',
    actionLabel: 'Manage Loans',
    actionPath: '/loans',
    isPremium: true
  },
  {
    id: '6',
    title: 'Options Trading Basics',
    description: 'An introduction to derivatives and how to use them for hedging or speculation.',
    category: 'advanced',
    duration: '15 min',
    level: 'Advanced',
    thumbnail: 'https://picsum.photos/seed/finance6/800/450',
    actionLabel: 'Advanced Tools',
    actionPath: '/portfolio',
    isPremium: true
  }
];

const WealthAcademy: React.FC = () => {
  const { user, userProfile, isPremium: isProUser } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const openPaymentGateway = () => {
    handleUpgrade(user?.uid || '', user?.email || '', userProfile?.name || '');
  };

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        const tSnap = await getDocs(query(collection(db, `users/${user.uid}/transactions`)));
        const lSnap = await getDocs(query(collection(db, `users/${user.uid}/loans`)));
        
        setTransactions(tSnap.docs.map(d => d.data() as Transaction));
        setLoans(lSnap.docs.map(d => d.data() as Loan));
      } catch (err) {
        console.error("Error fetching academy data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const recommendations = useMemo(() => {
    if (loadingData) return [];

    const income = calculateMonthlyIncome(transactions);
    const expenses = calculateMonthlyExpenses(transactions, loans);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const hasActiveLoans = loans.some(l => l.status === 'active');

    const recommended: Lesson[] = [];

    // Logic for overspending
    if (expenses > income * 0.8) {
      const budgetingLesson = LESSONS.find(l => l.category === 'budgeting');
      if (budgetingLesson) recommended.push(budgetingLesson);
    }

    // Logic for loans
    if (hasActiveLoans) {
      const debtLesson = LESSONS.find(l => l.category === 'debt');
      if (debtLesson) recommended.push(debtLesson);
    }

    // Logic for low savings
    if (savingsRate < 20) {
      const basicsLesson = LESSONS.find(l => l.id === '2'); // Compounding
      if (basicsLesson) recommended.push(basicsLesson);
    }

    // Default if no specific triggers
    if (recommended.length === 0) {
      recommended.push(LESSONS[0]); // Financial Freedom 101
    }

    return recommended;
  }, [transactions, loans, loadingData]);

  const handleStartLesson = async (lesson: Lesson) => {
    if (!user?.uid) return;

    if (lesson.isPremium && !isProUser) {
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        viewedLessons: arrayUnion(lesson.id),
        lastAcademyTopic: lesson.category
      });
      // In a real app, this would open a video player or lesson page
      // For now, we'll just navigate to the action path to show "Apply Now"
      navigate(lesson.actionPath);
    } catch (err) {
      console.error("Error tracking lesson:", err);
    }
  };

  const filteredLessons = LESSONS.filter(lesson => {
    const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6B66FE]/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Wealth Academy</h1>
            <p className="text-gray-500 font-medium">Master your money with expert-led lessons</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isProUser && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUpgradeModalOpen(true)}
              className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2.5 rounded-full text-xs font-black shadow-xl shadow-orange-500/20 relative overflow-hidden group"
            >
              <motion.div 
                animate={{ rotate: [0, 15, -15, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="w-4 h-4 fill-white" />
              </motion.div>
              <span>👑 Get Pro</span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            </motion.button>
          )}

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6334FD] transition-colors" />
            <input 
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#6334FD]/5 focus:border-[#6334FD]/20 transition-all outline-none font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {/* RECOMMENDED SECTION */}
      {!loadingData && recommendations.length > 0 && searchQuery === '' && selectedCategory === 'all' && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6334FD] fill-[#6334FD]" />
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recommended for You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((lesson) => (
              <motion.div
                key={`rec-${lesson.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gray-100 rounded-[2rem] p-6 flex flex-col md:flex-row gap-6 items-center shadow-xl shadow-black/5 hover:shadow-indigo-500/5 transition-all"
              >
                <div className="w-full md:w-40 aspect-video rounded-2xl overflow-hidden shrink-0 relative">
                  <img src={lesson.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black text-[#6334FD] uppercase tracking-widest mb-1 block">Recommended for You</span>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{lesson.title}</h3>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">{lesson.description}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button 
                      onClick={() => handleStartLesson(lesson)}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95"
                    >
                      Start Lesson
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.98] duration-150 ${
            selectedCategory === 'all' 
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
              : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
          }`}
        >
          All Lessons
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.98] duration-150 ${
              selectedCategory === cat.id 
                ? 'bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white shadow-lg shadow-indigo-100' 
                : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* LESSONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredLessons.map((lesson, idx) => {
            const isViewed = userProfile?.viewedLessons?.includes(lesson.id);
            const isLocked = lesson.isPremium && !isProUser;

            return (
              <motion.div
                layout
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full relative ${isLocked ? 'cursor-pointer' : ''}`}
                onClick={() => isLocked && setIsUpgradeModalOpen(true)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={lesson.thumbnail} 
                    alt={lesson.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isLocked ? 'grayscale opacity-60' : ''}`}
                  />
                  
                  {isLocked ? (
                    <div className="absolute inset-0 bg-[#6334FD]/10 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-xl">
                        <Lock className="w-6 h-6 text-[#6334FD]" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartLesson(lesson);
                        }}
                        className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-300"
                      >
                        <Play className="w-6 h-6 text-[#6334FD] fill-[#6334FD] ml-1" />
                      </button>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900">
                      {lesson.level}
                    </span>
                    {isViewed && (
                      <span className="px-3 py-1 bg-green-500/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {lesson.isPremium && (
                      <span className="px-3 py-1 bg-[#6334FD] text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-[#6334FD]/20">
                        <Crown className="w-3 h-3" />
                        Pro
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lesson.duration}</span>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#6334FD] transition-colors line-clamp-1">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-6">
                    {lesson.description}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-50">
                    {isLocked ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUpgradeModalOpen(true);
                        }}
                        className="w-full py-3 bg-white border-2 border-[#6334FD] text-[#6334FD] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6334FD] hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3 h-3" />
                        Unlock with Pro
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartLesson(lesson);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      >
                        Start Lesson
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <PricingModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {filteredLessons.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No lessons found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or category filters.</p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* UPGRADE SECTION */}
      <div className="bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <Star className="w-3 h-3 fill-white" />
            Personalized Learning
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
            Learn based on your <br /> spending habits.
          </h2>
          <p className="text-indigo-50 font-medium mb-8 leading-relaxed">
            Our AI analyzes your transactions to recommend lessons that will help you save more and invest smarter. Upgrade to Pro for a tailored curriculum.
          </p>
          <Button 
            className="bg-white text-[#6334FD] hover:bg-gray-50 border-none px-10"
            icon={<TrendingUp className="w-5 h-5" />}
            onClick={() => isProUser ? navigate('/portfolio') : setIsUpgradeModalOpen(true)}
          >
            {isProUser ? 'View Personal Portfolio' : 'Get Personalized Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WealthAcademy;

