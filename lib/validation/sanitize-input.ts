// Input sanitization utility for store codes
// Removes all non-digit characters and handles edge cases
// Created: 2025-09-16

/**
 * Sanitizes store code input by removing all non-digit characters
 * @param input - The raw input string to sanitize
 * @returns A string containing only digits (0-9)
 */
export function sanitizeStoreCode(input: unknown): string {
  // Handle null, undefined, and non-string inputs
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string if not already a string
  let stringInput: string;
  try {
    stringInput = String(input);
  } catch (error) {
    return '';
  }

  // Remove all non-digit characters using regex
  // Only match ASCII digits (0-9), not Unicode digits
  const sanitized = stringInput.replace(/[^0-9]/g, '');

  return sanitized;
}

/**
 * Validates that input contains only sanitizable characters
 * Useful for detecting potentially malicious input before sanitization
 * @param input - The input to validate
 * @returns True if input is safe to sanitize
 */
export function isSafeToSanitize(input: unknown): boolean {
  if (input === null || input === undefined) {
    return true;
  }

  try {
    const stringInput = String(input);

    // Check for extremely long inputs that might cause performance issues
    if (stringInput.length > 100000) {
      return false;
    }

    // Check for control characters that might indicate malicious input
    // Allow printable ASCII and common whitespace
    const hasUnsafeChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(stringInput);

    return !hasUnsafeChars;
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizes and validates store code input in one step
 * @param input - The raw input to process
 * @returns Object with sanitized value and validation info
 */
export function processStoreCodeInput(input: unknown): {
  sanitized: string;
  isSafe: boolean;
  originalLength: number;
  sanitizedLength: number;
} {
  const isSafe = isSafeToSanitize(input);
  const originalString = input === null || input === undefined ? '' : String(input);
  const sanitized = sanitizeStoreCode(input);

  return {
    sanitized,
    isSafe,
    originalLength: originalString.length,
    sanitizedLength: sanitized.length
  };
}

/**
 * Batch sanitize multiple store code inputs
 * Useful for processing multiple codes at once with better performance
 * @param inputs - Array of inputs to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeStoreCodeBatch(inputs: unknown[]): string[] {
  return inputs.map(input => sanitizeStoreCode(input));
}

/**
 * Pre-compiled regex for performance optimization
 * Used internally by sanitization functions
 */
const DIGIT_ONLY_REGEX = /[^0-9]/g;

/**
 * High-performance sanitization for scenarios with many repeated calls
 * Uses pre-compiled regex for better performance
 * @param input - The input string to sanitize
 * @returns Sanitized string containing only digits
 */
export function sanitizeStoreCodeFast(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(DIGIT_ONLY_REGEX, '');
}

/**
 * Debug utility to show what characters were removed during sanitization
 * Useful for development and troubleshooting
 * @param input - The original input
 * @returns Object with original, sanitized, and removed characters
 */
export function debugSanitization(input: unknown): {
  original: string;
  sanitized: string;
  removed: string[];
  removedCount: number;
} {
  const original = input === null || input === undefined ? '' : String(input);
  const sanitized = sanitizeStoreCode(input);

  // Find removed characters
  const originalChars = original.split('');
  const sanitizedChars = sanitized.split('');
  let sanitizedIndex = 0;
  const removed: string[] = [];

  for (const char of originalChars) {
    if (sanitizedIndex < sanitizedChars.length && char === sanitizedChars[sanitizedIndex]) {
      sanitizedIndex++;
    } else {
      removed.push(char);
    }
  }

  return {
    original,
    sanitized,
    removed,
    removedCount: removed.length
  };
}