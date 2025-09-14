import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Production DSN - must be configured in environment variables
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      maskAllInputs: true,

      // Block sensitive selectors
      block: ['.sentry-block'],

      // Ignore specific selectors
      ignore: ['.sentry-ignore'],
    }),
  ],

  // Trace propagation targets for performance monitoring
  tracePropagationTargets: [
    'vocilia.com',
    'business.vocilia.com',
    'admin.vocilia.com',
    'ervnxnbxsaaeakbvwieh.supabase.co',
    /^\//,
  ],

  // Filtering
  beforeSend(event, hint) {
    // Filter out non-error events in development
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null;
    }

    // Filter out specific errors
    const error = hint.originalException;

    // Ignore network errors that are expected
    if (error && error instanceof Error) {
      if (error.message?.includes('NetworkError') ||
          error.message?.includes('Failed to fetch')) {
        return null;
      }
    }

    // Remove sensitive data
    if (event.request) {
      // Remove auth headers
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Remove sensitive query params
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string.replace(
          /token=[^&]+/g,
          'token=[REDACTED]'
        );
      }
    }

    // Add user context
    if (typeof window !== 'undefined') {
      const platform = window.location.hostname;
      event.tags = {
        ...event.tags,
        platform: platform.includes('business.') ? 'business' :
                  platform.includes('admin.') ? 'admin' : 'customer',
      };
    }

    return event;
  },

  // Error boundaries
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }

    // Sanitize data in breadcrumbs
    if (breadcrumb.data) {
      // Remove sensitive data from breadcrumb
      const sensitiveKeys = ['password', 'token', 'api_key', 'secret'];
      sensitiveKeys.forEach(key => {
        if (breadcrumb.data && breadcrumb.data[key]) {
          breadcrumb.data[key] = '[REDACTED]';
        }
      });
    }

    return breadcrumb;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',

    // Network errors
    'NetworkError',
    'Failed to fetch',

    // User-caused errors
    'User cancelled',
    'user cancelled',

    // Known third-party errors
    'Script error',
    'Network request failed',
  ],

  // Allowed domains for error reporting
  allowUrls: [
    'https://vocilia.com',
    'https://business.vocilia.com',
    'https://admin.vocilia.com',
    'https://*.vocilia.com',
  ],

  // Deny list for third-party scripts
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,

    // Other common third-party sources
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /facebook\.com/i,
  ],
});