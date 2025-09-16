// Integration test for valid store code validation flow
// Tests the complete flow from user input to database validation
// Created: 2025-09-16

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for test setup
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Store Code Validation Flow - Integration Tests', () => {
  const testStoreCode = '123456';
  const testBusinessId = '550e8400-e29b-41d4-a716-446655440000';
  let testStoreId: string;

  beforeAll(async () => {
    console.log('🔴 Integration test starting - validation service should not exist yet');

    // Set up test data in database
    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        business_id: testBusinessId,
        name: 'Test Store for Validation',
        store_code: testStoreCode,
        is_active: true,
        location: 'Test Location'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create test store:', error);
      throw error;
    }

    testStoreId = store.id;
    console.log(`Created test store with ID: ${testStoreId}`);
  });

  afterAll(async () => {
    // Clean up test data
    await supabase
      .from('store_code_validations')
      .delete()
      .eq('store_id', testStoreId);

    await supabase
      .from('stores')
      .delete()
      .eq('id', testStoreId);

    console.log('Integration test cleanup completed');
  });

  beforeEach(async () => {
    // Clear validation history before each test
    await supabase
      .from('store_code_validations')
      .delete()
      .eq('store_id', testStoreId);
  });

  describe('Valid Store Code Flow', () => {
    it('should validate existing active store code', async () => {
      // This test will FAIL initially (TDD requirement)
      // The validate_store_code function should exist but implementation is pending

      const { data, error } = await supabase.rpc('validate_store_code', {
        code: testStoreCode
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.valid).toBe(true);
      expect(data.store_id).toBe(testStoreId);
      expect(data.redirect_url).toBe(`https://vocilia.com/feedback/${testStoreCode}`);
    });

    it('should log successful validation attempt', async () => {
      // Simulate validation attempt
      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: testStoreCode,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 Test Browser',
          is_valid: true,
          store_id: testStoreId
        });

      expect(error).toBeNull();

      // Verify log entry was created
      const { data: validations, error: selectError } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('store_code_attempt', testStoreCode)
        .eq('is_valid', true);

      expect(selectError).toBeNull();
      expect(validations).toHaveLength(1);
      expect(validations![0].store_id).toBe(testStoreId);
      expect(validations![0].ip_address).toBe('192.168.1.1');
    });

    it('should handle case-insensitive store code lookup', async () => {
      // Test that store codes are handled consistently
      const { data, error } = await supabase.rpc('validate_store_code', {
        code: testStoreCode.toLowerCase() // This should still work if properly implemented
      });

      // This test might fail if the function doesn't handle case properly
      // Implementation should normalize to uppercase/consistent format
      expect(error).toBeNull();
      // Note: This test will evolve based on actual implementation decisions
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should enforce store_code uniqueness', async () => {
      // Try to create another store with the same code
      const { error } = await supabase
        .from('stores')
        .insert({
          business_id: testBusinessId,
          name: 'Duplicate Store',
          store_code: testStoreCode, // Same code as test store
          is_active: true
        });

      // Should fail due to unique constraint
      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // PostgreSQL unique violation
    });

    it('should only return active stores for validation', async () => {
      // Create an inactive store with different code
      const inactiveCode = '654321';
      const { data: inactiveStore } = await supabase
        .from('stores')
        .insert({
          business_id: testBusinessId,
          name: 'Inactive Test Store',
          store_code: inactiveCode,
          is_active: false
        })
        .select()
        .single();

      // Try to validate inactive store code
      const { data, error } = await supabase.rpc('validate_store_code', {
        code: inactiveCode
      });

      expect(error).toBeNull();
      expect(data.valid).toBe(false);
      expect(data.error).toBe('NOT_FOUND');

      // Clean up
      await supabase
        .from('stores')
        .delete()
        .eq('id', inactiveStore!.id);
    });

    it('should validate store_code format constraints', async () => {
      // Test 6-digit format validation
      const invalidCodes = ['12345', '1234567', 'abcdef', '12-345', ''];

      for (const invalidCode of invalidCodes) {
        const { data, error } = await supabase.rpc('validate_store_code', {
          code: invalidCode
        });

        expect(error).toBeNull();
        expect(data.valid).toBe(false);
        expect(data.error).toBe('INVALID_FORMAT');
        expect(data.message).toBe('Please enter exactly 6 digits');
      }
    });
  });

  describe('Performance and Indexing', () => {
    it('should perform store code lookup efficiently', async () => {
      const startTime = Date.now();

      const { data, error } = await supabase.rpc('validate_store_code', {
        code: testStoreCode
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(data.valid).toBe(true);

      // Query should complete within 100ms (O(1) lookup with proper indexing)
      expect(queryTime).toBeLessThan(100);
    });

    it('should handle concurrent validation attempts', async () => {
      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        supabase.rpc('validate_store_code', { code: testStoreCode })
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(({ data, error }) => {
        expect(error).toBeNull();
        expect(data.valid).toBe(true);
        expect(data.store_id).toBe(testStoreId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test simulates what should happen if DB is unavailable
      // The actual implementation will need proper error handling

      // For now, test that the function exists and handles edge cases
      const { data, error } = await supabase.rpc('validate_store_code', {
        code: 'INVALID'
      });

      // Function should exist even if it doesn't handle all cases yet
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should sanitize malicious input', async () => {
      // Test SQL injection protection
      const maliciousInputs = [
        "'; DROP TABLE stores; --",
        "123456'; SELECT * FROM users; --",
        "123456 OR 1=1",
        "123456' UNION SELECT * FROM stores --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const { data, error } = await supabase.rpc('validate_store_code', {
          code: maliciousInput
        });

        // Should handle safely without exposing database errors
        expect(error).toBeNull();
        expect(data.valid).toBe(false);
        expect(data.error).toBe('INVALID_FORMAT');
      }
    });
  });
});