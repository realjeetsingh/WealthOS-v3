import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Globe, 
  ChevronRight, 
  Check,
  Camera,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Briefcase
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CURRENCIES } from '../../lib/currency';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const AccountSettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [currency, setCurrency] = useState(userProfile?.currency || 'INR');
  const [profession, setProfession] = useState(userProfile?.profession || 'Salaried');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setPhone(userProfile.phone || '');
      setCurrency(userProfile.currency || 'INR');
      setProfession(userProfile.profession || 'Salaried');
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        phone,
        currency,
        profession
      });
      toast.success('Account settings saved successfully');
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Failed to save settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image size should be less than 1MB for optimal performance");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { profileImage: base64String });
        toast.success('Profile picture updated!');
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('Failed to upload image');
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.uid) return;
    setUploading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { profileImage: '' });
      toast.success('Profile picture removed');
    } catch (error) {
      console.error("Remove error:", error);
      toast.error('Failed to remove image');
    } finally {
      setUploading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-md relative">
              {userProfile?.profileImage ? (
                <img src={userProfile.profileImage} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <Logo size={48} />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 flex space-x-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
                title="Change Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              {userProfile?.profileImage && (
                <button 
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Remove Photo"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Profile Image</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                placeholder="Your Name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl outline-none font-bold text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Profession</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
              >
                <option value="Salaried">Salaried</option>
                <option value="Self Employed">Self Employed</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Student">Student</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Other">Other</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Default Currency</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} - {c.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveChanges} 
            loading={isUpdating}
            icon={<Check className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default AccountSettings;
