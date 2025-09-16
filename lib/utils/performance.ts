// Performance monitoring utilities for Customer Entry Flow
// Tracks Core Web Vitals and custom metrics for optimization

/**
 * Core Web Vitals metrics interface
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType: 'navigate' | 'reload' | 'back_forward' | 'prerender';
}

/**
 * Custom performance metrics
 */
export interface CustomMetrics {
  storeCodeValidationTime?: number;
  formInteractionTime?: number;
  apiResponseTime?: number;
  pageLoadTime?: number;
  timeToInteractive?: number;
}

/**
 * Performance data collected for analytics
 */
export interface PerformanceData {
  webVitals: Partial<Record<WebVitalsMetric['name'], WebVitalsMetric>>;
  customMetrics: CustomMetrics;
  userAgent: string;
  timestamp: number;
  url: string;
  connectionType?: string;
}

// Global performance data store
let performanceData: PerformanceData = {
  webVitals: {},
  customMetrics: {},
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  timestamp: Date.now(),
  url: typeof window !== 'undefined' ? window.location.href : ''
};

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Get connection information
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (connection) {
    performanceData.connectionType = connection.effectiveType;
  }

  // Monitor Core Web Vitals
  observeWebVitals();

  // Monitor custom metrics
  observeCustomMetrics();

  // Send data when page unloads
  window.addEventListener('beforeunload', () => {
    sendPerformanceData();
  });

  // Send data periodically (every 30 seconds)
  setInterval(() => {
    sendPerformanceData();
  }, 30000);
}

/**
 * Observe Core Web Vitals using Performance Observer
 */
function observeWebVitals() {
  if (typeof PerformanceObserver === 'undefined') return;

  // Largest Contentful Paint (LCP)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const entry = entries[entries.length - 1] as any;

      recordWebVital({
        name: 'LCP',
        value: entry.startTime,
        delta: entry.startTime,
        entries: [entry],
        id: 'lcp-' + Math.random().toString(36).substr(2, 9),
        navigationType: getNavigationType()
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observer not supported');
  }

  // First Input Delay (FID)
  try {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        recordWebVital({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          delta: entry.processingStart - entry.startTime,
          entries: [entry],
          id: 'fid-' + Math.random().toString(36).substr(2, 9),
          navigationType: getNavigationType()
        });
      });
    }).observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID observer not supported');
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      recordWebVital({
        name: 'CLS',
        value: clsValue,
        delta: clsValue,
        entries: clsEntries,
        id: 'cls-' + Math.random().toString(36).substr(2, 9),
        navigationType: getNavigationType()
      });
    }).observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS observer not supported');
  }

  // First Contentful Paint (FCP)
  try {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          recordWebVital({
            name: 'FCP',
            value: entry.startTime,
            delta: entry.startTime,
            entries: [entry],
            id: 'fcp-' + Math.random().toString(36).substr(2, 9),
            navigationType: getNavigationType()
          });
        }
      });
    }).observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('FCP observer not supported');
  }

  // Time to First Byte (TTFB)
  try {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        recordWebVital({
          name: 'TTFB',
          value: entry.responseStart - entry.requestStart,
          delta: entry.responseStart - entry.requestStart,
          entries: [entry],
          id: 'ttfb-' + Math.random().toString(36).substr(2, 9),
          navigationType: getNavigationType()
        });
      });
    }).observe({ entryTypes: ['navigation'] });
  } catch (e) {
    console.warn('TTFB observer not supported');
  }
}

/**
 * Record a Web Vital metric
 */
