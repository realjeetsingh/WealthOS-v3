import { analytics, logEvent } from '../firebase';

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
      console.log(`[Analytics] Tracked: ${eventName}`, eventParams || '');
    } catch (error) {
      console.error(`[Analytics] Error tracking ${eventName}:`, error);
    }
  }
};

export const reportError = (error: any, context?: string) => {
  if (analytics) {
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      
      logEvent(analytics, 'exception', {
        description: errorMsg,
        fatal: false,
        context: context,
        stack_trace: stack
      });
      console.error(`[Crashlytics] Logged Error in ${context}:`, errorMsg);
    } catch (e) {
      console.error(`[Analytics] Error reporting error:`, e);
    }
  }
};

export const AnalyticsEvents = {
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TRANSACTION_ADDED: 'transaction_added',
  TRANSACTION_SYNC_ERROR: 'transaction_sync_error',
  GOAL_CREATED: 'goal_created',
  AI_CHAT_OPENED: 'ai_chat_opened',
  AI_CHAT_REQUEST: 'ai_chat_request',
  AI_CHAT_RESPONSE_FAILURE: 'ai_chat_response_failure',
  PREMIUM_POPUP_OPENED: 'premium_popup_opened',
  SUBSCRIPTION_STARTED: 'subscription_started',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  PORTFOLIO_SYNC_FAILURE: 'portfolio_sync_failure',
  API_FAILURE: 'api_failure',
  LOGIN_SUCCESS: 'login_success',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;
