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
  ShieldCheck,
  Info,
  BrainCircuit,
  Zap
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
  Timestamp, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PortfolioAsset } from '../types';
import { formatCurrency } from '../lib/formatCurrency';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'Stocks', label: 'Stocks / Shares', icon: Activity },
  { id: 'Crypto', label: 'Crypto', icon: Coins },
  { id: 'Real Estate', label: 'Real Estate', icon: Home },
  { id: 'Bonds', label: 'Bonds', icon: FileText },
  { id: 'Gold', label: 'Gold / Physical', icon: Gem },
] as const;

type Category = typeof CATEGORIES[number]['id'];

export default function Portfolio() {
  const { user, userProfile } = useAuth();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Stocks');
  
  // Form State
  const [formData, setFormData] = useState({
    assetName: '',
    investedAmount: '',
    currentValue: '',
    quantity: '',
    buyPrice: '',
    investmentDate: new Date().toISOString().split('T')[0],
    coinName: '',
    propertyName: '',
    rentalIncome: '',
    bondName: '',
    interestRate: '',
    maturityDate: '',
    assetType: '',
    weight: ''
  });

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
    }, (error) => {
      console.error('Portfolio fetch error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const metadata: any = {};
      
      if (selectedCategory === 'Stocks') {
        metadata.quantity = Number(formData.quantity);
        metadata.buyPrice = Number(formData.buyPrice);
        metadata.investmentDate = formData.investmentDate;
      } else if (selectedCategory === 'Crypto') {
        metadata.coinName = formData.coinName;
        metadata.quantity = Number(formData.quantity);
        metadata.buyPrice = Number(formData.buyPrice);
      } else if (selectedCategory === 'Real Estate') {
        metadata.propertyName = formData.propertyName;
        metadata.rentalIncome = Number(formData.rentalIncome);
      } else if (selectedCategory === 'Bonds') {
        metadata.bondName = formData.bondName;
        metadata.interestRate = Number(formData.interestRate);
        metadata.maturityDate = formData.maturityDate;
      } else if (selectedCategory === 'Gold') {
        metadata.assetType = formData.assetType;
        metadata.weight = Number(formData.weight);
      }

      const newAsset: Omit<PortfolioAsset, 'id'> = {
        userId: user.uid,
        category: selectedCategory,
        assetName: formData.assetName || formData.coinName || formData.propertyName || formData.bondName || formData.assetType,
        investedAmount: Number(formData.investedAmount),
        currentValue: Number(formData.currentValue) || Number(formData.investedAmount),
        metadata,
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, `users/${user.uid}/portfolio`), newAsset);
      toast.success('Asset added to portfolio');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add asset');
    }
  };

  const resetForm = () => {
    setFormData({
      assetName: '',
      investedAmount: '',
      currentValue: '',
      quantity: '',
      buyPrice: '',
      investmentDate: new Date().toISOString().split('T')[0],
      coinName: '',
      propertyName: '',
      rentalIncome: '',
      bondName: '',
      interestRate: '',
      maturityDate: '',
      assetType: '',
      weight: ''
    });
    setSelectedCategory('Stocks');
  };

  const userCurrency = userProfile?.currency || 'INR';

  const totalInvested = assets.reduce((sum, a) => sum + a.investedAmount, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

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
           cat.id === 'Bonds' ? '#6366F1' : '#EC4899'
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Portfolio</h1>
          <p className="text-gray-500 mt-1">Track and manage your diverse investments in one place.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Add Asset
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Invested */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Invested</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested, userCurrency)}</h3>
            </div>
          </div>
        </div>

        {/* Current Value */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <PieChartIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Value</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentValue, userCurrency)}</h3>
            </div>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalGainLoss >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              {totalGainLoss >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-rose-600" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Profit/Loss</p>
              <h3 className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss, userCurrency)}
              </h3>
            </div>
          </div>
        </div>

        {/* Return % */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalGainLoss >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <Activity className={`w-6 h-6 ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Return %</p>
              <h3 className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Visualization */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
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
                    formatter={(value: number) => formatCurrency(value, userCurrency)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-gray-600">{value}</span>}
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
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
                    className={`p-4 rounded-2xl border ${insight.color} flex gap-4`}
                  >
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs opacity-80 leading-relaxed">{insight.message}</p>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Asset List</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invested</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Value</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading assets...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Briefcase className="w-12 h-12 text-gray-200" />
                      <p className="text-gray-500 font-medium">No assets in your portfolio yet.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="text-indigo-600 font-bold hover:underline mt-2"
                      >
                        Add your first asset
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const profit = asset.currentValue - asset.investedAmount;
                  const profitPercentage = asset.investedAmount > 0 ? (profit / asset.investedAmount) * 100 : 0;
                  const CategoryIcon = CATEGORIES.find(c => c.id === asset.category)?.icon || Activity;

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                            <CategoryIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{asset.assetName}</p>
                            <p className="text-xs text-gray-500">
                              {asset.category === 'Stocks' && `${asset.metadata.quantity} shares`}
                              {asset.category === 'Crypto' && `${asset.metadata.quantity} units`}
                              {asset.category === 'Gold' && `${asset.metadata.weight}g`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(asset.investedAmount, userCurrency)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(asset.currentValue, userCurrency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`flex flex-col items-end`}>
                          <span className={`text-sm font-bold flex items-center gap-1 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {profit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, userCurrency)}
                          </span>
                          <span className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profitPercentage.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Asset</h2>
                  <p className="text-sm text-gray-500">Enter the details of your investment.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-6 space-y-6">
                {/* Category Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Asset Category</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                              : 'border-gray-100 hover:border-gray-200 text-gray-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{cat.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dynamic Fields based on Category */}
                  {selectedCategory === 'Stocks' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Stock Name / Symbol</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Reliance, AAPL"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.assetName}
                          onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Quantity</label>
                        <input
                          type="number"
                          required
                          step="any"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Buy Price</label>
                        <input
                          type="number"
                          required
                          step="any"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.buyPrice}
                          onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedCategory === 'Crypto' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Coin Name / Symbol</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BTC, ETH"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.coinName}
                          onChange={(e) => setFormData({ ...formData, coinName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Quantity</label>
                        <input
                          type="number"
                          required
                          step="any"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Buy Price</label>
                        <input
                          type="number"
                          required
                          step="any"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.buyPrice}
                          onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedCategory === 'Real Estate' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Property Name / Address</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Downtown Apartment"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.propertyName}
                          onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Rental Income (Monthly)</label>
                        <input
                          type="number"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.rentalIncome}
                          onChange={(e) => setFormData({ ...formData, rentalIncome: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedCategory === 'Bonds' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Bond Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Govt Bond 2030"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.bondName}
                          onChange={(e) => setFormData({ ...formData, bondName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Interest Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.interestRate}
                          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Maturity Date</label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.maturityDate}
                          onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedCategory === 'Gold' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Asset Type</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 24K Gold, Silver Bar"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.assetType}
                          onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Weight / Quantity</label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {/* Common Fields */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Invested Amount</label>
                    <input
                      type="number"
                      required
                      step="any"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.investedAmount}
                      onChange={(e) => setFormData({ ...formData, investedAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Current Value</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Optional"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.currentValue}
                      onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all border border-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    Save Asset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
