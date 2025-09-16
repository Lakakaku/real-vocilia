// Contract test for POST /api/validate-store-code endpoint
// Based on OpenAPI specification in contracts/validate-store-code.yaml
// Created: 2025-09-16

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ValidateStoreCodeRequest, ValidateStoreCodeResponse } from '../../lib/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ENDPOINT = '/api/validate-store-code';

describe('POST /api/validate-store-code - Contract Tests', () => {
  // Test data setup
  const validStoreCode = '123456';
  const invalidStoreCode = '000000';
  const malformedCode = 'abc123';

  beforeAll(async () => {
    // This test MUST FAIL initially (TDD requirement)
    console.log('🔴 Contract test starting - endpoint should not exist yet');
  });

  afterAll(async () => {
    console.log('Contract tests completed');
  });

  describe('Request Contract Validation', () => {
    it('should accept valid JSON request body with 6-digit code', async () => {
      const request: ValidateStoreCodeRequest = {
        code: validStoreCode
      };

      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Contract: Endpoint should exist and accept POST requests
      expect(response).toBeDefined();
      expect(response.status).not.toBe(404); // Should not be "Not Found"
    });

    it('should reject requests without code field', async () => {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Contract: Should validate required fields
      expect(response.status).toBe(400);
    });

    it('should reject invalid Content-Type', async () => {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ code: validStoreCode }),
      });

      // Contract: Should require JSON content type
      expect(response.status).toBe(400);
    });
  });

  describe('Response Contract Validation', () => {
    it('should return valid JSON response for valid store code', async () => {
      const request: ValidateStoreCodeRequest = {
        code: validStoreCode
      };

      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Contract: Should return 200 for valid requests
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data: ValidateStoreCodeResponse = await response.json();

      // Contract: Response should match schema
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.success) {
        // Success response contract
        expect(data).toHaveProperty('redirect_url');
        expect(typeof data.redirect_url).toBe('string');
        expect(data.redirect_url).toMatch(/^https:\/\/vocilia\.com\/feedback\/\d{6}$/);
      } else {
        // Error response contract
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('code');
        expect(data.error).toHaveProperty('message');
        expect(['INVALID_FORMAT', 'NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'])
          .toContain(data.error!.code);
      }
    });

    it('should return error response for invalid store code', async () => {
      const request: ValidateStoreCodeRequest = {
        code: invalidStoreCode
      };

      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(200);
      const data: ValidateStoreCodeResponse = await response.json();

      // Contract: Invalid codes should return success=false
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('NOT_FOUND');
      expect(data.error?.message).toBe('This code is not recognized. Please check and try again');
    });

    it('should return error response for malformed code', async () => {
      const request: ValidateStoreCodeRequest = {
        code: malformedCode
      };

      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(200);
      const data: ValidateStoreCodeResponse = await response.json();

      // Contract: Malformed codes should return format error
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_FORMAT');
      expect(data.error?.message).toBe('Please enter exactly 6 digits');
    });

    it('should return 429 for rate limited requests', async () => {
      // Make multiple requests to trigger rate limiting
      const request: ValidateStoreCodeRequest = {
        code: invalidStoreCode
      };

      // Make 6 requests to exceed the 5 per minute limit
      for (let i = 0; i < 6; i++) {
        await fetch(`${API_BASE_URL}${ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });
      }

      // The 6th request should be rate limited
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Contract: Rate limiting should return 429
      expect(response.status).toBe(429);
      const data: ValidateStoreCodeResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('RATE_LIMITED');
      expect(data.error?.retry_after).toBeGreaterThan(0);
    });
  });

  describe('HTTP Method Contract', () => {
    it('should reject GET requests', async () => {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'GET',
      });

      // Contract: Only POST should be allowed
      expect(response.status).toBe(405); // Method Not Allowed
    });

    it('should reject PUT requests', async () => {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: validStoreCode }),
      });

      // Contract: Only POST should be allowed
      expect(response.status).toBe(405); // Method Not Allowed
    });
  });
});