import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

// Web Vitals thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  // Interaction to Next Paint
  INP: {
    good: 200,
    needsImprovement: 500,
  },
  // Cumulative Layout Shift
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  // First Contentful Paint
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  // Time to First Byte
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
};

// Performance rating
type PerformanceRating = 'good' | 'needs-improvement' | 'poor';

// Get performance rating for a metric
function getPerformanceRating(
  metricName: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): PerformanceRating {
  const thresholds = PERFORMANCE_THRESHOLDS[metricName];

  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

// Report Web Vitals to Sentry
export function reportWebVitalsToSentry(metric: any) {
  const { name, value, id, entries } = metric;

  // Get the rating for this metric
  const rating = getPerformanceRating(
    name as keyof typeof PERFORMANCE_THRESHOLDS,
    value
  );

  // Add measurements to the current scope
  Sentry.getCurrentScope().setContext('webvital', {
    name,
    value,
    rating,
    unit: name === 'CLS' ? '' : 'millisecond',
  });

  // Send custom event to Sentry for tracking
  Sentry.captureMessage(`Web Vital: ${name}`, {
    level: rating === 'poor' ? 'warning' : 'info',
    tags: {
      webvital: true,
      metric: name,
      rating,
      platform: getPlatform(),
    },
    contexts: {
      webvital: {
        name,
        value,
        rating,
        id,
        navigationType: getNavigationType(),
        url: window.location.href,
      },
    },
    extra: {
      entries: entries?.map((entry: any) => ({
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
      })),
    },
  });

  // Also send to analytics if needed
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      metric_id: id,
      metric_value: value,
      metric_rating: rating,
    });
  }
}

// Initialize Web Vitals reporting
export function initWebVitals() {
  if (typeof window !== 'undefined') {
    // Report each metric
    onCLS(reportWebVitalsToSentry);
    onINP(reportWebVitalsToSentry);
    onFCP(reportWebVitalsToSentry);
    onLCP(reportWebVitalsToSentry);
    onTTFB(reportWebVitalsToSentry);

    // Also track custom metrics
    trackCustomMetrics();
  }
}

// Get platform type
function getPlatform(): string {
  const hostname = window.location.hostname;

  if (hostname.includes('business.')) {
    return 'business';
  } else if (hostname.includes('admin.')) {
    return 'admin';
  } else {
    return 'customer';
  }
}

// Get navigation type
function getNavigationType(): string {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = (window.performance as any).navigation ||
                       (window.performance as any).getEntriesByType('navigation')[0];

    if (navigation) {
      switch (navigation.type) {
        case 0:
        case 'navigate':
          return 'navigate';
        case 1:
        case 'reload':
          return 'reload';
        case 2:
        case 'back_forward':
          return 'back_forward';
        default:
          return 'unknown';
      }
    }
  }

  return 'unknown';
}

// Track custom performance metrics
function trackCustomMetrics() {
  // Track time to interactive
  if (typeof window !== 'undefined' && window.performance) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Track long tasks
        if (entry.entryType === 'longtask') {
          Sentry.captureMessage('Long Task Detected', {
            level: 'warning',
            tags: {
              performance: true,
              platform: getPlatform(),
            },
            extra: {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            },
          });
        }

        // Track resource timing
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Alert on slow resources
          if (resourceEntry.duration > 5000) {
            Sentry.captureMessage('Slow Resource Load', {
              level: 'warning',
              tags: {
                performance: true,
                resourceType: getResourceType(resourceEntry.name),
                platform: getPlatform(),
              },
              extra: {
                url: resourceEntry.name,
                duration: resourceEntry.duration,
                transferSize: resourceEntry.transferSize,
              },
            });
          }
        }
      }
    });

    // Observe long tasks
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer.observe({ entryTypes: ['longtask'] });
    }

    // Observe resource timing
    if (PerformanceObserver.supportedEntryTypes.includes('resource')) {
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Track memory usage (Chrome only)
  if (typeof window !== 'undefined' && (window.performance as any).memory) {
    setInterval(() => {
      const memory = (window.performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      // Alert if memory usage is high
      if (usagePercent > 90) {
        Sentry.captureMessage('High Memory Usage', {
          level: 'warning',
          tags: {
            performance: true,
            platform: getPlatform(),
          },
          extra: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercent,
          },
        });
      }
    }, 30000); // Check every 30 seconds
  }
}

// Get resource type from URL
function getResourceType(url: string): string {
  if (url.includes('.js')) return 'script';
  if (url.includes('.css')) return 'stylesheet';
  if (url.includes('.jpg') || url.includes('.jpeg') ||
      url.includes('.png') || url.includes('.gif') ||
      url.includes('.webp') || url.includes('.avif')) return 'image';
  if (url.includes('.woff') || url.includes('.ttf') ||
      url.includes('.otf')) return 'font';
  if (url.includes('/api/')) return 'api';
  return 'other';
}

// Performance marks for custom timing
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(name);
  }
}

// Measure between two marks
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.measure(name, startMark, endMark);

      const measures = window.performance.getEntriesByName(name, 'measure');
      const measure = measures[measures.length - 1];

      if (measure) {
        // Report to Sentry
        Sentry.captureMessage(`Performance Measure: ${name}`, {
          level: 'info',
          tags: {
            performance: true,
            measure: true,
            platform: getPlatform(),
          },
          extra: {
            duration: measure.duration,
            startTime: measure.startTime,
          },
        });
      }
    } catch (error) {
      console.error('Performance measurement error:', error);
    }
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Initialize Web Vitals
    initWebVitals();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Flush any pending Sentry events when page is hidden
        Sentry.flush(2000);
      }
    });

    // Track unload for final metrics
    window.addEventListener('beforeunload', () => {
      // Flush any pending Sentry events
      Sentry.flush(2000);
    });
  }
}