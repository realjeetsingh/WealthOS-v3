import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

const NotificationSettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [expenseAlerts, setExpenseAlerts] = useState(userProfile?.emailAlerts ?? true);
  const [budgetAlerts, setBudgetAlerts] = useState(userProfile?.budgetAlerts ?? true);
  const [smartSync, setSmartSync] = useState(userProfile?.notificationSyncEnabled ?? false);
  const [investmentAlerts, setInvestmentAlerts] = useState(userProfile?.investmentAlerts ?? false);

  useEffect(() => {
    if (userProfile) {
      setExpenseAlerts(userProfile.emailAlerts ?? true);
      setBudgetAlerts(userProfile.budgetAlerts ?? true);
      setSmartSync(userProfile.notificationSyncEnabled ?? false);
      setInvestmentAlerts(userProfile.investmentAlerts ?? false);
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailAlerts: expenseAlerts,
        budgetAlerts: budgetAlerts,
        notificationSyncEnabled: smartSync,
        investmentAlerts: investmentAlerts
      });
      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error("Error saving notifications:", error);
      toast.error('Failed to save settings');
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
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="space-y-6">
          <Toggle 
            label="Expense alerts" 
            description="Get notified when you record a large expense"
            enabled={expenseAlerts}
            onChange={setExpenseAlerts}
          />
          <Toggle 
            label="Budget alerts" 
            description="Receive warnings when you approach budget limits"
            enabled={budgetAlerts}
            onChange={setBudgetAlerts}
          />
          <Toggle 
            label="Smart Sync Intelligence" 
            description="Automatically track transactions from Android notifications"
            enabled={smartSync}
            onChange={setSmartSync}
          />
          <Toggle 
            label="Investment alerts" 
            description="Real-time updates on your portfolio performance"
            enabled={investmentAlerts}
            onChange={setInvestmentAlerts}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveChanges} 
            loading={isUpdating}
            icon={<Check className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
