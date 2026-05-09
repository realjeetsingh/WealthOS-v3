import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Shield, 
  Trash2, 
  RefreshCw, 
  Download, 
  ArrowLeft,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import Button from '../../components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';

const PrivacySettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Delete Account State
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Data State
  const [isResettingData, setIsResettingData] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
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

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const isEmailUser = user.providerData.some(p => p.providerId === 'password');
      if (isEmailUser) {
        if (!deletePassword) {
          toast.error('Please enter your password to confirm deletion');
          setIsDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      await deleteUser(user);
      
      toast.success('Account deleted successfully');
      navigate('/auth/signup');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Incorrect password. Please try again.');
      } else {
        console.error("Error deleting account:", error);
        if (error.code === 'auth/requires-recent-login') {
          toast.error('Please sign out and sign in again to delete your account');
        } else {
          toast.error('Failed to delete account. Please try again later.');
        }
      }
    } finally {
      setIsDeleting(false);
      setIsDeletingAccount(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Data & Privacy</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Download className="w-6 h-6" />
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

          <div className="flex items-center justify-between p-6 bg-red-50/30 rounded-2xl border border-red-100">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                <RefreshCw className="w-6 h-6" />
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

          <div className="flex items-center justify-between p-6 bg-red-50/30 rounded-2xl border border-red-100">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                <Trash2 className="w-6 h-6" />
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

        <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/privacy')}
              className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate('/terms')}
              className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              Terms of Service
            </button>
          </div>
          <p className="text-[10px] font-bold text-gray-300">WealthOS v1.2.0-beta</p>
        </div>
      </div>

      <AnimatePresence>
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
              <p className="text-gray-500 mb-6 leading-relaxed">
                This action is <span className="font-bold text-red-600 uppercase">irreversible</span>. All your data will be permanently removed.
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                {user?.providerData.some(p => p.providerId === 'password') && (
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type={showDeletePassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {showDeletePassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-3 pt-2">
                  <Button variant="danger" type="submit" fullWidth size="lg" loading={isDeleting}>
                    Delete Permanently
                  </Button>
                  <Button variant="secondary" type="button" fullWidth size="lg" onClick={() => {
                    setIsDeletingAccount(false);
                    setDeletePassword('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrivacySettings;
