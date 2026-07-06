/**
 * Centralized Error Mapper for WealthOS
 * Resolves complex technical exceptions (Firebase Auth, Firestore, API, Network timeouts)
 * into friendly, descriptive user messages, keeping system metadata, stack traces, and typescript
 * errors fully hidden.
 */

export function mapError(error: any): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  // If error is already a friendly string, check if it contains common patterns
  let message = "";
  let code = "";

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || "";
    // Check for nested properties or codes
    code = (error as any).code || "";
  } else if (typeof error === 'object') {
    message = error.message || error.error || JSON.stringify(error);
    code = error.code || "";
  }

  const normalizedMessage = message.toLowerCase();
  const normalizedCode = String(code).toLowerCase();

  // 1. Firebase Authentication Error Codes
  if (normalizedCode.includes('auth/user-not-found') || normalizedMessage.includes('user-not-found')) {
    return "No account exists with this email address. Please sign up first.";
  }
  if (normalizedCode.includes('auth/wrong-password') || normalizedMessage.includes('wrong-password') || normalizedMessage.includes('invalid-credential')) {
    return "Incorrect password or email. Please verify your credentials and try again.";
  }
  if (normalizedCode.includes('auth/email-already-in-use') || normalizedMessage.includes('email-already-in-use')) {
    return "An account with this email address already exists. Try signing in.";
  }
  if (normalizedCode.includes('auth/weak-password') || normalizedMessage.includes('weak-password')) {
    return "Your password is too weak. Please use at least 6 characters with numbers or symbols.";
  }
  if (normalizedCode.includes('auth/too-many-requests') || normalizedMessage.includes('too-many-requests')) {
    return "Too many failed attempts. Your account has been temporarily locked for security. Please try again shortly.";
  }
  if (normalizedCode.includes('auth/invalid-email') || normalizedMessage.includes('invalid-email')) {
    return "Please enter a valid email address.";
  }
  if (normalizedCode.includes('auth/network-request-failed') || normalizedMessage.includes('network-request-failed')) {
    return "Network error. Please check your internet connection and try again.";
  }

  // 2. Firestore / DB Errors
  if (normalizedMessage.includes('insufficient permissions') || normalizedMessage.includes('permission-denied')) {
    return "Your session has expired or you do not have permission to access this resource. Please sign out and sign back in.";
  }
  if (normalizedMessage.includes('quota exceeded') || normalizedMessage.includes('resource-exhausted')) {
    return "We are experiencing unusually high traffic. Our daily limits have been fully occupied. Please try again tomorrow.";
  }
  if (normalizedMessage.includes('not-found') || normalizedMessage.includes('document not found')) {
    return "The requested record could not be found. It may have been deleted or moved.";
  }

  // 3. Network / Timeout Errors
  if (normalizedMessage.includes('offline') || normalizedMessage.includes('internet') || normalizedMessage.includes('failed to fetch') || normalizedMessage.includes('network error') || normalizedMessage.includes('load failed')) {
    return "Unable to establish a connection. You seem to be offline. Please check your internet and try again.";
  }
  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('exceeded time') || normalizedMessage.includes('deadline-exceeded')) {
    return "The request took too long to respond. Please check your network and try again.";
  }

  // 4. Default safe response (no stack trace, no undefined values, no file paths)
  return "An unexpected connection issue occurred. We're on it, please try reloading or updating.";
}
