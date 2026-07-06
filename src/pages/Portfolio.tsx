import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieChartIcon, 
  DollarSign, 
  Briefcase,
  X,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Coins,
  Home,
  FileText,
  Gem,
  AlertCircle,
  Wallet,
  ShieldCheck,
  Info,
  BrainCircuit,
  Zap,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  Timestamp, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PortfolioAsset } from '../types';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { toDate } from '../lib/dateUtils';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { Tooltip } from '../components/Tooltip';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { fetchMarketPrice, normalizeSymbol, searchSymbols, SymbolResult, fetchBatchPrices, calculateSafeGainLoss } from '../services/marketDataService';
import { RefreshCw, Clock } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const CATEGORIES = [
  { 
    id: 'Stocks', 
    label: 'Stocks', 
    subtitle: 'Public company investments',
    icon: Activity, 
    type: 'equity', 
    defaultMode: 'api' 
  },
  { 
    id: 'Crypto', 
    label: 'Crypto', 
    subtitle: 'Bitcoin, Ethereum, digital assets',
    icon: Coins, 
    type: 'crypto', 
    defaultMode: 'api' 
  },
  { 
    id: 'Real Estate', 
    label: 'Property', 
    subtitle: 'House, land, real estate',
    icon: Home, 
    type: 'real_estate', 
    defaultMode: 'manual' 
  },
  { 
    id: 'Gold', 
    label: 'Gold & Metals', 
    subtitle: 'Gold, silver, physical metals',
    icon: Gem, 
    type: 'precious_metals', 
    defaultMode: 'manual' 
  },
  { 
    id: 'Others', 
    label: 'Other Asset', 
    subtitle: 'Track anything else you own',
    icon: Briefcase, 
    type: 'others', 
    defaultMode: 'manual' 
  },
] as const;

