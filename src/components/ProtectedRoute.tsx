import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white p-6">
        <div className="flex flex-col items-center space-y-6 animate-pulse">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150"></div>
            <img
              src="/logo.png"
              alt="WealthOS Logo"
              width={80}
              height={80}
              className="relative z-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col items-center space-y-2 text-center">
            <h1 className="text-3xl font-black tracking-tighter">WealthOS</h1>
            <p className="text-indigo-200 text-sm font-medium tracking-wide">Securing your financial future...</p>
          </div>
          <div className="pt-4">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If user is logged in but profile is missing or onboarding is not completed, redirect to onboarding
  // We check location.pathname to avoid infinite redirect
  const isOnboardingPage = location.pathname === '/onboarding';
  const isRevealPage = location.pathname === '/financial-reveal';
  
  if (user && !isOnboardingPage) {
    if (!userProfile || !userProfile.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    if (!isRevealPage && !userProfile.financialRevealSeen) {
      return <Navigate to="/financial-reveal" replace />;
    }
  }

  // If user HAS completed onboarding and seen the reveal, don't let them go back to onboarding or reveal page
  if (userProfile?.onboardingCompleted && userProfile?.financialRevealSeen && (isOnboardingPage || isRevealPage)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
