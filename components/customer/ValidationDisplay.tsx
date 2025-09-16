'use client';

import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Wifi, WifiOff } from 'lucide-react';
import type { ErrorType } from '@/lib/types/database';

export interface ValidationDisplayProps {
  /** Current validation state */
  state: 'idle' | 'validating' | 'success' | 'error';
  /** Error type if state is 'error' */
  errorType?: ErrorType;
  /** Custom error message */
  errorMessage?: string;
  /** Success message */
  successMessage?: string;
  /** Retry after time in seconds (for rate limiting) */
  retryAfter?: number;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Whether retry button should be shown */
  showRetry?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ValidationDisplay({
  state,
  errorType,
  errorMessage,
  successMessage,
  retryAfter,
  onRetry,
  showRetry = true,
  className
}: ValidationDisplayProps) {
  const [countdown, setCountdown] = React.useState(retryAfter || 0);

  // Handle countdown timer for rate limiting
  React.useEffect(() => {
    if (state === 'error' && errorType === 'RATE_LIMITED' && retryAfter) {
      setCountdown(retryAfter);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state, errorType, retryAfter]);

  const getIcon = () => {
    switch (state) {
      case 'validating':
        return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        switch (errorType) {
          case 'RATE_LIMITED':
            return <Clock className="h-4 w-4" />;
          case 'NETWORK_ERROR':
            return <WifiOff className="h-4 w-4" />;
          default:
            return <AlertCircle className="h-4 w-4" />;
        }
      default:
        return null;
    }
  };

  const getVariant = () => {
    switch (state) {
      case 'success':
        return 'default'; // We'll style this as success
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getMessage = () => {
    switch (state) {
      case 'validating':
        return 'Checking store code...';
      case 'success':
        return successMessage || 'Store code verified! Redirecting...';
      case 'error':
        return errorMessage || 'Something went wrong. Please try again.';
      default:
        return '';
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const canRetry = () => {
    if (!showRetry || !onRetry) return false;
    if (errorType === 'RATE_LIMITED') {
      return countdown <= 0;
    }
    return true;
  };

  if (state === 'idle') {
    return null;
  }

  return (
    <div className={cn('w-full max-w-sm', className)}>
      <Alert
        variant={getVariant()}
        className={cn(
          'transition-all duration-200',
          state === 'success' && 'border-green-500 bg-green-50 text-green-800',
          state === 'validating' && 'border-blue-500 bg-blue-50 text-blue-800'
        )}
      >
        {getIcon()}
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p className="font-medium">{getMessage()}</p>

            {/* Rate limiting countdown */}
            {state === 'error' && errorType === 'RATE_LIMITED' && countdown > 0 && (
              <p className="text-sm opacity-75">
                Please wait {formatCountdown(countdown)} before trying again
              </p>
            )}

            {/* Network error help */}
            {state === 'error' && errorType === 'NETWORK_ERROR' && (
              <div className="text-sm opacity-75 space-y-1">
                <p>Check your internet connection and try again</p>
                <div className="flex items-center space-x-1 text-xs">
                  <Wifi className="h-3 w-3" />
                  <span>Connection required</span>
                </div>
              </div>
            )}

            {/* Format validation help */}
            {state === 'error' && errorType === 'INVALID_FORMAT' && (
              <p className="text-sm opacity-75">
                Make sure you entered exactly 6 digits from your receipt
              </p>
            )}

            {/* Store not found help */}
            {state === 'error' && errorType === 'NOT_FOUND' && (
              <div className="text-sm opacity-75 space-y-1">
                <p>Double-check the code on your receipt or store display</p>
                <p className="text-xs">Code should be exactly 6 digits</p>
              </div>
            )}

            {/* Retry button */}
            {state === 'error' && canRetry() && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                Try Again
              </Button>
            )}

            {/* Disabled retry button with countdown */}
            {state === 'error' && errorType === 'RATE_LIMITED' && countdown > 0 && (
              <Button
                disabled
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                Retry in {formatCountdown(countdown)}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default ValidationDisplay;