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
  Crown,
  Zap,
  Award,
  FileText,
  Check,
  Volume2,
  RotateCcw,
  Download,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import PricingModal from '../components/PricingModal';
import { paymentService } from '../lib/paymentService';
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

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

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
  contentType: 'video' | 'pdf';
  videoUrl?: string;
  detailedContent: string;
  quiz: QuizQuestion[];
}

const LESSONS: Lesson[] = [
  {
    id: '1',
    title: 'Financial Freedom 101',
    description: 'Understand the core principles of building wealth and achieving financial independence.',
    category: 'basics',
    duration: '5 min',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'Set a Goal',
    actionPath: '/goals',
    isPremium: false,
    contentType: 'video',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    detailedContent: `### Module 1: The Foundation of Financial Independence

Financial freedom is not about being rich; it is about having control over your time. In this introductory lesson, we examine the three pillars of wealth creation:

1. **Passive Cashflow Creation**: Building assets that yield returns without direct ongoing labor.
2. **Defensive Asset Protection**: Establishing an emergency cushion of 6 months of expenses to avoid selling long-term investments under stress.
3. **Compound Efficiency**: Reinvesting proceeds into cash-flowing assets to snowball growth.

#### Key Takeaway
Wealth is what you keep, not what you spend. By lowering high-interest liabilities and consistently diverting 20%+ of your income into productive assets, you buy back your future time.`,
    quiz: [
      {
        question: "What is the primary objective of achieving financial freedom?",
        options: [
          "To spend money on luxury goods",
          "To gain complete control over your own time and career choices",
          "To impress peers and community members",
          "To avoid paying taxes completely"
        ],
        answerIndex: 1,
        explanation: "Financial freedom is ultimately about buying back your time so you can decide how to spend your life, rather than being forced to work for survival."
      }
    ]
  },
  {
    id: '2',
    title: 'The Power of Compounding',
    description: 'Learn why starting early is the single most important factor in long-term investing.',
    category: 'basics',
    duration: '8 min',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'View Portfolio',
    actionPath: '/portfolio',
    isPremium: false,
    contentType: 'video',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    detailedContent: `### Module 2: Understanding Compounding Growth

Compounding has been famously referred to as the eighth wonder of the world. Those who understand it earn it; those who don't, pay it.

#### How it Works
When you invest, your capital earns interest or yields returns. In the next period, you earn returns not just on your initial capital, but also on the *returns* earned previously.

Let's look at the math of consistent saving:
* **Saving ₹5,000 / month at 12% annually for 10 Years**: ₹11.2 Lakhs (Invested: ₹6 Lakhs)
* **Saving ₹5,000 / month at 12% annually for 20 Years**: ₹50 Lakhs (Invested: ₹12 Lakhs)
* **Saving ₹5,000 / month at 12% annually for 30 Years**: ₹1.76 Crore (Invested: ₹18 Lakhs)

The last 10 years generated over ₹1.2 Crore of purely automated interest!`,
    quiz: [
      {
        question: "Which factor has the greatest influence on the total outcome of compounding growth over time?",
        options: [
          "The brand name of the brokerage firm",
          "The initial deposit size alone",
          "The length of the time horizon",
          "The current phase of the moon"
        ],
        answerIndex: 2,
        explanation: "Time is the critical multiplier in compound interest. Starting early allows the curve to shift into exponential territory."
      }
    ]
  },
  {
    id: '3',
    title: 'Stock Market Essentials',
    description: 'A complete guide to how the stock market works and how to pick your first shares.',
    category: 'investing',
    duration: '12 min',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'Invest Now',
    actionPath: '/portfolio',
    isPremium: true,
    contentType: 'video',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    detailedContent: `### Module 3: Equities & The Stock Market

Investing in stocks means purchasing fractional ownership of active companies.

#### Core Investment Vehicles
1. **Exchange Traded Funds (ETFs) & Mutual Funds**: Lower risk through instant diversification across hundreds of stocks.
2. **Individual Equity Shares**: Higher risk, requiring robust fundamental analysis of profit margins, balance sheets, and competitive advantages (moats).

#### Key Valuation Metrics
* **Price-to-Earnings (P/E) Ratio**: Price per share divided by annual earnings per share. Helps identify if a stock is overvalued.
* **Return on Equity (ROE)**: Measures how effectively a company generates profits from shareholder capital.`,
    quiz: [
      {
        question: "What does buying a share of stock represent?",
        options: [
          "A short-term legal loan to the government",
          "Fractional ownership of an active business",
          "An entry ticket to an annual lottery",
          "A guarantee of daily cash dividends"
        ],
        answerIndex: 1,
        explanation: "A share is literally a piece of ownership in a real business, entitling you to a portion of its assets and future earnings."
      }
    ]
  },
  {
    id: '4',
    title: '50/30/20 Budgeting Rule',
    description: 'Master the simplest and most effective budgeting framework for everyday life.',
    category: 'budgeting',
    duration: '6 min',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'Create Budget',
    actionPath: '/budgets',
    isPremium: true,
    contentType: 'pdf',
    detailedContent: `### WealthOS Master Guide: The 50/30/20 Rule

This high-performance budgeting standard takes your post-tax monthly income and distributes it across three distinct baskets:

#### 1. 50% for Needs (Survival Essentials)
This bucket comprises rent/mortgage, utility bills, standard groceries, insurance, and minimal loan EMIs. If these exceed 50%, look for ways to optimize fixed housing or energy expenses.

#### 2. 30% for Wants (Lifestyle choices)
This includes dining out, movie tickets, subscription plans, hobbies, and shopping. This represents your flexible discretionary spend.

#### 3. 20% for Savings & Debt Snowball (Wealth Accelerator)
This bucket goes entirely to retirement index funds, emergency savings, and additional principal paydown on high-interest loans. 

#### Action Item
Track your transactions regularly on the **WealthOS Budgets** panel to see if you adhere to these bounds!`,
    quiz: [
      {
        question: "Under the 50/30/20 rule, into which category do restaurant dining and cinema tickets fall?",
        options: [
          "Needs",
          "Savings",
          "Wants",
          "Tax deductions"
        ],
        answerIndex: 2,
        explanation: "Discretionary entertainment expenditures are classified under the 30% Wants category."
      }
    ]
  },
  {
    id: '5',
    title: 'Good Debt vs Bad Debt',
    description: 'Not all debt is equal. Learn how to leverage low-interest loans to build wealth.',
    category: 'debt',
    duration: '10 min',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'Manage Loans',
    actionPath: '/loans',
    isPremium: true,
    contentType: 'pdf',
    detailedContent: `### WealthOS Master Guide: Strategic Debt Leverage

Debt is a double-edged sword. If used poorly, it drains your future earnings. If leveraged properly, it accelerates asset accumulation.

#### Bad Debt (Consumer Consumption)
* **Definition**: Borrowing to acquire assets that immediately depreciate or don't produce cashflow.
* **Examples**: Credit cards, car loans (for luxury use), personal loans for holidays.
* **Cost**: High interest rates (14% - 42% APR) which destroy wealth potential.

#### Good Debt (Asset Leveraging)
* **Definition**: Borrowing low-cost capital to acquire assets that grow or yield higher returns than the cost of the debt.
* **Examples**: Education loans, low-rate mortgages, business lines of credit.
* **Strategy**: Arbitraging the difference. If a home mortgage costs 7.5% interest, but you can invest surplus funds at a 12% average market return, paying off the loan slowly makes mathematical sense.`,
    quiz: [
      {
        question: "Which of the following is typically classified as 'Good Debt'?",
        options: [
          "Credit card debt for holiday travel",
          "An educational loan that increases future earning potential",
          "A high-interest loan for a luxury watch",
          "A payday loan"
        ],
        answerIndex: 1,
        explanation: "Good debt is an investment that has a low interest rate and increases your long-term earning power or builds high-quality assets."
      }
    ]
  },
  {
    id: '6',
    title: 'Options Trading Basics',
    description: 'An introduction to derivatives and how to use them for hedging or speculation.',
    category: 'advanced',
    duration: '15 min',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?q=80&w=600&auto=format&fit=crop',
    actionLabel: 'Advanced Tools',
    actionPath: '/portfolio',
    isPremium: true,
    contentType: 'video',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    detailedContent: `### Module 6: Derivative Options & Hedging

Options are financial instruments whose value is derived from an underlying asset (like a company stock index).

#### Calls & Puts
1. **Call Option**: Gives the buyer the right (but not the obligation) to *buy* a stock at a specified 'strike price' before an expiration date. Used if you expect the price to rise.
2. **Put Option**: Gives the buyer the right to *sell* a stock at a specified strike price. Used if you expect the price to fall, or to hedge/protect an existing portfolio.

#### Risk Warning
Options trading involves substantial leverage, which means both gains and losses are amplified. Beginners should use options primarily for portfolio insurance (hedging) rather than speculative trading.`,
    quiz: [
      {
        question: "What right does a Put Option give to its purchaser?",
        options: [
          "The obligation to purchase shares of stock",
          "The right to sell stock at a specified strike price",
          "The right to receive monthly interest payments",
          "The right to attend annual board meetings"
        ],
        answerIndex: 1,
        explanation: "A Put option is literally the option to sell an underlying stock at a set strike price, providing excellent downside protection."
      }
    ]
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

  // Lesson Player State
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionIndex: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [studyNotes, setStudyNotes] = useState('');
  const [playerTab, setPlayerTab] = useState<'content' | 'quiz' | 'notes'>('content');

  const openPaymentGateway = () => {
    paymentService.startCheckout({
      userId: user?.uid || '',
      userEmail: user?.email || '',
      userName: userProfile?.name || ''
    });
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

  // Load saved study notes from local storage when active lesson changes
  useEffect(() => {
    if (activeLesson) {
      const savedNotes = localStorage.getItem(`wealthos_notes_${activeLesson.id}`) || '';
      setStudyNotes(savedNotes);
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setPlayerTab('content');
    }
  }, [activeLesson]);

  const saveStudyNotes = (text: string) => {
    setStudyNotes(text);
    if (activeLesson) {
      localStorage.setItem(`wealthos_notes_${activeLesson.id}`, text);
    }
  };

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

    setActiveLesson(lesson);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastAcademyTopic: lesson.category,
        lastActiveLessonId: lesson.id
      });
    } catch (err) {
      console.error("Error tracking resume progress:", err);
    }
  };

  const handleCompleteActiveLesson = async () => {
    if (!user?.uid || !activeLesson) return;

    try {
      const viewedList = userProfile?.viewedLessons || [];
      if (!viewedList.includes(activeLesson.id)) {
        await updateDoc(doc(db, 'users', user.uid), {
          viewedLessons: arrayUnion(activeLesson.id)
        });
        toast.success(`Congratulations! You completed: "${activeLesson.title}"`);
      } else {
        toast.success("Lesson reviewed successfully.");
      }
      setActiveLesson(null);
    } catch (err) {
      console.error("Error updating lesson completion:", err);
      toast.error("Failed to update lesson progress.");
    }
  };

  const filteredLessons = LESSONS.filter(lesson => {
    const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate overall course progress percentage
  const totalLessonsCount = LESSONS.length;
  const completedLessonsCount = userProfile?.viewedLessons?.length || 0;
  const progressPercent = totalLessonsCount > 0 
    ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
    : 0;

  // Resolve Resume Learning Lesson
  const resumeLesson = useMemo(() => {
    if (!userProfile?.lastActiveLessonId) return null;
    const found = LESSONS.find(l => l.id === userProfile.lastActiveLessonId);
    if (found && !userProfile.viewedLessons?.includes(found.id)) {
      // Check premium constraint
      if (found.isPremium && !isProUser) return null;
      return found;
    }
    return null;
  }, [userProfile?.lastActiveLessonId, userProfile?.viewedLessons, isProUser]);

  if (loadingData) {
    return (
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center space-x-5">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 animate-pulse" />
            <Skeleton className="h-4 w-64 animate-pulse" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 rounded-[2rem] animate-pulse" />
            <Skeleton className="h-44 rounded-[2rem] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-[2rem] animate-pulse" />
          <Skeleton className="h-80 rounded-[2rem] animate-pulse" />
          <Skeleton className="h-80 rounded-[2rem] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6B66FE]/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Wealth Academy</h1>
            <p className="text-gray-500 font-semibold">Master your money with expert-led structured lessons</p>
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

      {/* OVERALL COURSE PROGRESS SECTION */}
      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 w-full">
            <h3 className="text-lg font-black text-gray-900 leading-none">Curriculum Completion Progress</h3>
            <p className="text-xs text-gray-500 font-semibold">Completed {completedLessonsCount} of {totalLessonsCount} expert wealth courses</p>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex items-center gap-4">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            />
          </div>
          <span className="text-sm font-black text-gray-900 font-mono shrink-0">{progressPercent}%</span>
        </div>
      </div>

      {/* RESUME LEARNING SECTION */}
      {resumeLesson && searchQuery === '' && selectedCategory === 'all' && (
        <div className="bg-gradient-to-r from-[#0E1324] to-[#171E37] border border-indigo-500/10 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl shadow-indigo-950/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6B66FE]/5 rounded-full translate-x-12 -translate-y-12 blur-2xl" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 bg-[#6B66FE]/10 text-[#8B86FE] border border-[#6B66FE]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Clock className="w-3 h-3 animate-pulse" /> Resume Learning
              </span>
              <h2 className="text-2xl font-black tracking-tight">{resumeLesson.title}</h2>
              <p className="text-xs text-gray-400 font-medium max-w-lg leading-relaxed">{resumeLesson.description}</p>
            </div>
            <button
              onClick={() => handleStartLesson(resumeLesson)}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              Resume Course <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS */}
      {recommendations.length > 0 && searchQuery === '' && selectedCategory === 'all' && (
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
                <div className="w-full md:w-40 aspect-video rounded-2xl overflow-hidden shrink-0 relative bg-gray-50">
                  <img src={lesson.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black text-[#6334FD] uppercase tracking-widest mb-1 block">Dynamic Trigger Recommendation</span>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{lesson.title}</h3>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">{lesson.description}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button 
                      onClick={() => handleStartLesson(lesson)}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
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

      {/* CATEGORIES FILTERS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.98] duration-150 cursor-pointer ${
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
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.98] duration-150 cursor-pointer ${
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
                className={`group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full relative cursor-pointer`}
                onClick={() => isLocked ? setIsUpgradeModalOpen(true) : handleStartLesson(lesson)}
              >
                <div className="relative aspect-video overflow-hidden bg-gray-50">
                  <img 
                    src={lesson.thumbnail} 
                    alt={lesson.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isLocked ? 'grayscale opacity-60' : ''}`}
                  />
                  
                  {isLocked ? (
                    <div className="absolute inset-0 bg-[#6334FD]/10 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-2xl border border-[#6334FD]/10">
                        <Lock className="w-6 h-6 text-[#6334FD]" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center shadow-xl transform scale-95 group-hover:scale-100 transition-transform duration-300">
                        {lesson.contentType === 'video' ? (
                          <Play className="w-5 h-5 text-[#6334FD] fill-[#6334FD] ml-0.5" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#6334FD]" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm">
                      {lesson.level}
                    </span>
                    {isViewed && (
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {lesson.isPremium && (
                      <span className="px-3 py-1 bg-[#6334FD] text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-[#6334FD]/20">
                        <Crown className="w-3 h-3 fill-white" />
                        Pro
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 right-4">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur text-white rounded-md text-[10px] font-black uppercase tracking-widest">
                      {lesson.contentType === 'video' ? 'Video Class' : 'PDF Guide'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
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
                        className="w-full py-3 bg-white border-2 border-[#6334FD] text-[#6334FD] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6334FD] hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Unlock with Pro
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartLesson(lesson);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isViewed ? 'Review Lesson' : 'Start Lesson'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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

      {/* UPGRADE CALL TO ACTION BANNERS */}
      {!isProUser && (
        <div className="bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 mt-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Star className="w-3 h-3 fill-white text-yellow-300" />
              Founder Level Access Included
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Unlock All Premium <br /> Video & PDF Guides.
            </h2>
            <p className="text-indigo-50 font-medium mb-8 leading-relaxed">
              Unlock stock valuation frameworks, the 50/30/20 budgeting blueprint, debt optimization guides, and personalized learning paths tailored entirely to your transaction telemetry. Included in Pro.
            </p>
            <Button 
              className="bg-white text-[#6334FD] hover:bg-gray-50 border-none px-10 font-bold"
              icon={<Crown className="w-5 h-5 fill-[#6334FD]" />}
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              Get Premium Access for ₹199
            </Button>
          </div>
        </div>
      )}

      {/* IMMERSIVE LESSON PLAYER OVERLAY MODAL */}
      <AnimatePresence>
        {activeLesson && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 font-sans select-none overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] max-w-5xl w-full h-[90vh] md:h-[85vh] shadow-2xl flex flex-col overflow-hidden relative"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6334FD]">
                    {activeLesson.contentType === 'video' ? <Play className="w-5 h-5 fill-[#6334FD]" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#6334FD] uppercase tracking-widest block">{activeLesson.contentType === 'video' ? 'Video Masterclass' : 'Expert PDF Guide'}</span>
                    <h2 className="text-base md:text-lg font-black text-gray-900 leading-tight">{activeLesson.title}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveLesson(null)}
                  className="w-10 h-10 rounded-full hover:bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Player & Content Layout Split */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* Left Side: Video Screen or Document View */}
                <div className="flex-1 bg-slate-900 flex flex-col relative min-h-[240px] md:min-h-0">
                  {activeLesson.contentType === 'video' ? (
                    <div className="flex-1 flex flex-col justify-between p-4 relative overflow-hidden group/video bg-[#000000]">
                      {/* Video Element */}
                      <video 
                        key={activeLesson.id}
                        src={activeLesson.videoUrl} 
                        controls 
                        className="w-full h-full object-contain focus:outline-none"
                        poster={activeLesson.thumbnail}
                      />
                      <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                        <Volume2 className="w-3 h-3 text-indigo-400" /> Stereo Simulated Output
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-8 space-y-6">
                      <div className="bg-white border border-gray-200/60 rounded-[2rem] p-6 md:p-8 max-w-2xl mx-auto shadow-sm prose prose-slate">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4">
                          <FileText className="w-3.5 h-3.5" /> PDF Guide Document Reader
                        </div>
                        
                        {/* Styled simulated document contents */}
                        <div className="space-y-4 text-slate-700 leading-relaxed font-medium text-sm">
                          {activeLesson.detailedContent.split('\n\n').map((para, pIdx) => {
                            if (para.startsWith('###')) {
                              return <h3 key={pIdx} className="text-xl font-black text-gray-900 pt-3">{para.replace('###', '').trim()}</h3>;
                            }
                            if (para.startsWith('####')) {
                              return <h4 key={pIdx} className="text-base font-black text-[#6334FD] pt-2">{para.replace('####', '').trim()}</h4>;
                            }
                            if (para.startsWith('*')) {
                              return (
                                <ul key={pIdx} className="list-disc pl-5 space-y-2">
                                  {para.split('\n').map((li, lIdx) => (
                                    <li key={lIdx} className="font-semibold text-gray-700">{li.replace('*', '').trim()}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={pIdx}>{para}</p>;
                          })}
                        </div>

                        {/* Export Action */}
                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-bold">Document Version: 1.0.4 (PRO)</span>
                          </div>
                          <button 
                            onClick={() => {
                              toast.success("Document exported and simulated download complete.");
                              const element = document.createElement("a");
                              const file = new Blob([activeLesson.detailedContent], {type: 'text/plain'});
                              element.href = URL.createObjectURL(file);
                              element.download = `${activeLesson.title.toLowerCase().replace(/\s+/g, '_')}_guide.txt`;
                              document.body.appendChild(element);
                              element.click();
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#6334FD]/10 hover:bg-[#6334FD]/20 text-[#6334FD] border border-[#6334FD]/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Guide
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Tab Panel (Details / Quiz / Notes) */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col h-full bg-white select-none">
                  {/* Tab Headers */}
                  <div className="flex bg-gray-50 border-b border-gray-100 shrink-0">
                    <button 
                      onClick={() => setPlayerTab('content')}
                      className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${playerTab === 'content' ? 'border-[#6334FD] text-gray-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setPlayerTab('quiz')}
                      className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${playerTab === 'quiz' ? 'border-[#6334FD] text-gray-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                      Quiz Check
                    </button>
                    <button 
                      onClick={() => setPlayerTab('notes')}
                      className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${playerTab === 'notes' ? 'border-[#6334FD] text-gray-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                      Notes
                    </button>
                  </div>

                  {/* Tab Body */}
                  <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    {playerTab === 'content' && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">About this Lesson</h3>
                          <p className="text-xs text-gray-600 font-semibold leading-relaxed">{activeLesson.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Duration</span>
                            <span className="text-xs font-black text-gray-900">{activeLesson.duration}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Level</span>
                            <span className="text-xs font-black text-gray-900">{activeLesson.level}</span>
                          </div>
                        </div>

                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-indigo-900">Interactive Quiz Required</h4>
                            <p className="text-[10px] text-indigo-700 font-semibold">Test your understanding under the Quiz tab to unlock completion rewards!</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {playerTab === 'quiz' && (
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-black text-gray-900">Knowledge Check</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Answer the question below</p>
                        </div>

                        {activeLesson.quiz.map((q, qIdx) => {
                          const isCorrect = selectedAnswers[qIdx] === q.answerIndex;
                          const hasSelected = selectedAnswers[qIdx] !== undefined;

                          return (
                            <div key={qIdx} className="space-y-4">
                              <p className="text-xs font-black text-gray-800 leading-normal">{q.question}</p>
                              <div className="space-y-2">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = selectedAnswers[qIdx] === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={quizSubmitted}
                                      onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                      className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                                        quizSubmitted
                                          ? oIdx === q.answerIndex
                                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500'
                                            : isSelected
                                              ? 'bg-red-50 text-red-800 border-2 border-red-500'
                                              : 'bg-gray-50 text-gray-400 border border-gray-100'
                                          : isSelected
                                            ? 'bg-indigo-50 text-indigo-800 border-2 border-indigo-600'
                                            : 'bg-white border border-gray-100 hover:border-gray-200 text-gray-700'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>

                              {quizSubmitted && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`p-3.5 rounded-xl text-[11px] font-semibold leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
                                >
                                  <div className="flex items-start gap-1.5">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <div>
                                      <span className="font-bold">{isCorrect ? 'Correct!' : 'Incorrect.'}</span> {q.explanation}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}

                        {!quizSubmitted ? (
                          <button
                            onClick={() => {
                              if (Object.keys(selectedAnswers).length < activeLesson.quiz.length) {
                                toast.error("Please answer the quiz question first.");
                                return;
                              }
                              setQuizSubmitted(true);
                              const correct = Object.keys(selectedAnswers).every(
                                (key: any) => selectedAnswers[key] === activeLesson.quiz[key].answerIndex
                              );
                              if (correct) {
                                toast.success("Excellent work! You answered correctly.");
                              } else {
                                toast.error("Some answers were incorrect. Review the explanations!");
                              }
                            }}
                            className="w-full py-3 bg-[#6334FD] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-[#6334FD]/90 active:scale-95 transition-all cursor-pointer"
                          >
                            Submit Answers
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAnswers({});
                              setQuizSubmitted(false);
                            }}
                            className="w-full py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                          >
                            Reset Quiz
                          </button>
                        )}
                      </div>
                    )}

                    {playerTab === 'notes' && (
                      <div className="space-y-4 flex flex-col h-full min-h-[220px]">
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-gray-900">My Study Notes</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Stored automatically on your device</p>
                        </div>
                        <textarea
                          placeholder="Type your notes here as you watch or read... e.g., 'Save 20% post-tax of ₹50k is ₹10k per month...'"
                          value={studyNotes}
                          onChange={(e) => saveStudyNotes(e.target.value)}
                          className="flex-1 w-full p-4 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#6334FD]/5 focus:border-[#6334FD]/20 text-xs font-medium leading-relaxed resize-none bg-gray-50/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Complete Action Footer */}
                  <div className="p-5 border-t border-gray-100 shrink-0 bg-white">
                    <button 
                      onClick={handleCompleteActiveLesson}
                      disabled={!quizSubmitted}
                      className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                        quizSubmitted 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.01]' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Complete Masterclass
                    </button>
                    {!quizSubmitted && (
                      <p className="text-[10px] text-gray-400 font-bold text-center mt-2 uppercase tracking-wide">Submit the Quiz to unlock Completion</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PricingModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};

export default WealthAcademy;
