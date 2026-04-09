import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Globe, 
  Languages, 
  Moon, 
  ArrowLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CURRENCIES } from '../../lib/currency';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

const PreferencesSettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [currency, setCurrency] = useState(userProfile?.currency || 'INR');

  useEffect(() => {
    if (userProfile) {
      setCurrency(userProfile.currency || 'INR');
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currency
      });
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error('Failed to save preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  const Toggle = ({ label, description, enabled, onChange, disabled = false }: { label: string, description?: string, enabled: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <div className={`flex items-center justify-between py-4 ${disabled ? 'opacity-50 grayscale' : ''}`}>
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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">App Preferences</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b border-gray-50">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900">Default Currency</p>
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

          <div className="flex items-center justify-between py-4 border-b border-gray-50 opacity-50 grayscale cursor-not-allowed">
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

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveChanges} 
            loading={isUpdating}
            icon={<Check className="w-4 h-4" />}
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
