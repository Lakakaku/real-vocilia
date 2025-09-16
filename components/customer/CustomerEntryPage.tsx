'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreCodeInput } from './StoreCodeInput';
import { ValidationDisplay } from './ValidationDisplay';
import { cn } from '@/lib/utils';
import type { ErrorType } from '@/lib/types/database';

export interface CustomerEntryPageProps {
  /** Callback when store code is successfully validated */
  onValidateCode: (storeCode: string) => Promise<{
    success: boolean;
    redirectUrl?: string;
    error?: {
      code: ErrorType;
      message: string;
      retry_after?: number;
    };
  }>;
  /** Custom title for the page */
  title?: string;
  /** Custom description */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

type ValidationState = 'idle' | 'validating' | 'success' | 'error';

export function CustomerEntryPage({
  onValidateCode,
  title = 'Welcome to Vocilia',
  description = 'Share your experience and earn cashback',
  className
}: CustomerEntryPageProps) {
  const [validationState, setValidationState] = React.useState<ValidationState>('idle');
  const [errorType, setErrorType] = React.useState<ErrorType | undefined>();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [retryAfter, setRetryAfter] = React.useState<number | undefined>();
  const [currentCode, setCurrentCode] = React.useState<string>('');

  const handleSubmitCode = async (storeCode: string) => {
    setCurrentCode(storeCode);
    setValidationState('validating');
    setErrorType(undefined);
    setErrorMessage(undefined);
    setRetryAfter(undefined);

    try {
      const result = await onValidateCode(storeCode);

      if (result.success && result.redirectUrl) {
        setValidationState('success');

        // Redirect after a brief success display
        setTimeout(() => {
          window.location.href = result.redirectUrl!;
        }, 1500);
      } else if (result.error) {
        setValidationState('error');
        setErrorType(result.error.code);
        setErrorMessage(result.error.message);
        setRetryAfter(result.error.retry_after);
      } else {
        // Fallback error case
        setValidationState('error');
        setErrorType('NETWORK_ERROR');
        setErrorMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationState('error');
      setErrorType('NETWORK_ERROR');
      setErrorMessage('Connection failed. Please check your internet and try again.');
    }
  };

  const handleRetry = () => {
    if (currentCode) {
      handleSubmitCode(currentCode);
    } else {
      // Reset to allow new input
      setValidationState('idle');
      setErrorType(undefined);
      setErrorMessage(undefined);
      setRetryAfter(undefined);
    }
  };

  const isInputDisabled = validationState === 'validating' || validationState === 'success';

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50',
      'flex items-center justify-center p-4',
      className
    )}>
      <div className="w-full max-w-md space-y-6">
        {/* Main card */}
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-8 0h8m-8 0v1a1 1 0 001 1h6a1 1 0 001-1V4M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {title}
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-gray-900">Enter Your Store Code</h3>
              <p className="text-sm text-gray-600">
                Find the 6-digit code on your receipt or at the store
              </p>
            </div>

            {/* Store code input */}
            <div className="flex justify-center">
              <StoreCodeInput
                onSubmit={handleSubmitCode}
                disabled={isInputDisabled}
                autoFocus={validationState === 'idle'}
                immediateValidation={false}
              />
            </div>

            {/* Validation display */}
            {validationState !== 'idle' && (
              <div className="flex justify-center">
                <ValidationDisplay
                  state={validationState}
                  errorType={errorType}
                  errorMessage={errorMessage}
                  retryAfter={retryAfter}
                  onRetry={handleRetry}
                  successMessage="Store verified! Taking you to feedback..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer information */}
        <div className="text-center space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Fast</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Rewarding</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Your feedback helps businesses improve and earns you cashback
          </p>
        </div>

        {/* How it works section */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">How it works</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Enter your 6-digit store code</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>Share your experience through voice feedback</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>Earn 3-15% cashback for quality feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CustomerEntryPage;