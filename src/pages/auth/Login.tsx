import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { getAuthErrorMessage } from '../../utils/authErrorMap';
import { doc, serverTimestamp } from 'firebase/firestore';
import { resolveUserSession } from '../../services/authService';
import { AlertCircle, Lock, Mail, CheckCircle2, TrendingUp, BrainCircuit, ShieldCheck, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const onEmailChange = (val: string) => {
    setEmail(val);
    if (error) setError(null);
  };

  const onPasswordChange = (val: string) => {
    setPassword(val);
    if (error) setError(null);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Ensure user document exists and handle identity mapping securely
      await resolveUserSession(user);

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // TASK 1: EMPTY FIELDS
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    // TASK 6: RATE LIMIT (Local check)
    if (failedAttempts >= 5) {
      setError("Too many attempts. Please try again after some time.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setFailedAttempts(0); // Reset on success
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      setFailedAttempts(prev => prev + 1);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col md:flex-row bg-white selection:bg-indigo-100"
    >
      {/* Left Side — Branding & Value Prop */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-16 flex-col justify-between relative overflow-hidden">
        {/* Decorative background elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"
        ></motion.div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -5, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-indigo-400 opacity-10 rounded-full blur-3xl"
        ></motion.div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-14">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150"></div>
              <Logo size={52} className="relative z-10" />
            </div>
            <span className="text-white font-black text-3xl tracking-tighter">WealthOS</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Take Control of Your <span className="text-indigo-200">Financial Future</span>
            </h1>
            <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
              Track, analyze, and grow your wealth with AI-powered insights.
            </p>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-indigo-200" />
                </div>
                <span className="text-lg font-medium text-white">Real-time financial tracking</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BrainCircuit className="w-6 h-6 text-indigo-200" />
                </div>
                <span className="text-lg font-medium text-white">Smart AI insights</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-indigo-200" />
                </div>
                <span className="text-lg font-medium text-white">10-year wealth projections</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium">
            © 2026 WealthOS. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-start p-8 md:p-16 pt-12 pb-10 bg-gray-50 relative min-h-screen overflow-y-auto">
        {/* Subtle background noise/gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md w-full relative z-10 my-auto"
        >
          <div className="md:hidden flex items-center space-x-3 mb-10 justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-150"></div>
              <Logo size={44} className="relative z-10" />
            </div>
            <span className="text-gray-900 font-black text-2xl tracking-tighter">WealthOS</span>
          </div>

          <div className="mb-12">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
              Welcome
            </h2>
            <p className="text-gray-600">
              Welcome to the future of your finances
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              {error.includes("create an account") && (
                <div className="ml-8">
                  <Link to="/auth/signup" className="text-xs font-bold text-red-800 hover:underline flex items-center gap-1">
                    Join WealthOS now <Sparkles className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`appearance-none relative block w-full px-10 py-3.5 border ${error?.toLowerCase().includes("email") ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:z-10 sm:text-sm transition-all bg-white hover:bg-gray-50/50 hover:border-gray-400 shadow-sm`}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`appearance-none relative block w-full px-10 py-3.5 border ${error?.toLowerCase().includes("password") ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:z-10 sm:text-sm transition-all bg-white hover:bg-gray-50/50 hover:border-gray-400 shadow-sm`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-bold text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
              >
                Access Dashboard
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                Create one for free
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="px-4 bg-gray-50 text-gray-400 font-bold">OR</span>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={handleGoogleSignIn}
              loading={loading}
              icon={<GoogleIcon />}
            >
              Continue with Google
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="mt-8 space-y-3">
            {[
              { icon: Lock, text: "Your financial data is encrypted and secure" },
              { icon: Sparkles, text: "Real-time insights powered by AI" },
              { icon: TrendingUp, text: "Built to help you grow your wealth" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + (i * 0.1) }}
                className="flex items-center justify-center space-x-2 text-gray-500 text-xs sm:text-sm"
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-gray-700">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;
