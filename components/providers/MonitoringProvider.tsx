'use client';

import { useEffect } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import * as Sentry from '@sentry/nextjs';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  // Initialize performance monitoring
  usePerformanceMonitoring();

  useEffect(() => {
    // Set user context for error tracking
    const setUserContext = () => {
      // Get platform from hostname
      const hostname = window.location.hostname;
      let platform = 'customer';

      if (hostname.includes('business.')) {
        platform = 'business';
      } else if (hostname.includes('admin.')) {
        platform = 'admin';
      }

      // Set platform context
      Sentry.setContext('platform', {
        type: platform,
        hostname,
        url: window.location.href,
      });

      // Check for user session (if authenticated)
      const userSession = localStorage.getItem('user_session');
      if (userSession) {
        try {
          const user = JSON.parse(userSession);
          Sentry.setUser({
            id: user.id,
            email: user.email,
            platform,
          });
        } catch (error) {
          console.error('Failed to parse user session:', error);
        }
      }
    };

    setUserContext();

    // Track route changes for better error context
    const handleRouteChange = () => {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${window.location.pathname}`,
        level: 'info',
        data: {
          from: document.referrer,
          to: window.location.href,
        },
      });
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Track online/offline status
    const handleOnline = () => {
      Sentry.addBreadcrumb({
        category: 'network',
        message: 'Connection restored',
        level: 'info',
      });
    };

    const handleOffline = () => {
      Sentry.addBreadcrumb({
        category: 'network',
        message: 'Connection lost',
        level: 'warning',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track uncaught promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      Sentry.captureException(event.reason, {
        tags: {
          type: 'unhandled_promise_rejection',
        },
        contexts: {
          promise: {
            reason: event.reason,
          },
        },
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup listeners
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Monitor console errors
  useEffect(() => {
    const originalError = console.error;

    console.error = (...args: any[]) => {
      // Call original console.error
      originalError.apply(console, args);

      // Capture to Sentry if it's a significant error
      const errorMessage = args.join(' ');

      // Filter out known non-critical errors
      const ignoredPatterns = [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection',
        'Network request failed',
      ];

      const shouldIgnore = ignoredPatterns.some(pattern =>
        errorMessage.includes(pattern)
      );

      if (!shouldIgnore) {
        Sentry.captureMessage(`Console Error: ${errorMessage}`, {
          level: 'error',
          tags: {
            source: 'console',
          },
        });
      }
    };

    // Cleanup
    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}