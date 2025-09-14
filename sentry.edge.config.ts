import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Production DSN - must be configured in environment variables
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Performance Monitoring for Edge Runtime
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Edge-specific configuration
  beforeSend(event, hint) {
    // Add edge runtime context
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      region: process.env.VERCEL_REGION || 'unknown',
    };

    // Filter out non-critical errors in edge runtime
    const error = hint.originalException;
    if (error && error instanceof Error) {
      // Ignore timeout errors (edge functions have strict limits)
      if (error.message?.includes('timeout') ||
          error.message?.includes('deadline')) {
        return null;
      }

      // Ignore memory limit errors
      if (error.message?.includes('memory limit') ||
          error.message?.includes('out of memory')) {
        // Log for monitoring but don't flood Sentry
        console.error('Edge function memory limit reached:', error.message);
        return null;
      }
    }

    // Remove sensitive headers from edge requests
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
    }

    return event;
  },

  // Edge-specific breadcrumb filtering
  beforeBreadcrumb(breadcrumb) {
    // Filter out fetch breadcrumbs with sensitive data
    if (breadcrumb.category === 'fetch') {
      if (breadcrumb.data && breadcrumb.data.url) {
        // Sanitize URLs with tokens
        breadcrumb.data.url = breadcrumb.data.url
          .replace(/token=[^&]+/g, 'token=[REDACTED]')
          .replace(/key=[^&]+/g, 'key=[REDACTED]');
      }
    }

    return breadcrumb;
  },

  // Ignore common edge runtime errors
  ignoreErrors: [
    // Edge function timeouts
    'TimeoutError',
    'Deadline exceeded',

    // Memory issues
    'Out of memory',
    'Memory limit exceeded',

    // Network errors in edge
    'FetchError',
    'NetworkError',
  ],
});