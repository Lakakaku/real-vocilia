// Integration test for rate limiting behavior
// Tests IP-based rate limiting for store code validation attempts
// Created: 2025-09-16

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Rate Limiting Behavior - Integration Tests', () => {
  const testIpAddresses = [
    '192.168.1.100',
    '192.168.1.101',
    '192.168.1.102'
  ];
  const testCode = '999999'; // Non-existent code for testing

  beforeAll(async () => {
    console.log('🔴 Rate limiting test starting - check_rate_limit function should not exist yet');
  });

  afterAll(async () => {
    // Clean up test validation logs
    for (const ip of testIpAddresses) {
      await supabase
        .from('store_code_validations')
        .delete()
        .eq('ip_address', ip);
    }
    console.log('Rate limiting test cleanup completed');
  });

  beforeEach(async () => {
    // Clear validation history before each test
    for (const ip of testIpAddresses) {
      await supabase
        .from('store_code_validations')
        .delete()
        .eq('ip_address', ip);
    }
  });

  describe('Rate Limit Function Tests', () => {
    it('should allow requests within rate limit', async () => {
      const testIp = testIpAddresses[0];

      // Test that check_rate_limit function exists and works
      const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 5
      });

      expect(error).toBeNull();
      expect(isAllowed).toBe(true);
    });

    it('should track validation attempts for rate limiting', async () => {
      const testIp = testIpAddresses[0];
      const maxAttempts = 3;

      // Make several attempts within the limit
      for (let i = 0; i < maxAttempts; i++) {
        const { error } = await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: testCode,
            ip_address: testIp,
            user_agent: `Test Browser ${i}`,
            is_valid: false,
            error_type: 'not_found'
          });

        expect(error).toBeNull();

        // Check if still allowed after each attempt
        const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
          client_ip: testIp,
          window_minutes: 1,
          max_attempts: maxAttempts
        });

        expect(rateLimitError).toBeNull();

        if (i < maxAttempts - 1) {
          expect(isAllowed).toBe(true);
        } else {
          expect(isAllowed).toBe(false); // Should be blocked after max attempts
        }
      }
    });

    it('should block requests after exceeding rate limit', async () => {
      const testIp = testIpAddresses[1];
      const maxAttempts = 5;

      // Make attempts up to the limit
      for (let i = 0; i < maxAttempts; i++) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: testCode,
            ip_address: testIp,
            user_agent: 'Test Browser',
            is_valid: false,
            error_type: 'not_found'
          });
      }

      // Next attempt should be blocked
      const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: maxAttempts
      });

      expect(error).toBeNull();
      expect(isAllowed).toBe(false);
    });

    it('should handle different time windows correctly', async () => {
      const testIp = testIpAddresses[2];

      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: testCode,
            ip_address: testIp,
            user_agent: 'Test Browser',
            is_valid: false,
            error_type: 'not_found'
          });
      }

      // Check with 1-minute window (should be blocked with limit of 2)
      const { data: blocked1min, error: error1 } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 2
      });

      expect(error1).toBeNull();
      expect(blocked1min).toBe(false);

      // Check with 10-minute window (should be allowed with limit of 5)
      const { data: allowed10min, error: error2 } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 10,
        max_attempts: 5
      });

      expect(error2).toBeNull();
      expect(allowed10min).toBe(true);
    });
  });

  describe('Rate Limit Edge Cases', () => {
    it('should handle invalid IP addresses gracefully', async () => {
      const invalidIps = ['invalid-ip', '', '999.999.999.999'];

      for (const invalidIp of invalidIps) {
        const { data, error } = await supabase.rpc('check_rate_limit', {
          client_ip: invalidIp,
          window_minutes: 1,
          max_attempts: 5
        });

        // Function should handle invalid IPs gracefully
        // Either return false or handle the error appropriately
        if (error) {
          expect(error.code).toBe('22P02'); // Invalid input syntax for type inet
        } else {
          expect(data).toBe(false); // Conservative approach: block invalid IPs
        }
      }
    });

    it('should handle negative or zero parameters', async () => {
      const testIp = testIpAddresses[0];

      // Test with zero max attempts
      const { data: zeroMax, error: zeroError } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 0
      });

      expect(zeroError).toBeNull();
      expect(zeroMax).toBe(false); // Should always block with 0 max attempts

      // Test with zero window
      const { data: zeroWindow, error: windowError } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 0,
        max_attempts: 5
      });

      expect(windowError).toBeNull();
      // With 0 minute window, should only count current exact moment
    });

    it('should handle very large numbers', async () => {
      const testIp = testIpAddresses[0];

      const { data, error } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1000000, // Very large window
        max_attempts: 1000000     // Very large limit
      });

      expect(error).toBeNull();
      expect(data).toBe(true); // Should allow with very large limits
    });
  });

  describe('Rate Limiting Integration with Validation', () => {
    it('should log rate-limited attempts with proper error type', async () => {
      const testIp = testIpAddresses[0];

      // Simulate a rate-limited validation attempt
      const { error } = await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: testCode,
          ip_address: testIp,
          user_agent: 'Test Browser',
          is_valid: false,
          error_type: 'rate_limited'
        });

      expect(error).toBeNull();

      // Verify the log entry
      const { data: validation, error: selectError } = await supabase
        .from('store_code_validations')
        .select('*')
        .eq('ip_address', testIp)
        .eq('error_type', 'rate_limited')
        .single();

      expect(selectError).toBeNull();
      expect(validation.error_type).toBe('rate_limited');
      expect(validation.is_valid).toBe(false);
      expect(validation.store_id).toBeNull();
    });

    it('should differentiate between different IPs for rate limiting', async () => {
      const ip1 = testIpAddresses[0];
      const ip2 = testIpAddresses[1];
      const maxAttempts = 3;

      // Exhaust rate limit for IP1
      for (let i = 0; i < maxAttempts; i++) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: testCode,
            ip_address: ip1,
            user_agent: 'Test Browser',
            is_valid: false,
            error_type: 'not_found'
          });
      }

      // IP1 should be blocked
      const { data: ip1Blocked, error: error1 } = await supabase.rpc('check_rate_limit', {
        client_ip: ip1,
        window_minutes: 1,
        max_attempts: maxAttempts
      });

      expect(error1).toBeNull();
      expect(ip1Blocked).toBe(false);

      // IP2 should still be allowed
      const { data: ip2Allowed, error: error2 } = await supabase.rpc('check_rate_limit', {
        client_ip: ip2,
        window_minutes: 1,
        max_attempts: maxAttempts
      });

      expect(error2).toBeNull();
      expect(ip2Allowed).toBe(true);
    });

    it('should count both successful and failed attempts for rate limiting', async () => {
      const testIp = testIpAddresses[0];

      // Mix of successful and failed attempts
      const attempts = [
        { is_valid: true, error_type: null },
        { is_valid: false, error_type: 'not_found' },
        { is_valid: false, error_type: 'invalid_format' },
        { is_valid: true, error_type: null }
      ];

      for (const attempt of attempts) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: attempt.is_valid ? '123456' : testCode,
            ip_address: testIp,
            user_agent: 'Test Browser',
            is_valid: attempt.is_valid,
            error_type: attempt.error_type
          });
      }

      // Check rate limit considers all attempts
      const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 3 // Should be blocked since we made 4 attempts
      });

      expect(error).toBeNull();
      expect(isAllowed).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should perform rate limit checks efficiently', async () => {
      const testIp = testIpAddresses[0];

      // Add some history
      for (let i = 0; i < 10; i++) {
        await supabase
          .from('store_code_validations')
          .insert({
            store_code_attempt: testCode,
            ip_address: testIp,
            user_agent: 'Test Browser',
            is_valid: false,
            error_type: 'not_found'
          });
      }

      // Measure rate limit check performance
      const startTime = Date.now();

      const { data, error } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 5
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Rate limit check should be fast (< 50ms with proper indexing)
      expect(queryTime).toBeLessThan(50);
    });

    it('should handle concurrent rate limit checks', async () => {
      const testIp = testIpAddresses[0];

      // Make concurrent rate limit checks
      const promises = Array.from({ length: 10 }, () =>
        supabase.rpc('check_rate_limit', {
          client_ip: testIp,
          window_minutes: 1,
          max_attempts: 5
        })
      );

      const results = await Promise.all(promises);

      // All requests should complete successfully
      results.forEach(({ data, error }) => {
        expect(error).toBeNull();
        expect(typeof data).toBe('boolean');
      });
    });
  });

  describe('Time Window Accuracy', () => {
    it('should respect exact time windows', async () => {
      const testIp = testIpAddresses[0];

      // This test would need to manipulate timestamps or wait
      // For now, test the basic logic with current time

      // Make one attempt
      await supabase
        .from('store_code_validations')
        .insert({
          store_code_attempt: testCode,
          ip_address: testIp,
          user_agent: 'Test Browser',
          is_valid: false,
          error_type: 'not_found'
        });

      // Should be counted in 1-minute window
      const { data: inWindow, error: error1 } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 1,
        max_attempts: 1
      });

      expect(error1).toBeNull();
      expect(inWindow).toBe(false); // Should be blocked (1 attempt with limit 1)

      // Should not be counted in 0-minute window (different minute)
      // This is a simplified test - real implementation would need time manipulation
      const { data: notInWindow, error: error2 } = await supabase.rpc('check_rate_limit', {
        client_ip: testIp,
        window_minutes: 0,
        max_attempts: 1
      });

      expect(error2).toBeNull();
      // Result depends on exact implementation of 0-minute window
    });
  });
});