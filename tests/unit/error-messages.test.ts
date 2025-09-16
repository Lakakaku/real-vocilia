// Unit test for error message generation
// Tests the generateErrorMessage and related error handling functions
// Created: 2025-09-16

import { describe, it, expect } from 'vitest';

// Import will fail initially (TDD requirement)
// These error message functions should not exist yet
import {
  generateErrorMessage,
  getErrorMessageForType,
  formatValidationResponse,
  createRateLimitError,
  createNetworkError
} from '../../lib/utils/error-messages';

import type { ValidateStoreCodeResponse } from '../../lib/types/database';

describe('Error Message Generation - Unit Tests', () => {
  describe('generateErrorMessage function', () => {
    it('should generate correct message for INVALID_FORMAT error', () => {
      const result = generateErrorMessage('INVALID_FORMAT');

      expect(result).toBe('Please enter exactly 6 digits');
    });

    it('should generate correct message for NOT_FOUND error', () => {
      const result = generateErrorMessage('NOT_FOUND');

      expect(result).toBe('This code is not recognized. Please check and try again');
    });

    it('should generate correct message for RATE_LIMITED error', () => {
      const result = generateErrorMessage('RATE_LIMITED');

      expect(result).toBe('Too many attempts. Please wait a minute and try again');
    });

    it('should generate correct message for NETWORK_ERROR error', () => {
      const result = generateErrorMessage('NETWORK_ERROR');

      expect(result).toBe('Connection issue. Please check your internet and try again');
    });

    it('should handle unknown error types gracefully', () => {
      // Should have a fallback for unknown error types
      const result = generateErrorMessage('UNKNOWN_ERROR' as any);

      expect(result).toBe('An unexpected error occurred. Please try again');
    });

    it('should handle null and undefined error types', () => {
      expect(() => generateErrorMessage(null as any)).not.toThrow();
      expect(() => generateErrorMessage(undefined as any)).not.toThrow();

      const nullResult = generateErrorMessage(null as any);
      const undefinedResult = generateErrorMessage(undefined as any);

      expect(nullResult).toBe('An unexpected error occurred. Please try again');
      expect(undefinedResult).toBe('An unexpected error occurred. Please try again');
    });
  });

  describe('getErrorMessageForType function', () => {
    it('should return error objects with correct structure', () => {
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const error = getErrorMessageForType(errorType);

        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error.code).toBe(errorType);
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should include retry_after for RATE_LIMITED errors', () => {
      const error = getErrorMessageForType('RATE_LIMITED', 45);

      expect(error).toHaveProperty('retry_after');
      expect(error.retry_after).toBe(45);
    });

    it('should not include retry_after for non-rate-limited errors', () => {
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const error = getErrorMessageForType(errorType);
        expect(error).not.toHaveProperty('retry_after');
      });
    });

    it('should default retry_after to 60 seconds if not specified for RATE_LIMITED', () => {
      const error = getErrorMessageForType('RATE_LIMITED');

      expect(error.retry_after).toBe(60);
    });
  });

  describe('formatValidationResponse function', () => {
    it('should format successful validation response correctly', () => {
      const response = formatValidationResponse(true, 'https://vocilia.com/feedback/123456');

      expect(response.success).toBe(true);
      expect(response.redirect_url).toBe('https://vocilia.com/feedback/123456');
      expect(response.error).toBeUndefined();
    });

    it('should format error validation response correctly', () => {
      const response = formatValidationResponse(false, undefined, 'NOT_FOUND');

      expect(response.success).toBe(false);
      expect(response.redirect_url).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe('NOT_FOUND');
      expect(response.error!.message).toBe('This code is not recognized. Please check and try again');
    });

    it('should include retry_after for rate limited responses', () => {
      const response = formatValidationResponse(false, undefined, 'RATE_LIMITED', 30);

      expect(response.success).toBe(false);
      expect(response.error!.code).toBe('RATE_LIMITED');
      expect(response.error!.retry_after).toBe(30);
    });

    it('should handle missing error type for failed validation', () => {
      const response = formatValidationResponse(false);

      expect(response.success).toBe(false);
      expect(response.error!.code).toBe('NETWORK_ERROR');
      expect(response.error!.message).toBe('Connection issue. Please check your internet and try again');
    });

    it('should validate redirect URL format for successful responses', () => {
      const validUrls = [
        'https://vocilia.com/feedback/123456',
        'https://vocilia.com/feedback/000000',
        'https://vocilia.com/feedback/999999'
      ];

      validUrls.forEach(url => {
        const response = formatValidationResponse(true, url);
        expect(response.redirect_url).toBe(url);
        expect(response.redirect_url).toMatch(/^https:\/\/vocilia\.com\/feedback\/\d{6}$/);
      });
    });
  });

  describe('createRateLimitError function', () => {
    it('should create rate limit error with default retry time', () => {
      const error = createRateLimitError();

      expect(error.success).toBe(false);
      expect(error.error!.code).toBe('RATE_LIMITED');
      expect(error.error!.message).toBe('Too many attempts. Please wait a minute and try again');
      expect(error.error!.retry_after).toBe(60);
    });

    it('should create rate limit error with custom retry time', () => {
      const customRetryTime = 45;
      const error = createRateLimitError(customRetryTime);

      expect(error.error!.retry_after).toBe(customRetryTime);
    });

    it('should handle zero and negative retry times', () => {
      const zeroError = createRateLimitError(0);
      expect(zeroError.error!.retry_after).toBe(0);

      const negativeError = createRateLimitError(-10);
      expect(negativeError.error!.retry_after).toBe(-10); // Or should it default to 0/60?
    });

    it('should handle very large retry times', () => {
      const largeRetryTime = 86400; // 24 hours
      const error = createRateLimitError(largeRetryTime);

      expect(error.error!.retry_after).toBe(largeRetryTime);
    });
  });

  describe('createNetworkError function', () => {
    it('should create network error with default message', () => {
      const error = createNetworkError();

      expect(error.success).toBe(false);
      expect(error.error!.code).toBe('NETWORK_ERROR');
      expect(error.error!.message).toBe('Connection issue. Please check your internet and try again');
      expect(error.error!.retry_after).toBeUndefined();
    });

    it('should create network error with custom message', () => {
      const customMessage = 'Server is temporarily unavailable';
      const error = createNetworkError(customMessage);

      expect(error.error!.message).toBe(customMessage);
    });

    it('should handle empty custom messages', () => {
      const error = createNetworkError('');

      // Should fall back to default message
      expect(error.error!.message).toBe('Connection issue. Please check your internet and try again');
    });
  });

  describe('Error Message Consistency', () => {
    it('should have consistent error messages across all functions', () => {
      const errorType = 'INVALID_FORMAT';

      const directMessage = generateErrorMessage(errorType);
      const objectMessage = getErrorMessageForType(errorType).message;
      const responseMessage = formatValidationResponse(false, undefined, errorType).error!.message;

      expect(directMessage).toBe(objectMessage);
      expect(directMessage).toBe(responseMessage);
    });

    it('should maintain message consistency for all error types', () => {
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const directMessage = generateErrorMessage(errorType);
        const objectMessage = getErrorMessageForType(errorType).message;
        const responseMessage = formatValidationResponse(false, undefined, errorType).error!.message;

        expect(directMessage).toBe(objectMessage);
        expect(directMessage).toBe(responseMessage);
      });
    });

    it('should have user-friendly error messages', () => {
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const message = generateErrorMessage(errorType);

        // Messages should be user-friendly
        expect(message).not.toContain('error');
        expect(message).not.toContain('Error');
        expect(message).not.toContain('failure');
        expect(message).not.toContain('invalid');
        expect(message).not.toContain('null');
        expect(message).not.toContain('undefined');

        // Should provide actionable guidance
        expect(message.length).toBeGreaterThan(10);
        expect(message.endsWith('.')).toBe(false); // No trailing periods for UI consistency
      });
    });
  });

  describe('Response Type Validation', () => {
    it('should generate responses that match ValidateStoreCodeResponse interface', () => {
      // Test successful response
      const successResponse = formatValidationResponse(true, 'https://vocilia.com/feedback/123456');

      // Should match the interface structure
      expect(successResponse).toMatchObject({
        success: true,
        redirect_url: expect.stringMatching(/^https:\/\/vocilia\.com\/feedback\/\d{6}$/)
      });

      // Test error response
      const errorResponse = formatValidationResponse(false, undefined, 'NOT_FOUND');

      expect(errorResponse).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String)
        }
      });
    });

    it('should ensure success and error are mutually exclusive', () => {
      // Successful responses should not have error
      const successResponse = formatValidationResponse(true, 'https://vocilia.com/feedback/123456');
      expect(successResponse.error).toBeUndefined();

      // Error responses should not have redirect_url
      const errorResponse = formatValidationResponse(false, undefined, 'NOT_FOUND');
      expect(errorResponse.redirect_url).toBeUndefined();
    });

    it('should validate all possible response structures', () => {
      // All error types should produce valid responses
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const response = formatValidationResponse(false, undefined, errorType);

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        expect(response.error!.code).toBe(errorType);
        expect(typeof response.error!.message).toBe('string');

        if (errorType === 'RATE_LIMITED') {
          expect(response.error!.retry_after).toBeDefined();
          expect(typeof response.error!.retry_after).toBe('number');
        } else {
          expect(response.error!.retry_after).toBeUndefined();
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should generate error messages quickly', () => {
      const iterations = 10000;
      const errorType = 'INVALID_FORMAT';

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        generateErrorMessage(errorType);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(0.001); // Should be very fast
    });

    it('should format responses efficiently', () => {
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        formatValidationResponse(false, undefined, 'NOT_FOUND');
        formatValidationResponse(true, 'https://vocilia.com/feedback/123456');
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / (iterations * 2);
      expect(avgTime).toBeLessThan(0.01);
    });
  });

  describe('Internationalization Readiness', () => {
    it('should use keys that could support i18n in the future', () => {
      // Error message functions should be structured to support future i18n
      const errorTypes = ['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'] as const;

      errorTypes.forEach(errorType => {
        const error = getErrorMessageForType(errorType);

        // Code should be stable for i18n keys
        expect(error.code).toBe(errorType);
        expect(error.code).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should have consistent message structure for future localization', () => {
      const messages = [
        generateErrorMessage('INVALID_FORMAT'),
        generateErrorMessage('NOT_FOUND'),
        generateErrorMessage('RATE_LIMITED'),
        generateErrorMessage('NETWORK_ERROR')
      ];

      messages.forEach(message => {
        // Messages should be complete sentences for better translation
        expect(message.charAt(0)).toMatch(/[A-Z]/); // Start with capital
        expect(message).not.toEndWith('.'); // No periods for UI consistency
        expect(message.length).toBeGreaterThan(10);
        expect(message.length).toBeLessThan(100); // Reasonable length for UI
      });
    });
  });
});