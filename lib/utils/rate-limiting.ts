// Rate limiting utilities for customer entry flow
// Provides IP-based rate limiting with configurable windows and limits
// Created: 2025-09-16

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum attempts per window */
  maxAttempts: number;
  /** Optional key prefix for storage */
  keyPrefix?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current attempt count in window */
  attempts: number;
  /** Time until rate limit resets (seconds) */
  retryAfter?: number;
  /** When the current window resets */
  resetTime: Date;
}

/**
 * Rate limit data structure
 */
interface RateLimitData {
  attempts: number;
  resetTime: number;
}

/**
 * In-memory storage for rate limiting
 * In production, replace with Redis or similar distributed cache
 */
class MemoryRateLimitStore {
  private store = new Map<string, RateLimitData>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitData | undefined {
    const data = this.store.get(key);
    if (data && Date.now() > data.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    return data;
  }

  set(key: string, data: RateLimitData): void {
    this.store.set(key, data);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global instance for the application
const rateLimitStore = new MemoryRateLimitStore();

/**
 * Default rate limiting configurations
 */
export const RATE_LIMIT_CONFIGS = {
  STORE_CODE_VALIDATION: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 5,
    keyPrefix: 'validation'
  },
  API_REQUESTS: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 30,
    keyPrefix: 'api'
  },
  LOGIN_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 3,
    keyPrefix: 'login'
  }
} as const;

/**
 * Extract IP address from various header sources
 */
export function extractIPAddress(headers: Headers): string {
  // Check common proxy headers in order of preference
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the chain
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback
  return 'unknown';
}

/**
 * Generate a rate limiting key
 */
export function generateRateLimitKey(
  identifier: string,
  config: RateLimitConfig
): string {
  const prefix = config.keyPrefix || 'rate';
  return `${prefix}:${identifier}`;
}

/**
 * Check and update rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = generateRateLimitKey(identifier, config);
  const now = Date.now();
  const resetTime = now + config.windowMs;

  // Get existing data
  const existing = rateLimitStore.get(key);

  if (!existing) {
    // First request in window
    rateLimitStore.set(key, {
      attempts: 1,
      resetTime
    });

    return {
      allowed: true,
      attempts: 1,
      resetTime: new Date(resetTime)
    };
  }

  // Check if we're over the limit
  if (existing.attempts >= config.maxAttempts) {
    const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
    return {
      allowed: false,
      attempts: existing.attempts,
      retryAfter: Math.max(0, retryAfter),
      resetTime: new Date(existing.resetTime)
    };
  }

  // Increment attempts
  existing.attempts++;

  return {
    allowed: true,
    attempts: existing.attempts,
    resetTime: new Date(existing.resetTime)
  };
}

/**
 * Reset rate limit for an identifier (for testing or admin override)
 */
export function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): void {
  const key = generateRateLimitKey(identifier, config);
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Omit<RateLimitResult, 'allowed'> {
  const key = generateRateLimitKey(identifier, config);
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing) {
    return {
      attempts: 0,
      resetTime: new Date(now + config.windowMs)
    };
  }

  const retryAfter = Math.ceil((existing.resetTime - now) / 1000);

  return {
    attempts: existing.attempts,
    retryAfter: Math.max(0, retryAfter),
    resetTime: new Date(existing.resetTime)
  };
}

/**
 * Rate limiting middleware helper for API routes
 */
export function createRateLimitChecker(config: RateLimitConfig) {
  return (headers: Headers): RateLimitResult => {
    const ip = extractIPAddress(headers);
    return checkRateLimit(ip, config);
  };
}

/**
 * Cleanup resources (call on application shutdown)
 */
export function cleanup(): void {
  rateLimitStore.destroy();
}

/**
 * Rate limiting headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxAttempts.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxAttempts - result.attempts).toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime.getTime() / 1000).toString()
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Validate IP address format
 */
export function isValidIPAddress(ip: string): boolean {
  if (ip === 'unknown') return false;

  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}