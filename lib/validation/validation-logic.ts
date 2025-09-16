// Store code validation logic
// Provides comprehensive validation for 6-digit store codes
// Created: 2025-09-16

import { VALIDATION_CONSTANTS } from '../types/database';

/**
 * Validates that a store code has the correct format (6 digits)
 * @param code - The store code to validate
 * @returns True if the code is exactly 6 digits
 */
export function validateStoreCodeFormat(code: unknown): boolean {
  if (code === null || code === undefined) {
    return false;
  }

  const stringCode = String(code);

  // Must be exactly 6 characters and all digits
  return isValidStoreCodeLength(stringCode) && isValidStoreCodePattern(stringCode);
}

/**
 * Validates that a store code has the correct length (exactly 6 characters)
 * @param code - The store code to validate
 * @returns True if the code is exactly 6 characters long
 */
export function isValidStoreCodeLength(code: unknown): boolean {
  if (code === null || code === undefined) {
    return false;
  }

  const stringCode = String(code);
  return stringCode.length === VALIDATION_CONSTANTS.STORE_CODE_LENGTH;
}

/**
 * Validates that a store code matches the required pattern (6 ASCII digits)
 * @param code - The store code to validate
 * @returns True if the code matches the pattern ^[0-9]{6}$
 */
export function isValidStoreCodePattern(code: unknown): boolean {
  if (code === null || code === undefined) {
    return false;
  }

  const stringCode = String(code);
  return VALIDATION_CONSTANTS.STORE_CODE_PATTERN.test(stringCode);
}

/**
 * Error type for validation failures
 */
export type ValidationErrorType = 'INVALID_FORMAT';

/**
 * Validation error result
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
}

/**
 * Gets appropriate error message for validation failure
 * @param code - The invalid store code
 * @returns Validation error object or null if valid
 */
export function getValidationErrorMessage(code: unknown): ValidationError | null {
  if (validateStoreCodeFormat(code)) {
    return null;
  }

  // All validation failures are treated as format errors for simplicity
  return {
    type: 'INVALID_FORMAT',
    message: 'Please enter exactly 6 digits'
  };
}

/**
 * Comprehensive validation result
 */
export interface ValidationResult {
  isValid: boolean;
  code: string;
  errors: ValidationError[];
  details: {
    hasCorrectLength: boolean;
    hasCorrectPattern: boolean;
    actualLength: number;
    expectedLength: number;
  };
}

/**
 * Performs comprehensive validation with detailed results
 * @param code - The store code to validate
 * @returns Detailed validation result
 */
export function validateStoreCodeDetailed(code: unknown): ValidationResult {
  const stringCode = code === null || code === undefined ? '' : String(code);
  const hasCorrectLength = isValidStoreCodeLength(stringCode);
  const hasCorrectPattern = isValidStoreCodePattern(stringCode);
  const isValid = hasCorrectLength && hasCorrectPattern;

  const errors: ValidationError[] = [];
  if (!isValid) {
    const error = getValidationErrorMessage(code);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid,
    code: stringCode,
    errors,
    details: {
      hasCorrectLength,
      hasCorrectPattern,
      actualLength: stringCode.length,
      expectedLength: VALIDATION_CONSTANTS.STORE_CODE_LENGTH
    }
  };
}

/**
 * Validates a store code and returns a user-friendly result
 * @param code - The store code to validate
 * @returns Simple validation result for UI use
 */
export function validateStoreCodeForUI(code: unknown): {
  isValid: boolean;
  errorMessage?: string;
} {
  const isValid = validateStoreCodeFormat(code);

  if (isValid) {
    return { isValid: true };
  }

  const error = getValidationErrorMessage(code);
  return {
    isValid: false,
    errorMessage: error?.message || 'Invalid store code format'
  };
}

/**
 * Validates multiple store codes in batch
 * @param codes - Array of store codes to validate
 * @returns Array of validation results
 */
export function validateStoreCodesBatch(codes: unknown[]): ValidationResult[] {
  return codes.map(code => validateStoreCodeDetailed(code));
}

/**
 * Checks if a store code is potentially valid (loose validation)
 * Used for early validation in forms before strict validation
 * @param code - The store code to check
 * @returns True if the code could potentially be valid
 */
export function isPotentiallyValidStoreCode(code: unknown): boolean {
  if (code === null || code === undefined) {
    return false;
  }

  const stringCode = String(code);

  // Allow partial codes during input (1-6 digits)
  if (stringCode.length === 0 || stringCode.length > VALIDATION_CONSTANTS.STORE_CODE_LENGTH) {
    return false;
  }

  // Must contain only digits
  return /^[0-9]*$/.test(stringCode);
}

/**
 * Gets validation message for form input (progressive validation)
 * @param code - The current input value
 * @returns Appropriate message for current input state
 */
export function getProgressiveValidationMessage(code: unknown): string | null {
  if (code === null || code === undefined) {
    return null;
  }

  const stringCode = String(code);

  if (stringCode.length === 0) {
    return null; // No message for empty input
  }

  if (!isPotentiallyValidStoreCode(code)) {
    return 'Only digits are allowed';
  }

  if (stringCode.length < VALIDATION_CONSTANTS.STORE_CODE_LENGTH) {
    const remaining = VALIDATION_CONSTANTS.STORE_CODE_LENGTH - stringCode.length;
    return `Enter ${remaining} more digit${remaining === 1 ? '' : 's'}`;
  }

  if (stringCode.length > VALIDATION_CONSTANTS.STORE_CODE_LENGTH) {
    return 'Too many digits';
  }

  // Exactly 6 digits - full validation
  if (validateStoreCodeFormat(code)) {
    return null; // Valid, no message needed
  }

  return 'Please enter exactly 6 digits';
}

/**
 * Performance-optimized validation for high-frequency use
 * @param code - The store code string (must be string)
 * @returns True if valid, false otherwise
 */
export function validateStoreCodeFast(code: string): boolean {
  // Skip type checking for performance - caller must ensure string input
  return code.length === 6 && /^[0-9]{6}$/.test(code);
}

/**
 * Regex patterns used by validation functions
 */
export const VALIDATION_PATTERNS = {
  STORE_CODE: /^[0-9]{6}$/,
  DIGITS_ONLY: /^[0-9]*$/,
  NON_DIGITS: /[^0-9]/g
} as const;

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
  STORE_CODE_LENGTH: 6,
  MIN_PARTIAL_LENGTH: 1,
  MAX_INPUT_LENGTH: 20, // Reasonable limit for user input
  ALLOWED_PATTERN: VALIDATION_PATTERNS.STORE_CODE
} as const;