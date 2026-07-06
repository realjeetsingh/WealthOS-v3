import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Check,
  ArrowLeft,
  X
} from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';

const SecuritySettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
      if (!user.email) {
        throw new Error('Email not found');
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else {
        console.error("Error changing password:", error);
        if (error.code === 'auth/requires-recent-login') {
          toast.error('Please sign out and sign in again to change your password');
        } else {
          toast.error(error.message || 'Failed to update password');
        }
      }
    } finally {
      setIsPasswordSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Account Password</p>
              <p className="text-xs text-gray-500">Last changed: {userProfile?.createdAt ? new Date(userProfile.createdAt.toMillis()).toLocaleDateString() : 'Recently'}</p>
            </div>
          </div>
          {user?.providerData.some(p => p.providerId === 'password') && (
            <Button variant="secondary" size="sm" onClick={() => setIsChangingPassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-gray-50">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900">Two-factor authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-50">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900">Biometric Login</p>
              <p className="text-xs text-gray-500">Use FaceID or Fingerprint to unlock the app</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
};

export default SecuritySettings;
