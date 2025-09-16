// Integration test for invalid store code handling
// Tests error scenarios and edge cases for store code validation
// Created: 2025-09-16

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Invalid Store Code Handling - Integration Tests', () => {
  const nonExistentCode = '999999';
  const testIp = '192.168.1.100';

  beforeAll(async () => {
    console.log('🔴 Invalid code handling test starting - implementation should not exist yet');

    // Ensure the non-existent code truly doesn't exist
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('store_code', nonExistentCode)
      .single();

    if (existingStore) {
      throw new Error(`Test code ${nonExistentCode} already exists in database`);
    }
  });

  afterAll(async () => {
    // Clean up any validation logs created during testing
    await supabase
      .from('store_code_validations')
      .delete()
      .eq('ip_address', testIp);

    console.log('Invalid code handling test cleanup completed');
  });

  describe('Non-existent Store Codes', () => {
    it('should return NOT_FOUND for non-existent valid format codes', async () => {
      const { data, error } = await supabase.rpc('validate_store_code', {
        code: nonExistentCode
      });

      expect(error).toBeNull();
      expect(data.valid).toBe(false);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('This code is not recognized. Please check and try again');
      expect(data.store_id).toBeUndefined();
      expect(data.redirect_url).toBeUndefined();
    });

    it('should log failed validation attempts for non-existent codes', async () => {
      // Simulate validation attempt for non-existent code
      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: nonExistentCode,
          ip_address: testIp,
          user_agent: 'Mozilla/5.0 Test Browser',
          is_valid: false,
          error_type: 'not_found'
        });

      expect(error).toBeNull();

      // Verify log entry was created
      const { data: validations, error: selectError } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('store_code_attempt', nonExistentCode)
        .eq('ip_address', testIp);

      expect(selectError).toBeNull();
      expect(validations).toHaveLength(1);
      expect(validations![0].is_valid).toBe(false);
      expect(validations![0].error_type).toBe('not_found');
      expect(validations![0].store_id).toBeNull();
    });

    it('should handle multiple failed attempts for the same code', async () => {
      const attempts = 3;

      // Make multiple validation attempts for the same non-existent code
      for (let i = 0; i < attempts; i++) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: nonExistentCode,
            ip_address: testIp,
            user_agent: `Test Browser Attempt ${i + 1}`,
            is_valid: false,
            error_type: 'not_found'
          });
      }

      // Verify all attempts were logged
      const { data: validations, error } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('store_code_attempt', nonExistentCode)
        .eq('ip_address', testIp)
        .order('attempted_at', { ascending: false });

      expect(error).toBeNull();
      expect(validations).toHaveLength(attempts);

      // Verify attempts are in chronological order
      const timestamps = validations!.map(v => new Date(v.attempted_at).getTime());
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
    });
  });

  describe('Invalid Format Codes', () => {
    const invalidFormatCodes = [
      { code: '12345', description: 'too short' },
      { code: '1234567', description: 'too long' },
      { code: 'abcdef', description: 'letters only' },
      { code: '12a456', description: 'mixed alphanumeric' },
      { code: '12-456', description: 'with hyphen' },
      { code: '12 456', description: 'with space' },
      { code: '', description: 'empty string' },
      { code: '123.45', description: 'with decimal' },
      { code: '+12345', description: 'with plus sign' },
      { code: '123456789012345', description: 'extremely long' }
    ];

    invalidFormatCodes.forEach(({ code, description }) => {
      it(`should return INVALID_FORMAT for ${description}: "${code}"`, async () => {
        const { data, error } = await supabase.rpc('validate_store_code', {
          code
        });

        expect(error).toBeNull();
        expect(data.valid).toBe(false);
        expect(data.error).toBe('INVALID_FORMAT');
        expect(data.message).toBe('Please enter exactly 6 digits');
        expect(data.store_id).toBeUndefined();
        expect(data.redirect_url).toBeUndefined();
      });
    });

    it('should log invalid format attempts with error type', async () => {
      const invalidCode = 'abc123';

      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: invalidCode,
          ip_address: testIp,
          user_agent: 'Mozilla/5.0 Test Browser',
          is_valid: false,
          error_type: 'invalid_format'
        });

      expect(error).toBeNull();

      // Verify log entry with correct error type
      const { data: validation, error: selectError } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('store_code_attempt', invalidCode)
        .eq('ip_address', testIp)
        .single();

      expect(selectError).toBeNull();
      expect(validation.error_type).toBe('invalid_format');
      expect(validation.is_valid).toBe(false);
    });
  });

  describe('Inactive Store Codes', () => {
    let inactiveStoreId: string;
    const inactiveCode = '777777';

    beforeAll(async () => {
      // Create an inactive store for testing
      const { data: store, error } = await supabase
        .from('stores')
        .insert({
          business_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Inactive Test Store',
          store_code: inactiveCode,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      inactiveStoreId = store.id;
    });

    afterAll(async () => {
      // Clean up inactive store
      await supabase
        .from('stores')
        .delete()
        .eq('id', inactiveStoreId);
    });

    it('should treat inactive stores as NOT_FOUND for security', async () => {
      const { data, error } = await supabase.rpc('validate_store_code', {
        code: inactiveCode
      });

      expect(error).toBeNull();
      expect(data.valid).toBe(false);
      expect(data.error).toBe('NOT_FOUND');
      expect(data.message).toBe('This code is not recognized. Please check and try again');

      // Should not reveal that the store exists but is inactive
      expect(data.store_id).toBeUndefined();
    });

    it('should log inactive store attempts as not_found', async () => {
      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: inactiveCode,
          ip_address: testIp,
          user_agent: 'Mozilla/5.0 Test Browser',
          is_valid: false,
          error_type: 'not_found' // From user perspective, store doesn't exist
        });

      expect(error).toBeNull();

      const { data: validation, error: selectError } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('store_code_attempt', inactiveCode)
        .eq('ip_address', testIp)
        .single();

      expect(selectError).toBeNull();
      expect(validation.error_type).toBe('not_found');
      expect(validation.store_id).toBeNull(); // Don't link to inactive store
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle null and undefined inputs safely', async () => {
      // Test various null/undefined scenarios
      const edgeCases = ['null', 'undefined', ''];

      for (const edgeCase of edgeCases) {
        const { data, error } = await supabase.rpc('validate_store_code', {
          code: edgeCase
        });

        expect(error).toBeNull();
        expect(data.valid).toBe(false);
        expect(data.error).toBe('INVALID_FORMAT');
      }
    });

    it('should prevent information disclosure through timing attacks', async () => {
      // Measure response times for different scenarios
      const timings: number[] = [];

      // Time validation of non-existent code
      const start1 = Date.now();
      await supabase.rpc('validate_store_code', { code: '111111' });
      timings.push(Date.now() - start1);

      // Time validation of invalid format
      const start2 = Date.now();
      await supabase.rpc('validate_store_code', { code: 'invalid' });
      timings.push(Date.now() - start2);

      // Time validation of another non-existent code
      const start3 = Date.now();
      await supabase.rpc('validate_store_code', { code: '222222' });
      timings.push(Date.now() - start3);

      // Response times should be relatively consistent
      // to prevent timing-based information disclosure
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingVariation = (maxTiming - minTiming) / minTiming;

      // Timing variation should be less than 50%
      expect(timingVariation).toBeLessThan(0.5);
    });

    it('should handle very large inputs without crashing', async () => {
      const largeInput = '1'.repeat(10000); // 10KB of digits

      const { data, error } = await supabase.rpc('validate_store_code', {
        code: largeInput
      });

      expect(error).toBeNull();
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INVALID_FORMAT');
    });

    it('should handle unicode and special characters', async () => {
      const unicodeCodes = [
        '１２３４５６', // Full-width digits
        '123456', // Regular ASCII
        '𝟏𝟐𝟑𝟒𝟓𝟔', // Mathematical bold digits
        '①②③④⑤⑥', // Circled numbers
        '½¾⅓⅔⅕⅖', // Fractions
      ];

      for (const unicodeCode of unicodeCodes) {
        const { data, error } = await supabase.rpc('validate_store_code', {
          code: unicodeCode
        });

        expect(error).toBeNull();
        expect(data.valid).toBe(false);
        // Most should be invalid format except regular ASCII
        if (unicodeCode === '123456') {
          expect(data.error).toBe('NOT_FOUND'); // Valid format but doesn't exist
        } else {
          expect(data.error).toBe('INVALID_FORMAT');
        }
      }
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle constraint violations gracefully', async () => {
      // Test what happens if we try to log validation with invalid data
      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: 'test',
          ip_address: 'not-a-valid-ip', // This should trigger a constraint error
          is_valid: false,
          error_type: 'invalid_format'
        });

      // Should fail due to invalid IP format
      expect(error).toBeDefined();
      expect(error?.code).toBe('22P02'); // PostgreSQL invalid input syntax
    });

    it('should validate IP address format in validation logs', async () => {
      const invalidIps = [
        'not-an-ip',
        '999.999.999.999',
        '192.168.1',
        '192.168.1.1.1',
        ''
      ];

      for (const invalidIp of invalidIps) {
        const { error } = await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: '123456',
            ip_address: invalidIp,
            is_valid: false,
            error_type: 'not_found'
          });

        // Should fail for invalid IP formats
        expect(error).toBeDefined();
      }

      // Valid IP should work
      const { error: validError } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: '123456',
          ip_address: '192.168.1.1',
          is_valid: false,
          error_type: 'not_found'
        });

      expect(validError).toBeNull();
    });
  });
});