type Category = typeof CATEGORIES[number]['id'];

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isNavVisible } = useLayout();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search State Machine (Step 7)
  type SearchState = 'IDLE' | 'LOADING' | 'RESULTS' | 'EMPTY' | 'ERROR' | 'RATE_LIMIT' | 'AUTH_FAILURE';
  const [searchState, setSearchState] = useState<SearchState>('IDLE');
  const [searchResults, setSearchResults] = useState<SymbolResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<Category>('Stocks');
  const [isNotified, setIsNotified] = useState(false);
  const [modalStep, setModalStep] = useState<'category' | 'form'>('category');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<PortfolioAsset | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    assetName: '',
    symbol: '',
    assetType: 'equity' as PortfolioAsset['assetType'],
    trackingMode: 'api' as 'api' | 'manual',
    quantity: '',
    avgBuyPrice: '',
    lastPrice: '',
    investedAmount: '',
    currentValue: '',
    investmentDate: new Date().toISOString().split('T')[0],
    coinName: '',
    coinId: '',
    propertyName: '',
    rentalIncome: '',
    bondName: '',
    interestRate: '',
    maturityDate: '',
    weight: ''
  });

  // Helper: Calculate derived values for the UI/Storage
  const getDerivedFinancials = (data: typeof formData) => {
    const qty = Number(data.quantity) || 0;
    const isLive = data.trackingMode === 'api';

    if (isLive) {
      const avgPrice = Number(data.avgBuyPrice) || 0;
      const marketPrice = Number(data.lastPrice) || 0;
      
      const invested = qty * avgPrice;
      const current = qty * marketPrice;
      
      return {
        qty,
        avgPrice,
        lastPrice: marketPrice,
        investedAmount: invested,
        currentValue: current,
        isComplete: qty > 0 && avgPrice > 0 && data.symbol
      };
    } else {
      const invested = Number(data.investedAmount) || 0;
      const current = Number(data.currentValue) || 0;
      
      // For manual, avgPrice and lastPrice are derived for display only
      const derivedAvgPrice = qty > 0 ? invested / qty : 0;
      const derivedLastPrice = qty > 0 ? current / qty : 0;

      return {
        qty,
        avgPrice: derivedAvgPrice,
        lastPrice: derivedLastPrice,
        investedAmount: invested,
        currentValue: current,
        isComplete: data.assetName && invested >= 0 && current >= 0
      };
    }
  };
  
  const handleSyncPrice = async () => {
    const symbolToFetch = formData.symbol;
    if (!symbolToFetch) {
      toast.error('Please select or enter a symbol');
      return;
    }

    setIsFetchingPrice(true);
    setPriceError(null);
    try {
      const isCrypto = selectedCategory === 'Crypto';
      const price = await fetchMarketPrice(symbolToFetch, isCrypto);
      if (price !== null) {
        setFormData(prev => ({
          ...prev,
          lastPrice: price.toString()
        }));
        toast.success(`Latest price fetched for ${symbolToFetch}`);
      } else {
        setPriceError('Live pricing is temporarily unavailable. You can still enter it manually.');
      }
    } catch (error: any) {
      console.error('Error syncing price:', error);
      setPriceError(error.message || 'Failed to sync price. Please enter manually.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Debounced Search Implementation (Step 2)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setSearchState('IDLE');
        return;
      }

      setSearchState('LOADING');
      setSearchError(null);
      
      try {
        let results = [];
        try {
          results = await searchSymbols(searchQuery, selectedCategory === 'Crypto');
        } catch (initialError: any) {
          console.warn('WealthOS Search: First attempt failed, retrying once...', initialError);
          // Simple retry once for transient network issues
          await new Promise(r => setTimeout(r, 500));
          results = await searchSymbols(searchQuery, selectedCategory === 'Crypto');
        }

        setSearchResults(results.slice(0, 10));
        setSearchState(results.length > 0 ? 'RESULTS' : 'EMPTY');
      } catch (error: any) {
        console.error('WealthOS: UI Search trigger failed', error);
        
        if (error.message === 'RATE_LIMIT') {
          setSearchState('RATE_LIMIT');
          setSearchError('Search quota reached. Please wait a moment or enter manually.');
        } else if (error.message === 'AUTH_FAILURE') {
          setSearchState('AUTH_FAILURE');
          setSearchError('Market data provider authentication issues. Manual entry available.');
        } else {
          setSearchState('ERROR');
          setSearchError('Live search is temporarily disconnected. You can still enter details manually below.');
        }
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSymbolSearch = (query: string) => {
    setSearchQuery(query);
    setFormData(prev => ({ ...prev, assetName: query }));
  };

  const handleSymbolSelect = async (result: SymbolResult) => {
    setSearchResults([]);
    setIsFetchingPrice(true);
    setPriceError(null);
    try {
      const isCrypto = selectedCategory === 'Crypto';
      const price = await fetchMarketPrice(result.symbol, isCrypto);
      setFormData(prev => ({
        ...prev,
        assetName: result.description || result.symbol,
        symbol: result.symbol,
        coinId: isCrypto ? result.symbol.toLowerCase() : '', // Mapping symbol to coinId if crypto
        lastPrice: price?.toString() || '0'
      }));
      if (price === null) {
        setPriceError('Live pricing is temporarily unavailable. Manual entry enabled for continuity.');
      }
    } catch (error: any) {
      console.error('Error fetching price for selection:', error);
      setPriceError(error.message || 'Failed to fetch market price.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const refreshAllPrices = async (assetsToRefresh = assets, isManual = false) => {
    if (!user || assetsToRefresh.length === 0) return;
    
    setIsRefreshing(true);
    let successCount = 0;
    
    try {
      const symbolsToFetch = assetsToRefresh
        .filter(a => a.trackingMode === 'api')
        .map(a => ({ 
          symbol: a.symbol, 
          isCrypto: a.assetType === 'crypto' 
        }))
        .filter(a => Boolean(a.symbol));

      if (symbolsToFetch.length === 0) {
        setIsRefreshing(false);
        return;
      }

      const priceData = await fetchBatchPrices(symbolsToFetch, isManual);
      
      for (const asset of assetsToRefresh) {
        if (asset.trackingMode !== 'api') continue;
        
        const symbol = asset.symbol;
        if (!symbol) continue;

        const newPrice = priceData[symbol];
        if (newPrice !== null && newPrice !== undefined) {
          const qty = asset.quantity || 1;
          const newCurrentValue = newPrice * qty;
          
          if (Math.abs(newCurrentValue - asset.currentValue) > 0.01 || !asset.lastUpdatedAt) {
            await updateDoc(doc(db, `users/${user.uid}/portfolio`, asset.id!), {
              lastPrice: newPrice,
              currentValue: newCurrentValue,
              lastUpdatedAt: Timestamp.now()
            });
            successCount++;
          }
        }
      }
      
      if (successCount > 0 && isManual) {
        toast.success(`Refreshed ${successCount} assets with latest prices`);
      }
    } catch (error) {
      console.error('Error refreshing all prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/portfolio`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PortfolioAsset[];
      setAssets(assetsData);
      setIsLoading(false);
      
      // Auto-refresh prices on load (TASK 4)
      if (assetsData.length > 0) {
        refreshAllPrices(assetsData);
      }
    }, (error) => {
      console.error('Portfolio fetch error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (true) {
    const handleNotify = () => {
      setIsNotified(true);
      toast.success("Notification subscription active. We'll update you as soon as Portfolio Tracking launches!");
    };

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_40%),linear-gradient(135deg,#070B2D_0%,#11174A_35%,#1F255C_100%)] rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden text-center border border-white/5 animate-fade-in"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#6334FD]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6B66FE]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Status Badge */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#6B66FE]/10 border border-[#6B66FE]/20 rounded-full text-[10px] font-black uppercase tracking-widest text-[#6B66FE] mb-6 shadow-sm shadow-[#6B66FE]/5"
            >
              <Zap className="w-3 h-3 text-[#6B66FE] fill-[#6B66FE]" />
              COMING SOON
            </motion.div>

            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-[#6B66FE]/20 to-[#6334FD]/20 border border-white/10 rounded-[1.25rem] flex items-center justify-center mb-6 shadow-2xl transform hover:rotate-12 transition-transform duration-305">
              <Briefcase className="w-8 h-8 text-[#6B66FE] stroke-[1.5]" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Portfolio Tracking
            </h1>

            {/* Subtitle */}
            <p className="text-sm md:text-base text-indigo-200/90 font-semibold max-w-lg mb-4">
              Track stocks, crypto, mutual funds and alternative assets in one place.
            </p>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-400 font-medium max-w-md mb-8 leading-relaxed">
              We're building a more powerful portfolio experience with live market tracking and advanced analytics.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <Button
                onClick={handleNotify}
                disabled={isNotified}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-150 ${
                  isNotified 
                    ? 'bg-emerald-500 hover:bg-emerald-500 text-white cursor-default border-none' 
                    : 'bg-[#6334FD] text-white hover:bg-[#6334FD]/90 shadow-xl shadow-[#6B66FE]/25 border-none'
                }`}
                size="lg"
              >
                {isNotified ? '✓ Subscribed' : 'Notify Me When Available'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest bg-[#FFFFFF] text-[#111827] border-[#E5E7EB] hover:bg-[#F9FAFB] active:scale-95 duration-100"
                size="lg"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const metadata: any = {
        symbol: formData.symbol
      };
      
      const currentCategory = CATEGORIES.find(c => c.id === selectedCategory);
      const assetType = currentCategory?.type || 'others';

      if (selectedCategory === 'Stocks') {
        metadata.investmentDate = formData.investmentDate;
      } else if (selectedCategory === 'Crypto') {
        metadata.symbol = formData.symbol;
        metadata.coinId = formData.coinId;
      } else if (selectedCategory === 'Real Estate') {
        metadata.propertyName = formData.assetName; // Use assetName consistently
      } else if (selectedCategory === 'Gold') {
        metadata.weight = Number(formData.quantity); // Use quantity as weight
      }

      const { qty, avgPrice, lastPrice, investedAmount, currentValue } = getDerivedFinancials(formData);

      if (investedAmount < 0 || currentValue < 0) {
        throw new Error('Financial values cannot be negative');
      }

      const assetData: Omit<PortfolioAsset, 'id'> = {
        userId: user.uid,
        category: selectedCategory,
        assetName: formData.assetName || (selectedCategory === 'Crypto' ? formData.coinId : formData.symbol) || 'Untitled Asset',
        symbol: formData.symbol || '',
        assetType: assetType as any,
        trackingMode: formData.trackingMode,
        quantity: qty,
        avgBuyPrice: avgPrice,
        lastPrice: lastPrice,
        investedAmount: investedAmount,
        currentValue: currentValue,
        lastUpdatedAt: Timestamp.now(),
        manualValuationAt: formData.trackingMode === 'manual' ? Timestamp.now() : null,
        metadata,
        timestamp: Timestamp.now()
      };

      if (editingAssetId) {
        await updateDoc(doc(db, `users/${user.uid}/portfolio`, editingAssetId), assetData);
        toast.success('Asset Successfully Updated');
      } else {
        await addDoc(collection(db, `users/${user.uid}/portfolio`), assetData);
        toast.success('Asset added to portfolio');
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error(editingAssetId ? 'Failed to update asset' : 'Failed to add asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (asset: PortfolioAsset) => {
    setEditingAssetId(asset.id!);
    setSelectedCategory(asset.category);
    setFormData({
      assetName: asset.assetName,
      symbol: asset.symbol || '',
      assetType: asset.assetType,
      trackingMode: asset.trackingMode || 'manual',
      quantity: asset.quantity?.toString() || '',
      avgBuyPrice: asset.avgBuyPrice?.toString() || '',
      lastPrice: asset.lastPrice?.toString() || '',
      investedAmount: asset.investedAmount.toString(),
      currentValue: asset.currentValue.toString(),
      investmentDate: asset.metadata?.investmentDate || new Date().toISOString().split('T')[0],
      coinName: asset.metadata?.coinName || '',
      coinId: asset.metadata?.coinId || '',
      propertyName: asset.metadata?.propertyName || '',
      rentalIncome: asset.metadata?.rentalIncome?.toString() || '',
      bondName: asset.metadata?.bondName || '',
      interestRate: asset.metadata?.interestRate?.toString() || '',
      maturityDate: asset.metadata?.maturityDate || '',
      weight: asset.metadata?.weight?.toString() || ''
    });
    setModalStep('form');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = (asset: PortfolioAsset) => {
    setAssetToDelete(asset);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    if (!user || !assetToDelete) return;

    setIsDeleting(true);
    try {
      // Optimistic UI update
      setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
      
      await deleteDoc(doc(db, `users/${user.uid}/portfolio`, assetToDelete.id));
      toast.success('Asset Successfully Deleted');
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatLastUpdated = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const date = toDate(timestamp).getTime();
    const diffInMinutes = Math.floor((now - date) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return toDate(timestamp).toLocaleDateString();
  };

  const resetForm = () => {
    setFormData({
      assetName: '',
      symbol: '',
      assetType: 'equity',
      trackingMode: 'api',
      quantity: '',
      avgBuyPrice: '',
      lastPrice: '',
      investedAmount: '',
      currentValue: '',
      investmentDate: new Date().toISOString().split('T')[0],
      coinName: '',
      coinId: '',
      propertyName: '',
      rentalIncome: '',
      bondName: '',
      interestRate: '',
      maturityDate: '',
      weight: ''
    });
    setSelectedCategory('Stocks');
    setEditingAssetId(null);
    setModalStep('category');
  };

  const totalInvested = assets.reduce((sum, a) => sum + a.investedAmount, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const { gainLoss: totalGainLoss, percentage: totalGainLossPercentage } = calculateSafeGainLoss(totalCurrentValue, totalInvested);

  // Asset Allocation Logic
  const categoryTotals = assets.reduce((acc, asset) => {
    acc[asset.category] = (acc[asset.category] || 0) + asset.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const allocationData = CATEGORIES.map(cat => ({
    name: cat.label,
    value: categoryTotals[cat.id] || 0,
    color: cat.id === 'Stocks' ? '#4F46E5' : 
           cat.id === 'Crypto' ? '#F59E0B' : 
           cat.id === 'Real Estate' ? '#10B981' : 
           cat.id === 'Gold' ? '#EAB308' : '#94A3B8'
  })).filter(d => d.value > 0);

  // Smart Insights Logic
  const insights = [];
  const totalPortfolio = totalCurrentValue;
  const categoriesCount = Object.keys(categoryTotals).length;

  if (totalPortfolio > 0) {
    // Concentration Warning
    Object.entries(categoryTotals).forEach(([category, total]) => {
      const percent = ((total as number) / totalPortfolio) * 100;
      if (percent > 60) {
        insights.push({
          type: 'warning',
          title: 'High Concentration',
          message: `Your ${category} holdings represent ${percent.toFixed(1)}% of your portfolio. Consider diversifying to reduce risk.`,
          icon: AlertCircle,
          color: 'text-amber-600 bg-amber-50 border-amber-100'
        });
      }
    });

    // Crypto Risk Flag
    const cryptoTotal = categoryTotals['Crypto'] || 0;
    const cryptoPercent = (cryptoTotal / totalPortfolio) * 100;
    if (cryptoPercent > 30) {
      insights.push({
        type: 'risk',
        title: 'High Crypto Exposure',
        message: `Crypto makes up ${cryptoPercent.toFixed(1)}% of your portfolio. High volatility may impact your overall stability.`,
        icon: Activity,
        color: 'text-rose-600 bg-rose-50 border-rose-100'
      });
    }

    // Low Diversification
    if (categoriesCount < 2 && assets.length > 0) {
      insights.push({
        type: 'info',
        title: 'Low Diversification',
        message: 'You are currently invested in only one asset class. Exploring other categories could improve your risk-adjusted returns.',
        icon: Info,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
      });
    }

    // Healthy Portfolio
    if (insights.length === 0 && assets.length > 0) {
      insights.push({
        type: 'success',
        title: 'Well Balanced',
        message: 'Your portfolio shows healthy diversification across asset classes. Great job managing your risk!',
        icon: ShieldCheck,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
      });
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 w-full overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Portfolio</h1>
            <p className="text-gray-500 mt-1">Track and manage your diverse investments in one place.</p>
          </div>
        </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Invested */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 hover:shadow-indigo-500/5 transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[140px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Invested</p>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter truncate mt-auto">
            <CurrencyDisplay value={totalInvested} />
          </h3>
        </div>

        {/* Current Value */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 hover:shadow-indigo-500/5 transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[140px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Current Value</p>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter truncate mt-auto">
            <CurrencyDisplay value={totalCurrentValue} />
          </h3>
        </div>

        {/* Profit/Loss */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 hover:shadow-emerald-500/5 transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[140px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Profit/Loss</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${totalGainLoss >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              {totalGainLoss >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
            </div>
          </div>
          <h3 className={`text-3xl font-black tracking-tighter truncate mt-auto ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}<CurrencyDisplay value={totalGainLoss} />
          </h3>
        </div>

        {/* Return % */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 hover:shadow-indigo-500/5 transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[140px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Return %</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${totalGainLoss >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <Activity className={`w-4 h-4 ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
          </div>
          <h3 className={`text-3xl font-black tracking-tighter truncate mt-auto ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            <Tooltip content={`${totalGainLoss >= 0 ? '+' : ''}${totalGainLossPercentage.toFixed(4)}%`}>
              <span className="border-b-2 border-dotted border-gray-200">
                {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%
              </span>
            </Tooltip>
          </h3>
        </div>
      </div>

      {/* Allocation & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Visualization */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Asset Allocation</h2>
            <div className="p-2 bg-gray-50 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrencyShort(value)}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-bold text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <PieChartIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm">No data to visualize</p>
              </div>
            )}
          </div>

          {/* Progress Bars Fallback/Detail */}
          <div className="mt-6 space-y-4">
            {allocationData.map((data) => {
              const percent = (data.value / totalPortfolio) * 100;
              return (
                <div key={data.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{data.name}</span>
                    <span className="text-gray-900">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: data.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Portfolio Smart Insights */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Portfolio Insights</h2>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>
          </div>

          <div className="space-y-4">
            {assets.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <Info className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Add assets to your portfolio to generate smart insights.</p>
              </div>
            ) : (
              insights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-2xl border ${insight.color} flex gap-4 shadow-sm`}
                  >
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs opacity-90 font-medium leading-relaxed">{insight.message}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Future Ready Tip */}
          <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pro Tip</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Diversifying across at least 3 asset classes is generally recommended to balance risk and return.
            </p>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 overflow-visible">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Asset List</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all active:scale-[0.98] duration-150">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all active:scale-[0.98] duration-150" onClick={() => refreshAllPrices(assets, true)}>
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          {assets.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Briefcase}
                title="No assets in portfolio"
                description="Start tracking your wealth by adding your first investment. Track stocks, crypto, real estate and more."
                actionLabel="Add Asset"
                onAction={() => setIsModalOpen(true)}
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider pl-4">Asset Detail</th>
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider text-right">Price / Units</th>
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider text-right">Invested</th>
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider text-right">Current Value</th>
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider text-right">Profit / Loss</th>
                  <th className="pb-4 pt-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => {
                  const CategoryIcon = CATEGORIES.find(c => c.id === asset.category)?.icon || Activity;
                  const { gainLoss: profit, percentage: profitPercentage } = calculateSafeGainLoss(asset.currentValue, asset.investedAmount);
                  
                  return (
                    <tr key={asset.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                            <CategoryIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{asset.assetName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{asset.symbol || asset.category}</span>
                              <span className={`text-[8px] px-1 rounded font-black uppercase ${asset.category === 'Stocks' || asset.category === 'Crypto' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                {asset.category}
                              </span>
                              {asset.lastUpdatedAt && (
                                <>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatLastUpdated(asset.lastUpdatedAt)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <div className="space-y-0.5">
                          {asset.category === 'Stocks' || asset.category === 'Crypto' ? (
                            <>
                              <p className="text-sm font-bold text-gray-900">
                                {asset.lastPrice ? <CurrencyDisplay value={asset.lastPrice} /> : '—'}
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium">{asset.quantity} {asset.category === 'Crypto' ? 'units' : 'units'}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-gray-600">{asset.category}</p>
                              {asset.quantity > 0 && asset.category === 'Gold' && (
                                <p className="text-[10px] text-gray-500 font-medium">{asset.quantity} grams</p>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          <CurrencyDisplay value={asset.investedAmount} />
                        </p>
                        {asset.avgBuyPrice > 0 && asset.quantity > 0 && (
                          <p className="text-[10px] text-gray-400 font-medium">Avg. <CurrencyDisplay value={asset.avgBuyPrice} /></p>
                        )}
                      </td>
                      <td className="py-5 text-right">
                        <p className="text-sm font-bold text-gray-900">
                          <CurrencyDisplay value={asset.currentValue} />
                        </p>
                      </td>
                      <td className="py-5 text-right font-mono">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-5 pr-4 text-right">
                         <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === asset.id ? null : asset.id)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-[0.98] duration-150"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === asset.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[100]" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 z-[110] overflow-hidden"
                                >
                                  <button
                                    onClick={() => handleEdit(asset)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98] duration-150"
                                  >
                                    <Edit2 className="w-4 h-4 text-indigo-600" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(asset)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all active:scale-[0.98] duration-150"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {assets.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Briefcase}
                title="No assets yet"
                description="Start tracking your diverse investments to see them here."
                actionLabel="Add first asset"
                onAction={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
              />
            </div>
          ) : (
            assets.map((asset) => {
              const { gainLoss: profit, percentage: profitPercentage } = calculateSafeGainLoss(asset.currentValue, asset.investedAmount);
              const CategoryIcon = CATEGORIES.find(c => c.id === asset.category)?.icon || Activity;

              return (
                <div key={asset.id} className="p-4 space-y-4 relative flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                        <CategoryIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{asset.assetName}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                             {asset.symbol || asset.category}
                           </p>
                           <span className={`text-[8px] px-1 rounded font-black uppercase ${asset.category === 'Stocks' || asset.category === 'Crypto' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                             {asset.category}
                           </span>
                           {asset.lastUpdatedAt && (
                             <span className="text-[10px] text-gray-400 flex items-center gap-1">
                               <Clock className="w-2.5 h-2.5" />
                               {formatLastUpdated(asset.lastUpdatedAt)}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === asset.id ? null : asset.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-[0.98] duration-150"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Val</p>
                      <p className="text-sm font-bold text-gray-900"><CurrencyDisplay value={asset.currentValue} /></p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invested</p>
                      <p className="text-sm font-bold text-gray-900"><CurrencyDisplay value={asset.investedAmount} /></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">P/L</p>
                      <p className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      {asset.category === 'Stocks' || asset.category === 'Crypto' ? (
                        <>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market Price</p>
                          <p className="text-sm font-bold text-indigo-600">
                            {asset.lastPrice ? <CurrencyDisplay value={asset.lastPrice} /> : '—'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Class</p>
                          <p className="text-sm font-bold text-amber-600">{asset.category}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {activeMenuId === asset.id && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenuId(null)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-gray-50 rounded-xl p-2 grid grid-cols-2 gap-2 relative z-[110]"
                        >
                          <button
                            onClick={() => handleEdit(asset)}
                            className="bg-white p-3 rounded-lg text-sm font-bold text-gray-700 shadow-sm flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(asset)}
                            className="bg-white p-3 rounded-lg text-sm font-bold text-rose-600 shadow-sm flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAssetId ? 'Edit Asset' : (modalStep === 'category' ? 'Add Asset' : `Add ${selectedCategory}`)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingAssetId ? 'Update your asset details.' : (modalStep === 'category' ? 'What would you like to track?' : 'Enter the details of your investment.')}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {modalStep === 'category' && !editingAssetId ? (
                  <div className="p-6 grid grid-cols-1 gap-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setFormData(prev => ({ 
                              ...prev, 
                              trackingMode: cat.defaultMode,
                              assetType: cat.type as any 
                            }));
                            setModalStep('form');
                          }}
                          className="flex items-center gap-4 p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/30 transition-all text-left group"
                        >
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white group-hover:scale-110 transition-all">
                            <Icon className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{cat.label}</h3>
                            <p className="text-xs text-gray-500 font-medium">{cat.subtitle}</p>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <form onSubmit={handleAddAsset} className="p-6 space-y-6 pb-32 md:pb-6">
                    {priceError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-[10px] font-bold text-amber-700"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {priceError}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* LIVE ASSETS: STOCKS & CRYPTO */}
                      {(selectedCategory === 'Stocks' || selectedCategory === 'Crypto') && (
                        <>
                          <div className="space-y-2 md:col-span-2 relative">
                            <label className="text-sm font-bold text-gray-700 flex justify-between items-center">
                              Search {selectedCategory === 'Stocks' ? 'Stock' : 'Coin'}
                              {searchState === 'LOADING' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                            </label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                <Search className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                placeholder={selectedCategory === 'Stocks' ? 'e.g. Reliance, Apple, HDFC' : 'e.g. Bitcoin, Ethereum, Solana'}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.assetName}
                                onChange={(e) => handleSymbolSearch(e.target.value)}
                              />
                            </div>
                            
                            {/* Search Results Dropdown */}
                            <AnimatePresence>
                              {searchQuery.length >= 2 && searchState !== 'IDLE' && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute z-[10001] left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                >
                                  {searchState === 'RESULTS' && searchResults.map((result, idx) => (
                                    <button
                                      key={`${result.symbol}-${idx}`}
                                      type="button"
                                      onClick={() => {
                                        handleSymbolSelect(result);
                                        setSearchQuery('');
                                        setSearchState('IDLE');
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                                    >
                                      <div className="min-w-0 pr-4">
                                        <p className="font-bold text-gray-900 truncate">{result.description}</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{result.symbol}</span>
                                          <span className="text-[10px] text-gray-400 font-medium">{result.type}</span>
                                        </div>
                                      </div>
                                      <Plus className="w-4 h-4 text-gray-300 shrink-0" />
                                    </button>
                                  ))}
                                  {searchState === 'EMPTY' && (
                                    <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase">No results found</div>
                                  )}
                                  {(searchState === 'ERROR' || searchState === 'RATE_LIMIT' || searchState === 'AUTH_FAILURE') && (
                                    <div className="p-6 text-center">
                                      <p className="text-xs font-bold text-amber-600 mb-2">{searchError}</p>
                                      <p className="text-[10px] text-gray-400">You can type the asset name manually above and fill in the details below.</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Quantity</label>
                            <input
                              type="number"
                              required
                              step="any"
                              placeholder="0.00"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Avg Buy Price</label>
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                              <input
                                type="number"
                                required
                                step="any"
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.avgBuyPrice}
                                onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Visual Summary or Fallback Manual Input */}
                          <div className="md:col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            {(!formData.lastPrice || formData.lastPrice === '0' || priceError) ? (
                              <div className="space-y-2">
                                <label className="text-sm font-bold text-indigo-700">Current Market Price (Manual Entry)</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.lastPrice}
                                    onChange={(e) => setFormData({ ...formData, lastPrice: e.target.value })}
                                  />
                                </div>
                                <p className="text-[10px] text-indigo-400 font-medium">Live market data is temporarily disconnected. Your portfolio will remain accurate with manual values.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Est. Invested</p>
                                  <p className="text-lg font-black text-indigo-900">
                                    <CurrencyDisplay value={Number(formData.quantity) * Number(formData.avgBuyPrice)} />
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Market Price</p>
                                  <div className="flex flex-col items-end">
                                    <p className="text-lg font-black text-indigo-900">
                                      <CurrencyDisplay value={Number(formData.lastPrice)} />
                                    </p>
                                    <button 
                                      type="button"
                                      onClick={() => setFormData({ ...formData, lastPrice: '0' })}
                                      className="text-[8px] font-bold text-indigo-500 uppercase hover:underline"
                                    >
                                      Edit Manually
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* MANUAL ASSETS: PROPERTY, GOLD, OTHERS */}
                      {(selectedCategory === 'Real Estate' || selectedCategory === 'Gold' || selectedCategory === 'Others') && (
                        <>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-gray-700">
                              {selectedCategory === 'Real Estate' ? 'Property Name / Address' : 'Asset Name'}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={
                                selectedCategory === 'Real Estate' ? 'e.g. Downtown Apartment, 2BHK Mumbai' :
                                selectedCategory === 'Gold' ? 'e.g. 24K Gold Bar, Jewelry' :
                                'e.g. Private Equity, Collectibles'
                              }
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={formData.assetName}
                              onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Purchase Value</label>
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                              <input
                                type="number"
                                required
                                step="any"
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.investedAmount}
                                onChange={(e) => setFormData({ ...formData, investedAmount: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Current Estimate</label>
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                              <input
                                type="number"
                                required
                                step="any"
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.currentValue}
                                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                              />
                            </div>
                          </div>

                          {selectedCategory === 'Gold' && (
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-bold text-gray-700">Weight (Grams) - Optional</label>
                              <input
                                type="number"
                                step="any"
                                placeholder="e.g. 10.5"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              />
                            </div>
                          )}

                          {/* P/L Summary for Manual Assets */}
                          {Number(formData.investedAmount) > 0 && Number(formData.currentValue) > 0 && (
                            <div className="md:col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Est. Profit/Loss</p>
                                <p className={`text-lg font-black ${Number(formData.currentValue) >= Number(formData.investedAmount) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  <CurrencyDisplay value={Number(formData.currentValue) - Number(formData.investedAmount)} />
                                </p>
                              </div>
                              <div className={`px-4 py-1 rounded-full text-xs font-black ${(Number(formData.currentValue) / Number(formData.investedAmount) - 1) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {((Number(formData.currentValue) / Number(formData.investedAmount) - 1) * 100).toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex gap-3">
                      <Button 
                        variant="outline" 
                        fullWidth 
                        type="button" 
                        onClick={() => editingAssetId ? setIsModalOpen(false) : setModalStep('category')}
                      >
                        {editingAssetId ? 'Cancel' : 'Back'}
                      </Button>
                      <Button type="submit" loading={isSubmitting} fullWidth>
                        {editingAssetId ? 'Update Asset' : 'Add to Portfolio'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) System */}
      <AnimatePresence>
        {!isModalOpen && !isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              bottom: isNavVisible 
                ? `calc(${NAVBAR_HEIGHT + FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))` 
                : `calc(${FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))`
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed right-6 md:right-8 z-50 flex flex-col items-end"
          >
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap relative"
                >
                  Manage Portfolio
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Menu Popup */}
            <AnimatePresence>
              {isFABMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                        setIsFABMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl group transition-all"
                    >
                      <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Add Asset</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">New investment</p>
                      </div>
                    </button>
                    
                    <button
                       onClick={() => {
                        refreshAllPrices();
                        setIsFABMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl group transition-all"
                    >
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Refresh Prices</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Update market value</p>
                      </div>
                    </button>

                    <button
                      disabled
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl group transition-all opacity-40 cursor-not-allowed"
                    >
                      <div className="p-2 bg-gray-100 rounded-xl text-gray-400">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Import Portfolio</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Coming soon</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
              onClick={() => {
                setIsFABMenuOpen(!isFABMenuOpen);
                setShowTooltip(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFABMenuOpen ? 'bg-gray-900 rotate-45' : 'bg-gradient-to-r from-[#6B66FE] to-[#6334FD] shadow-indigo-200'}`}
            >
              <Plus className="w-8 h-8 text-white" />
              {!isFABMenuOpen && (
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity
                  }}
                  className="absolute inset-0 bg-white/20 rounded-full blur-sm"
                />
              )}
            </motion.button>
            
            {/* Overlay to close menu */}
            {isFABMenuOpen && (
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setIsFABMenuOpen(false)} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h2>
              <p className="text-gray-500 mb-8">
                This will permanently delete <span className="font-bold text-gray-900">{assetToDelete?.assetName}</span> from your portfolio. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  loading={isDeleting}
                  onClick={confirmDelete}
                >
                  Delete Asset
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