function recordWebVital(metric: WebVitalsMetric) {
  performanceData.webVitals[metric.name] = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}: ${metric.value.toFixed(2)}ms`);
  }
}

/**
 * Get navigation type
 */
function getNavigationType(): WebVitalsMetric['navigationType'] {
  if (typeof window === 'undefined') return 'navigate';

  const nav = performance.getEntriesByType('navigation')[0] as any;
  if (nav) {
    return nav.type as WebVitalsMetric['navigationType'];
  }
  return 'navigate';
}

/**
 * Observe custom metrics specific to our application
 */
function observeCustomMetrics() {
  if (typeof window === 'undefined') return;

  // Page Load Time
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    performanceData.customMetrics.pageLoadTime = loadTime;
  });

  // Time to Interactive (estimated)
  document.addEventListener('DOMContentLoaded', () => {
    requestIdleCallback(() => {
      const ttiTime = performance.now();
      performanceData.customMetrics.timeToInteractive = ttiTime;
    });
  });
}

/**
 * Track store code validation performance
 */
export function trackStoreCodeValidation(startTime: number, endTime: number) {
  const validationTime = endTime - startTime;
  performanceData.customMetrics.storeCodeValidationTime = validationTime;

  // Log slow validations
  if (validationTime > 3000) {
    console.warn(`Slow store code validation: ${validationTime}ms`);
  }
}

/**
 * Track form interaction time
 */
export function trackFormInteraction(startTime: number, endTime: number) {
  const interactionTime = endTime - startTime;
  performanceData.customMetrics.formInteractionTime = interactionTime;
}

/**
 * Track API response time
 */
export function trackAPIResponse(endpoint: string, startTime: number, endTime: number) {
  const responseTime = endTime - startTime;

  if (endpoint.includes('validate-code')) {
    performanceData.customMetrics.apiResponseTime = responseTime;
  }

  // Log slow API responses
  if (responseTime > 2000) {
    console.warn(`Slow API response for ${endpoint}: ${responseTime}ms`);
  }
}

/**
 * Get current performance data
 */
export function getPerformanceData(): PerformanceData {
  return { ...performanceData };
}

/**
 * Send performance data to analytics
 */
export function sendPerformanceData() {
  if (typeof window === 'undefined') return;

  const data = getPerformanceData();

  // Only send if we have meaningful data
  const hasWebVitals = Object.keys(data.webVitals).length > 0;
  const hasCustomMetrics = Object.keys(data.customMetrics).length > 0;

  if (!hasWebVitals && !hasCustomMetrics) {
    return;
  }

  // Send to analytics endpoint
  try {
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      keepalive: true
    }).catch((error) => {
      console.warn('Failed to send performance data:', error);
    });
  } catch (error) {
    console.warn('Failed to send performance data:', error);
  }
}

/**
 * Performance budget thresholds
 */
export const PERFORMANCE_BUDGETS = {
  LCP: 2500,  // Large Contentful Paint should be under 2.5s
  FID: 100,   // First Input Delay should be under 100ms
  CLS: 0.1,   // Cumulative Layout Shift should be under 0.1
  FCP: 1800,  // First Contentful Paint should be under 1.8s
  TTFB: 800,  // Time to First Byte should be under 800ms

  // Custom metrics
  STORE_CODE_VALIDATION: 2000, // Validation should be under 2s
  API_RESPONSE: 1000,           // API responses should be under 1s
  PAGE_LOAD: 3000,              // Page load should be under 3s
  TIME_TO_INTERACTIVE: 5000     // TTI should be under 5s
} as const;

/**
 * Check if metrics meet performance budgets
 */
export function checkPerformanceBudgets(): Record<string, boolean> {
  const data = getPerformanceData();
  const results: Record<string, boolean> = {};

  // Check Web Vitals
  if (data.webVitals.LCP) {
    results.LCP = data.webVitals.LCP.value <= PERFORMANCE_BUDGETS.LCP;
  }
  if (data.webVitals.FID) {
    results.FID = data.webVitals.FID.value <= PERFORMANCE_BUDGETS.FID;
  }
  if (data.webVitals.CLS) {
    results.CLS = data.webVitals.CLS.value <= PERFORMANCE_BUDGETS.CLS;
  }
  if (data.webVitals.FCP) {
    results.FCP = data.webVitals.FCP.value <= PERFORMANCE_BUDGETS.FCP;
  }
  if (data.webVitals.TTFB) {
    results.TTFB = data.webVitals.TTFB.value <= PERFORMANCE_BUDGETS.TTFB;
  }

  // Check custom metrics
  if (data.customMetrics.storeCodeValidationTime) {
    results.STORE_CODE_VALIDATION = data.customMetrics.storeCodeValidationTime <= PERFORMANCE_BUDGETS.STORE_CODE_VALIDATION;
  }
  if (data.customMetrics.apiResponseTime) {
    results.API_RESPONSE = data.customMetrics.apiResponseTime <= PERFORMANCE_BUDGETS.API_RESPONSE;
  }
  if (data.customMetrics.pageLoadTime) {
    results.PAGE_LOAD = data.customMetrics.pageLoadTime <= PERFORMANCE_BUDGETS.PAGE_LOAD;
  }
  if (data.customMetrics.timeToInteractive) {
    results.TIME_TO_INTERACTIVE = data.customMetrics.timeToInteractive <= PERFORMANCE_BUDGETS.TIME_TO_INTERACTIVE;
  }

  return results;
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary() {
  if (process.env.NODE_ENV !== 'development') return;

  const data = getPerformanceData();
  const budgetResults = checkPerformanceBudgets();

  console.group('🚀 Performance Summary');

  // Web Vitals
  if (Object.keys(data.webVitals).length > 0) {
    console.group('📊 Core Web Vitals');
    Object.entries(data.webVitals).forEach(([name, metric]) => {
      if (metric) {
        const status = budgetResults[name] ? '✅' : '❌';
        console.log(`${status} ${name}: ${metric.value.toFixed(2)}ms`);
      }
    });
    console.groupEnd();
  }

  // Custom Metrics
  if (Object.keys(data.customMetrics).length > 0) {
    console.group('⚡ Custom Metrics');
    Object.entries(data.customMetrics).forEach(([name, value]) => {
      if (value !== undefined) {
        console.log(`${name}: ${value.toFixed(2)}ms`);
      }
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// Initialize performance monitoring when this module loads
if (typeof window !== 'undefined') {
  // Wait for the page to be fully loaded before initializing
  if (document.readyState === 'complete') {
    initPerformanceMonitoring();
  } else {
    window.addEventListener('load', initPerformanceMonitoring);
  }
}