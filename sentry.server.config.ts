import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Production DSN - must be configured in environment variables
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Server-specific integrations are automatically included

  // Server-side filtering
  beforeSend(event, hint) {
    // Filter out non-error events in development
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null;
    }

    // Add server context
    event.tags = {
      ...event.tags,
      runtime: 'node',
      service: 'vocilia-api',
    };

    // Remove sensitive server data
    if (event.extra) {
      const sensitiveKeys = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'DATABASE_URL',
        'RAILWAY_SERVICE_URL',
      ];

      sensitiveKeys.forEach(key => {
        if (event.extra && event.extra[key]) {
          event.extra[key] = '[REDACTED]';
        }
      });
    }

    // Filter out specific server errors
    const error = hint.originalException;
    if (error && error instanceof Error) {
      // Ignore expected database errors
      if (error.message?.includes('duplicate key value') ||
          error.message?.includes('violates foreign key constraint')) {
        // Log these for monitoring but don't send to Sentry
        console.error('Database constraint violation:', error.message);
        return null;
      }

      // Ignore rate limiting errors
      if (error.message?.includes('rate limit') ||
          error.message?.includes('too many requests')) {
        return null;
      }
    }

    return event;
  },

  // Profiling (for performance monitoring)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Server-side breadcrumb filtering
  beforeBreadcrumb(breadcrumb) {
    // Filter out database query breadcrumbs with sensitive data
    if (breadcrumb.category === 'query') {
      // Sanitize SQL queries
      if (breadcrumb.data && breadcrumb.data.query) {
        breadcrumb.data.query = breadcrumb.data.query
          .replace(/password\s*=\s*'[^']+'/gi, "password='[REDACTED]'")
          .replace(/token\s*=\s*'[^']+'/gi, "token='[REDACTED]'");
      }
    }

    // Filter out HTTP breadcrumbs with sensitive headers
    if (breadcrumb.category === 'http') {
      if (breadcrumb.data && breadcrumb.data.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          if (breadcrumb.data?.headers?.[header]) {
            breadcrumb.data.headers[header] = '[REDACTED]';
          }
        });
      }
    }

    return breadcrumb;
  },

  // Specific error patterns to ignore
  ignoreErrors: [
    // Client disconnections
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',

    // Expected errors
    'AbortError',
    'Request aborted',

    // Rate limiting
    'Too Many Requests',
    'Rate limit exceeded',
  ],

  // Transaction filtering
  beforeSendTransaction(transaction) {
    // Don't track health check endpoints
    if (transaction.transaction === 'GET /api/health') {
      return null;
    }

    // Add custom tags for better filtering
    transaction.tags = {
      ...transaction.tags,
      api_version: 'v1',
    };

    return transaction;
  },

  // Spotlight for development (shows errors in-browser during development)
  spotlight: process.env.NODE_ENV === 'development',
});