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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg font-medium text-gray-700">Loading...</span>
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
  
  if (user && !isOnboardingPage) {
    if (!userProfile || !userProfile.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // If user HAS completed onboarding, don't let them go back to onboarding page
  if (userProfile?.onboardingCompleted && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
