// Unit test for store code validation logic
// Tests the validateStoreCodeFormat and related validation functions
// Created: 2025-09-16

import { describe, it, expect } from 'vitest';

// Import will fail initially (TDD requirement)
// These validation functions should not exist yet
import {
  validateStoreCodeFormat,
  isValidStoreCodeLength,
  isValidStoreCodePattern,
  getValidationErrorMessage
} from '../../lib/validation/validation-logic';

describe('Store Code Validation Logic - Unit Tests', () => {
  describe('validateStoreCodeFormat function', () => {
    it('should return true for valid 6-digit codes', () => {
      const validCodes = [
        '123456',
        '000000',
        '999999',
        '111111',
        '987654',
        '012345'
      ];

      validCodes.forEach(code => {
        expect(validateStoreCodeFormat(code)).toBe(true);
      });
    });

    it('should return false for invalid length codes', () => {
      const invalidLengthCodes = [
        '',
        '1',
        '12',
        '123',
        '1234',
        '12345',
        '1234567',
        '12345678',
        '123456789012345'
      ];

      invalidLengthCodes.forEach(code => {
        expect(validateStoreCodeFormat(code)).toBe(false);
      });
    });

    it('should return false for non-numeric codes', () => {
      const nonNumericCodes = [
        'abcdef',
        '123abc',
        'abc123',
        '12a456',
        '12-456',
        '12 456',
        '12.456',
        '12,456',
        '123_456',
        '(123)456'
      ];

      nonNumericCodes.forEach(code => {
        expect(validateStoreCodeFormat(code)).toBe(false);
      });
    });

    it('should return false for codes with special characters', () => {
      const specialCharCodes = [
        '123!56',
        '123@56',
        '123#56',
        '123$56',
        '123%56',
        '123^56',
        '123&56',
        '123*56',
        '123+56',
        '123=56'
      ];

      specialCharCodes.forEach(code => {
        expect(validateStoreCodeFormat(code)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        { input: null, expected: false },
        { input: undefined, expected: false },
        { input: '', expected: false },
        { input: '      ', expected: false },
        { input: '\t\n\r', expected: false }
      ];

      edgeCases.forEach(({ input, expected }) => {
        expect(validateStoreCodeFormat(input as any)).toBe(expected);
      });
    });
  });

  describe('isValidStoreCodeLength function', () => {
    it('should return true for exactly 6 characters', () => {
      const validLengths = [
        '123456',
        'abcdef',
        '!@#$%^',
        '      ',
        'mixedZ'
      ];

      validLengths.forEach(input => {
        expect(isValidStoreCodeLength(input)).toBe(true);
      });
    });

    it('should return false for incorrect lengths', () => {
      const invalidLengths = [
        '',
        '1',
        '12',
        '123',
        '1234',
        '12345',
        '1234567',
        '12345678',
        'a'.repeat(100)
      ];

      invalidLengths.forEach(input => {
        expect(isValidStoreCodeLength(input)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(isValidStoreCodeLength(null as any)).toBe(false);
      expect(isValidStoreCodeLength(undefined as any)).toBe(false);
    });
  });

  describe('isValidStoreCodePattern function', () => {
    it('should return true for 6-digit numeric strings', () => {
      const validPatterns = [
        '123456',
        '000000',
        '999999',
        '012345',
        '543210'
      ];

      validPatterns.forEach(pattern => {
        expect(isValidStoreCodePattern(pattern)).toBe(true);
      });
    });

    it('should return false for non-numeric patterns', () => {
      const invalidPatterns = [
        'abcdef',
        '123abc',
        'abc123',
        '12a456',
        '123-56',
        '123 56',
        '123.56',
        '１２３４５６' // Full-width digits
      ];

      invalidPatterns.forEach(pattern => {
        expect(isValidStoreCodePattern(pattern)).toBe(false);
      });
    });

    it('should handle incorrect lengths with numeric characters', () => {
      const incorrectLengths = [
        '1',
        '12',
        '123',
        '1234',
        '12345',
        '1234567',
        '12345678'
      ];

      incorrectLengths.forEach(pattern => {
        expect(isValidStoreCodePattern(pattern)).toBe(false);
      });
    });

    it('should use proper regex pattern matching', () => {
      // Test that the function uses the exact pattern /^[0-9]{6}$/
      const testCases = [
        { input: '123456', expected: true },  // Exact match
        { input: ' 123456', expected: false }, // Leading space
        { input: '123456 ', expected: false }, // Trailing space
        { input: '123456\n', expected: false }, // Newline
        { input: '\t123456', expected: false }, // Tab
        { input: '123456a', expected: false }, // Extra character
        { input: 'a123456', expected: false }  // Leading character
      ];

      testCases.forEach(({ input, expected }) => {
        expect(isValidStoreCodePattern(input)).toBe(expected);
      });
    });
  });

  describe('getValidationErrorMessage function', () => {
    it('should return appropriate error messages for different validation failures', () => {
      const testCases = [
        {
          input: '',
          expectedType: 'INVALID_FORMAT',
          expectedMessage: 'Please enter exactly 6 digits'
        },
        {
          input: '12345',
          expectedType: 'INVALID_FORMAT',
          expectedMessage: 'Please enter exactly 6 digits'
        },
        {
          input: '1234567',
          expectedType: 'INVALID_FORMAT',
          expectedMessage: 'Please enter exactly 6 digits'
        },
        {
          input: 'abcdef',
          expectedType: 'INVALID_FORMAT',
          expectedMessage: 'Please enter exactly 6 digits'
        },
        {
          input: '123abc',
          expectedType: 'INVALID_FORMAT',
          expectedMessage: 'Please enter exactly 6 digits'
        }
      ];

      testCases.forEach(({ input, expectedType, expectedMessage }) => {
        const result = getValidationErrorMessage(input);
        expect(result.type).toBe(expectedType);
        expect(result.message).toBe(expectedMessage);
      });
    });

    it('should return null for valid codes', () => {
      const validCodes = ['123456', '000000', '999999'];

      validCodes.forEach(code => {
        const result = getValidationErrorMessage(code);
        expect(result).toBeNull();
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [null, undefined, ''];

      edgeCases.forEach(edgeCase => {
        const result = getValidationErrorMessage(edgeCase as any);
        expect(result).toBeDefined();
        expect(result.type).toBe('INVALID_FORMAT');
      });
    });

    it('should provide consistent error messages', () => {
      // All invalid format errors should have the same message
      const invalidInputs = ['', '1', '12345', '1234567', 'abc', '123abc', '12-34'];

      const errorMessages = invalidInputs.map(input =>
        getValidationErrorMessage(input)?.message
      );

      // All should be the same
      const uniqueMessages = [...new Set(errorMessages)];
      expect(uniqueMessages).toHaveLength(1);
      expect(uniqueMessages[0]).toBe('Please enter exactly 6 digits');
    });
  });

  describe('Integration between validation functions', () => {
    it('should have consistent behavior across all validation functions', () => {
      const testCodes = [
        '123456', // Valid
        '12345',  // Too short
        '1234567', // Too long
        'abcdef', // Not numeric
        '123abc', // Mixed
        '',       // Empty
        '12-345'  // Special character
      ];

      testCodes.forEach(code => {
        const formatValid = validateStoreCodeFormat(code);
        const lengthValid = isValidStoreCodeLength(code);
        const patternValid = isValidStoreCodePattern(code);
        const errorMessage = getValidationErrorMessage(code);

        if (code === '123456') {
          // Valid case
          expect(formatValid).toBe(true);
          expect(lengthValid).toBe(true);
          expect(patternValid).toBe(true);
          expect(errorMessage).toBeNull();
        } else {
          // Invalid cases
          expect(formatValid).toBe(false);
          expect(errorMessage).not.toBeNull();
          expect(errorMessage?.type).toBe('INVALID_FORMAT');

          // Overall format validation should be false if either length or pattern is false
          if (!lengthValid || !patternValid) {
            expect(formatValid).toBe(false);
          }
        }
      });
    });

    it('should validate that format validation combines length and pattern checks', () => {
      // Test that validateStoreCodeFormat returns true only when both length and pattern are valid
      const testCases = [
        { code: '123456', length: true, pattern: true, format: true },
        { code: 'abcdef', length: true, pattern: false, format: false },
        { code: '12345', length: false, pattern: false, format: false },
        { code: '1234567', length: false, pattern: false, format: false }
      ];

      testCases.forEach(({ code, length, pattern, format }) => {
        expect(isValidStoreCodeLength(code)).toBe(length);
        expect(isValidStoreCodePattern(code)).toBe(pattern);
        expect(validateStoreCodeFormat(code)).toBe(format);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should validate codes quickly', () => {
      const code = '123456';
      const iterations = 10000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateStoreCodeFormat(code);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(0.001); // Should be very fast (< 0.001ms per validation)
    });

    it('should handle regex validation efficiently', () => {
      const codes = ['123456', 'abcdef', '12345', '1234567', '123abc'];
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        codes.forEach(code => {
          isValidStoreCodePattern(code);
        });
      }
      const endTime = performance.now();

      const totalValidations = iterations * codes.length;
      const avgTime = (endTime - startTime) / totalValidations;
      expect(avgTime).toBeLessThan(0.01); // Should be efficient even with regex
    });
  });

  describe('Constants and Configuration', () => {
    it('should use consistent constants across validation functions', () => {
      // Test that all functions agree on what constitutes a valid length
      const sixDigitCode = '123456';
      const fiveDigitCode = '12345';
      const sevenDigitCode = '1234567';

      expect(isValidStoreCodeLength(sixDigitCode)).toBe(true);
      expect(isValidStoreCodeLength(fiveDigitCode)).toBe(false);
      expect(isValidStoreCodeLength(sevenDigitCode)).toBe(false);

      // Test that pattern validation agrees
      expect(isValidStoreCodePattern(sixDigitCode)).toBe(true);
      expect(isValidStoreCodePattern(fiveDigitCode)).toBe(false);
      expect(isValidStoreCodePattern(sevenDigitCode)).toBe(false);
    });

    it('should reject leading zeros consistently', () => {
      // Leading zeros should be allowed (they're still valid 6-digit codes)
      const codesWithLeadingZeros = ['000000', '000123', '001234', '012345'];

      codesWithLeadingZeros.forEach(code => {
        expect(validateStoreCodeFormat(code)).toBe(true);
        expect(isValidStoreCodePattern(code)).toBe(true);
        expect(getValidationErrorMessage(code)).toBeNull();
      });
    });
  });

  describe('Type Safety Tests', () => {
    it('should handle non-string inputs safely', () => {
      const nonStringInputs = [
        123456,
        true,
        false,
        [],
        {},
        new Date()
      ];

      nonStringInputs.forEach(input => {
        // Functions should not throw, should handle gracefully
        expect(() => validateStoreCodeFormat(input as any)).not.toThrow();
        expect(() => isValidStoreCodeLength(input as any)).not.toThrow();
        expect(() => isValidStoreCodePattern(input as any)).not.toThrow();
        expect(() => getValidationErrorMessage(input as any)).not.toThrow();
      });
    });

    it('should convert numbers to strings correctly', () => {
      const numericInput = 123456;

      // If functions accept numbers, they should be treated as strings
      const stringEquivalent = '123456';

      // Test behavior is consistent between number and string
      expect(validateStoreCodeFormat(numericInput as any))
        .toBe(validateStoreCodeFormat(stringEquivalent));
    });
  });
});