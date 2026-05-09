import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, Star, Bug, Zap } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { trackEvent, AnalyticsEvents } from '../services/analytics';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState<'feedback' | 'bug' | 'feature'>('feedback');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid,
        userEmail: user?.email,
        type,
        message,
        rating: type === 'feedback' ? rating : null,
        timestamp: serverTimestamp(),
        appVersion: '1.0.0-beta'
      });
      
      trackEvent(AnalyticsEvents.FEEDBACK_SUBMITTED, { type });
      toast.success("Thanks for your feedback! 🚀");
      setMessage('');
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Beta Feedback</h3>
                  <p className="text-gray-500 text-sm font-medium">Help us shape WealthOS</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-2">
                {(['feedback', 'bug', 'feature'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                      type === t 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {t === 'bug' && <Bug className="w-4 h-4 inline mr-2" />}
                    {t === 'feature' && <Zap className="w-4 h-4 inline mr-2 text-amber-400" />}
                    {t}
                  </button>
                ))}
              </div>

              {type === 'feedback' && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Rate your experience</p>
                  <div className="flex justify-between bg-gray-50 p-4 rounded-2xl">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          rating >= s ? 'bg-amber-100 text-amber-500' : 'bg-white text-gray-300'
                        }`}
                      >
                        <Star className={`w-6 h-6 ${rating >= s ? 'fill-amber-500' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Message</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === 'bug' 
                      ? "Describe what happened..." 
                      : type === 'feature' 
                        ? "What would you like to see?" 
                        : "Tell us what you think..."
                  }
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 outline-none transition-all font-medium text-sm resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full py-4 bg-[#6334FD] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;
