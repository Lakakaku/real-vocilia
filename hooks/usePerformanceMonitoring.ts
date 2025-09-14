import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  initPerformanceMonitoring,
  markPerformance,
  measurePerformance
} from '@/lib/monitoring/performance';

// Hook to initialize performance monitoring
export function usePerformanceMonitoring() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize performance monitoring on mount
    initPerformanceMonitoring();

    // Mark page start
    markPerformance(`page-start-${pathname}`);

    // Mark when page is interactive
    const markInteractive = () => {
      markPerformance(`page-interactive-${pathname}`);
      measurePerformance(
        `page-load-${pathname}`,
        `page-start-${pathname}`,
        `page-interactive-${pathname}`
      );
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(markInteractive);
    } else {
      setTimeout(markInteractive, 0);
    }

    // Cleanup on unmount
    return () => {
      // Mark page end
      markPerformance(`page-end-${pathname}`);
      measurePerformance(
        `page-duration-${pathname}`,
        `page-start-${pathname}`,
        `page-end-${pathname}`
      );
    };
  }, [pathname]);
}

// Hook to track specific component performance
export function useComponentPerformance(componentName: string) {
  useEffect(() => {
    // Mark component mount
    const mountMark = `${componentName}-mount`;
    markPerformance(mountMark);

    // Mark component ready
    const markReady = () => {
      const readyMark = `${componentName}-ready`;
      markPerformance(readyMark);
      measurePerformance(
        `${componentName}-render-time`,
        mountMark,
        readyMark
      );
    };

    // Use requestAnimationFrame to mark after render
    requestAnimationFrame(markReady);

    // Cleanup on unmount
    return () => {
      const unmountMark = `${componentName}-unmount`;
      markPerformance(unmountMark);
      measurePerformance(
        `${componentName}-lifetime`,
        mountMark,
        unmountMark
      );
    };
  }, [componentName]);
}

// Hook to track API call performance
export function useApiPerformance() {
  const trackApiCall = (
    apiName: string,
    apiCall: () => Promise<any>
  ): Promise<any> => {
    const startMark = `api-${apiName}-start`;
    const endMark = `api-${apiName}-end`;

    markPerformance(startMark);

    return apiCall()
      .then((result) => {
        markPerformance(endMark);
        measurePerformance(`api-${apiName}`, startMark, endMark);
        return result;
      })
      .catch((error) => {
        markPerformance(`api-${apiName}-error`);
        measurePerformance(`api-${apiName}-error`, startMark);
        throw error;
      });
  };

  return { trackApiCall };
}

// Hook to track form submission performance
export function useFormPerformance(formName: string) {
  const trackSubmission = async (
    onSubmit: () => Promise<any>
  ): Promise<any> => {
    const startMark = `form-${formName}-submit-start`;
    const endMark = `form-${formName}-submit-end`;

    markPerformance(startMark);

    try {
      const result = await onSubmit();
      markPerformance(endMark);
      measurePerformance(`form-${formName}-submit`, startMark, endMark);
      return result;
    } catch (error) {
      markPerformance(`form-${formName}-submit-error`);
      measurePerformance(`form-${formName}-submit-error`, startMark);
      throw error;
    }
  };

  return { trackSubmission };
}

// Hook to track search performance
export function useSearchPerformance() {
  const trackSearch = (
    query: string,
    searchFn: () => Promise<any>
  ): Promise<any> => {
    const searchId = `search-${Date.now()}`;
    const startMark = `${searchId}-start`;
    const endMark = `${searchId}-end`;

    markPerformance(startMark);

    // Track query length for analysis
    if (query.length > 50) {
      console.warn('Long search query detected:', query.length);
    }

    return searchFn()
      .then((result) => {
        markPerformance(endMark);
        measurePerformance(searchId, startMark, endMark);
        return result;
      })
      .catch((error) => {
        markPerformance(`${searchId}-error`);
        measurePerformance(`${searchId}-error`, startMark);
        throw error;
      });
  };

  return { trackSearch };
}