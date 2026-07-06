/**
 * Maps Firebase Auth error codes to user-friendly, production-safe messages.
 * This prevents internal infrastructure details from being exposed to the end user.
 */

export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  
  // Log detailed error for developers in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Auth Error Detail]:', error);
  }

  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'The email address you entered is not valid.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account exists with this email address.',
    'auth/wrong-password': 'The password you entered is incorrect.',
    'auth/email-already-in-use': 'An account already exists with this email address.',
    'auth/weak-password': 'Your password is too weak. Please use at least 6 characters.',
    'auth/operation-not-allowed': 'This sign-in method is currently disabled.',
    'auth/popup-closed-by-user': 'The sign-in popup was closed before completion.',
    'auth/popup-blocked': 'Sign-in popup was blocked by your browser.',
    'auth/network-request-failed': 'A network error occurred. Please check your connection and try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/requires-recent-login': 'For security, please sign in again before performing this action.',
    'auth/unauthorized-domain': 'Google sign-in is temporarily unavailable for this domain.',
    'auth/internal-error': 'An internal error occurred. Please try again later.',
    'auth/invalid-credential': 'Invalid credentials provided. Please try again.',
  };

  return errorMap[code] || 'An unexpected authentication error occurred. Please try again.';
};
