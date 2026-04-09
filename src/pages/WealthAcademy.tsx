import React, { useState } from 'react';
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
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/ui/Button';

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
    thumbnail: 'https://picsum.photos/seed/finance1/800/450'
  },
  {
    id: '2',
    title: 'The Power of Compounding',
    description: 'Learn why starting early is the single most important factor in long-term investing.',
    category: 'basics',
    duration: '8 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance2/800/450'
  },
  {
    id: '3',
    title: 'Stock Market Essentials',
    description: 'A complete guide to how the stock market works and how to pick your first shares.',
    category: 'investing',
    duration: '12 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance3/800/450'
  },
  {
    id: '4',
    title: '50/30/20 Budgeting Rule',
    description: 'Master the simplest and most effective budgeting framework for everyday life.',
    category: 'budgeting',
    duration: '6 min',
    level: 'Beginner',
    thumbnail: 'https://picsum.photos/seed/finance4/800/450'
  },
  {
    id: '5',
    title: 'Good Debt vs Bad Debt',
    description: 'Not all debt is equal. Learn how to leverage low-interest loans to build wealth.',
    category: 'debt',
    duration: '10 min',
    level: 'Intermediate',
    thumbnail: 'https://picsum.photos/seed/finance5/800/450'
  },
  {
    id: '6',
    title: 'Options Trading Basics',
    description: 'An introduction to derivatives and how to use them for hedging or speculation.',
    category: 'advanced',
    duration: '15 min',
    level: 'Advanced',
    thumbnail: 'https://picsum.photos/seed/finance6/800/450'
  }
];

const WealthAcademy: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLessons = LESSONS.filter(lesson => {
    const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Wealth Academy</h1>
            <p className="text-gray-500 font-medium">Master your money with expert-led lessons</p>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
          <input 
            type="text"
            placeholder="Search lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-200 transition-all outline-none font-medium"
          />
        </div>
      </div>

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
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' 
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
          {filteredLessons.map((lesson, idx) => (
            <motion.div
              layout
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={lesson.thumbnail} 
                  alt={lesson.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 text-orange-600 fill-orange-600 ml-1" />
                  </div>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900">
                    {lesson.level}
                  </span>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lesson.duration}</span>
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {lesson.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-6">
                  {lesson.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <button className="flex items-center gap-1 text-xs font-black text-orange-600 uppercase tracking-widest group/btn">
                    Start Learning
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
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

      {/* UPGRADE SECTION */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-orange-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <Star className="w-3 h-3 fill-white" />
            Personalized Learning
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
            Learn based on your <br /> spending habits.
          </h2>
          <p className="text-orange-50 font-medium mb-8 leading-relaxed">
            Our AI analyzes your transactions to recommend lessons that will help you save more and invest smarter. Upgrade to Pro for a tailored curriculum.
          </p>
          <Button 
            className="bg-white text-orange-600 hover:bg-orange-50 border-none px-10"
            icon={<TrendingUp className="w-5 h-5" />}
          >
            Get Personalized Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WealthAcademy;
