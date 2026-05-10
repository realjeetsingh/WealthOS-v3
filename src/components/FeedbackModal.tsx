import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, Star, Bug, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ModalShell from './ModalShell';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState<'feedback' | 'bug' | 'feature'>('feedback');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === 'submitting' || !user) return;

    setStatus('submitting');
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        type,
        message,
        rating: type === 'feedback' ? rating : null,
        timestamp: serverTimestamp(),
        appVersion: '1.2.0-beta'
      });
      
      trackEvent(AnalyticsEvents.FEEDBACK_SUBMITTED, { type });
      setStatus('success');
      
      // Reset form after delay
      setTimeout(() => {
        if (status === 'success') {
          setMessage('');
          setType('feedback');
          setRating(5);
          setStatus('idle');
          onClose();
        }
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setStatus('error');
      try {
        handleFirestoreError(error, OperationType.CREATE, 'feedback');
      } catch (err) {
        // Error is logged to console and thrown again, which is handled here
      }
    }
  };

  if (status === 'success') {
    return (
      <ModalShell isOpen={isOpen} onClose={onClose} showClose={false}>
        <div className="py-12 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Feedback Received!</h3>
          <p className="text-gray-500 font-medium max-w-xs mx-auto">
            Thank you for helping us build the future of wealth management.
          </p>
          <button
            onClick={onClose}
            className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Beta Feedback"
      maxWidth="md"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <p className="text-gray-500 text-sm font-medium">Help us shape WealthOS</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2">
          {(['feedback', 'bug', 'feature'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={status === 'submitting'}
              onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-1 ${
                type === t 
                  ? 'bg-gray-900 text-white border-gray-900' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
              }`}
            >
              {t === 'bug' && <Bug className="w-3 h-3" />}
              {t === 'feature' && <Zap className="w-3 h-3 text-amber-400" />}
              {t}
            </button>
          ))}
        </div>

        {type === 'feedback' && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate your experience</p>
            <div className="flex justify-between bg-gray-50 p-4 rounded-2xl">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={status === 'submitting'}
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
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Message</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'submitting'}
            placeholder={
              type === 'bug' 
                ? "Describe what happened..." 
                : type === 'feature' 
                  ? "What would you like to see?" 
                  : "Tell us what you think..."
            }
            className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 outline-none transition-all font-medium text-sm resize-none disabled:opacity-50"
            required
            maxLength={2000}
          />
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            Failed to send feedback. Please try again.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting' || !message.trim()}
          className="w-full py-4 bg-[#6334FD] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {status === 'submitting' ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              {status === 'error' ? 'Retry Submission' : 'Submit Feedback'}
            </>
          )}
        </button>
      </form>
    </ModalShell>
  );
};

export default FeedbackModal;
