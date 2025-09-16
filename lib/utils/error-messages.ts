// Error message utilities for store code validation
// Provides consistent, user-friendly error messages across the application
// Created: 2025-09-16

import type { ValidateStoreCodeResponse, ErrorType } from '../types/database';

/**
 * Error message constants for consistent messaging
 */
const ERROR_MESSAGES = {
  INVALID_FORMAT: 'Please enter exactly 6 digits',
  NOT_FOUND: 'This code is not recognized. Please check and try again',
  RATE_LIMITED: 'Too many attempts. Please wait a minute and try again',
  NETWORK_ERROR: 'Connection issue. Please check your internet and try again'
} as const;

/**
 * Default fallback message for unknown errors
 */
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again';

/**
 * Generates a user-friendly error message for the given error type
 * @param errorType - The type of error that occurred
 * @returns User-friendly error message string
 */
export function generateErrorMessage(errorType: ErrorType | null | undefined): string {
  if (!errorType || !(errorType in ERROR_MESSAGES)) {
    return DEFAULT_ERROR_MESSAGE;
  }

  return ERROR_MESSAGES[errorType];
}

/**
 * Error object structure for detailed error responses
 */
export interface ErrorObject {
  code: ErrorType;
  message: string;
  retry_after?: number;
}

/**
 * Creates an error object with the appropriate message for the given error type
 * @param errorType - The type of error that occurred
 * @param retryAfter - Optional retry time in seconds (for rate limiting)
 * @returns Error object with code and message
 */
export function getErrorMessageForType(
  errorType: ErrorType,
  retryAfter?: number
): ErrorObject {
  const error: ErrorObject = {
    code: errorType,
    message: generateErrorMessage(errorType)
  };

  if (errorType === 'RATE_LIMITED') {
    error.retry_after = retryAfter ?? 60; // Default to 60 seconds
  }

  return error;
}

/**
 * Formats a complete validation response with success/error state
 * @param success - Whether the validation was successful
 * @param redirectUrl - URL to redirect to on success
 * @param errorType - Type of error that occurred (if any)
 * @param retryAfter - Retry time for rate limiting (if applicable)
 * @returns Formatted validation response
 */
export function formatValidationResponse(
  success: boolean,
  redirectUrl?: string,
  errorType?: ErrorType,
  retryAfter?: number
): ValidateStoreCodeResponse {
  if (success && redirectUrl) {
    return {
      success: true,
      redirect_url: redirectUrl
    };
  }

  // For failed validation, use provided error type or default to NETWORK_ERROR
  const finalErrorType = errorType || 'NETWORK_ERROR';
  const error = getErrorMessageForType(finalErrorType, retryAfter);

  return {
    success: false,
    error
  };
}

/**
 * Creates a rate limit error response with custom retry time
 * @param retryAfter - Time in seconds before user can retry (default: 60)
 * @returns Rate limit error response
 */
export function createRateLimitError(retryAfter: number = 60): ValidateStoreCodeResponse {
  return formatValidationResponse(false, undefined, 'RATE_LIMITED', retryAfter);
}

/**
 * Creates a network error response with optional custom message
 * @param customMessage - Optional custom error message
 * @returns Network error response
 */
export function createNetworkError(customMessage?: string): ValidateStoreCodeResponse {
  const response = formatValidationResponse(false, undefined, 'NETWORK_ERROR');

  // Override message if custom message provided and not empty
  if (customMessage && customMessage.trim().length > 0) {
    response.error!.message = customMessage;
  }

  return response;
}

/**
 * Validates that a redirect URL has the correct format for Vocilia feedback URLs
 * @param url - The URL to validate
 * @returns True if the URL matches the expected pattern
 */
export function isValidRedirectUrl(url: string): boolean {
  const pattern = /^https:\/\/vocilia\.com\/feedback\/\d{6}$/;
  return pattern.test(url);
}

/**
 * Creates a success response with validated redirect URL
 * @param storeCode - The validated store code
 * @returns Success response with redirect URL
 */
export function createSuccessResponse(storeCode: string): ValidateStoreCodeResponse {
  const redirectUrl = `https://vocilia.com/feedback/${storeCode}`;

  if (!isValidRedirectUrl(redirectUrl)) {
    throw new Error(`Invalid redirect URL format: ${redirectUrl}`);
  }

  return formatValidationResponse(true, redirectUrl);
}

/**
 * Error message configuration for internationalization readiness
 */
export const ERROR_CONFIG = {
  // Error codes that support retry_after
  RETRY_SUPPORTED: ['RATE_LIMITED'] as const,

  // Default retry times by error type
  DEFAULT_RETRY_TIMES: {
    RATE_LIMITED: 60
  } as const,

  // Error severity levels for logging
  ERROR_SEVERITY: {
    INVALID_FORMAT: 'low',
    NOT_FOUND: 'medium',
    RATE_LIMITED: 'medium',
    NETWORK_ERROR: 'high'
  } as const
} as const;

/**
 * Type guard to check if an error type supports retry_after
 * @param errorType - The error type to check
 * @returns True if the error type supports retry_after
 */
export function supportsRetryAfter(errorType: ErrorType): boolean {
  return ERROR_CONFIG.RETRY_SUPPORTED.includes(errorType as any);
}

/**
 * Gets the appropriate error severity for logging purposes
 * @param errorType - The error type
 * @returns Severity level string
 */
export function getErrorSeverity(errorType: ErrorType): string {
  return ERROR_CONFIG.ERROR_SEVERITY[errorType] || 'medium';
}