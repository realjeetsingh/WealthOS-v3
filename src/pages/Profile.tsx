import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  HelpCircle, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Trophy,
  X,
  Check
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Profile: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const helpLinks = [
    { label: 'Help Center', icon: HelpCircle, href: '#' },
    { label: 'Security Guide', icon: ShieldCheck, href: '#' },
    { label: 'FAQ', icon: ExternalLink, href: '#' },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: newName.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-indigo-600 to-violet-600 relative">
          <img 
            src="https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1000" 
            alt="Cover" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-12 mb-6">
            <div className="w-32 h-32 bg-white rounded-3xl p-1 shadow-xl relative z-10">
              <div className="w-full h-full bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                <UserIcon className="w-16 h-16 text-indigo-600" />
              </div>
            </div>
            <div className="mt-6 sm:mt-0 flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{userProfile?.name || 'WealthOS User'}</h1>
              <p className="text-gray-500 font-medium flex items-center mt-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Active Member
              </p>
            </div>
            <div className="mt-6 sm:mt-0">
              <button 
                onClick={() => {
                  setNewName(userProfile?.name || '');
                  setIsEditing(true);
                }}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-medium"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || !newName.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-gray-900 font-semibold">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-gray-900 font-semibold">
                    {userProfile?.createdAt?.toDate().toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Placeholder */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase">Coming Soon</span>
            </div>
            <div className="flex space-x-4 opacity-40 grayscale">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Help & Support</h2>
            <div className="space-y-3">
              {helpLinks.map((link) => (
                <a 
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <link.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Tip */}
          <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
              <p className="text-indigo-200 text-sm leading-relaxed">
                Regularly reviewing your insights helps you identify saving opportunities faster.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
