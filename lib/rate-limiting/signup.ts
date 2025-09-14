import { headers } from 'next/headers'

// Simple in-memory rate limiting
// In production, use Redis or a proper rate limiting service
const signupAttempts = new Map<string, { count: number; resetAt: number }>()

// Clean up old entries every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    Array.from(signupAttempts.entries()).forEach(([key, value]) => {
      if (value.resetAt < now) {
        signupAttempts.delete(key)
      }
    })
  }, 60 * 60 * 1000) // 1 hour
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5, // 5 attempts
  windowMs: 60 * 60 * 1000, // 1 hour window
}

/**
 * Get the client identifier (IP address or fallback)
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers()

  // Try different headers to get the real IP
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = headersList.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a generic identifier (not ideal for production)
  return 'unknown-client'
}

/**
 * Check if the signup rate limit has been exceeded
 */
export async function checkSignupRateLimit(
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const clientId = await getClientIdentifier()
  const now = Date.now()

  // Get or create rate limit entry
  let entry = signupAttempts.get(clientId)

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    signupAttempts.set(clientId, entry)
  }

  // Check if limit exceeded
  const allowed = entry.count < config.maxAttempts
  const remaining = Math.max(0, config.maxAttempts - entry.count)
  const resetAt = new Date(entry.resetAt)

  return { allowed, remaining, resetAt }
}

/**
 * Increment the signup attempt counter
 */
export async function incrementSignupAttempt(
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const clientId = await getClientIdentifier()
  const now = Date.now()

  let entry = signupAttempts.get(clientId)

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
  } else {
    entry.count++
  }

  signupAttempts.set(clientId, entry)
}

/**
 * Rate limit middleware for signup
 */
export async function signupRateLimiter(
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; error?: string; resetAt?: Date }> {
  const { allowed, remaining, resetAt } = await checkSignupRateLimit(config)

  if (!allowed) {
    const minutesUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / 1000 / 60)
    return {
      success: false,
      error: `Too many signup attempts. Please try again in ${minutesUntilReset} minutes.`,
      resetAt,
    }
  }

  // Increment the counter for this attempt
  await incrementSignupAttempt(config)

  return { success: true }
}

/**
 * Enhanced rate limiting with IP-based and email-based tracking
 */
export class EnhancedRateLimiter {
  private static ipAttempts = new Map<string, { count: number; resetAt: number }>()
  private static emailAttempts = new Map<string, { count: number; resetAt: number }>()

  static async checkLimit(
    email?: string,
    config: RateLimitConfig = DEFAULT_CONFIG
  ): Promise<{ allowed: boolean; error?: string }> {
    const clientId = await getClientIdentifier()
    const now = Date.now()

    // Check IP-based limit
    let ipEntry = this.ipAttempts.get(clientId)
    if (!ipEntry || ipEntry.resetAt < now) {
      ipEntry = { count: 0, resetAt: now + config.windowMs }
      this.ipAttempts.set(clientId, ipEntry)
    }

    if (ipEntry.count >= config.maxAttempts) {
      const minutesUntilReset = Math.ceil((ipEntry.resetAt - now) / 1000 / 60)
      return {
        allowed: false,
        error: `Too many attempts from your network. Please try again in ${minutesUntilReset} minutes.`,
      }
    }

    // Check email-based limit if email provided
    if (email) {
      const emailKey = email.toLowerCase()
      let emailEntry = this.emailAttempts.get(emailKey)

      if (!emailEntry || emailEntry.resetAt < now) {
        emailEntry = { count: 0, resetAt: now + config.windowMs }
        this.emailAttempts.set(emailKey, emailEntry)
      }

      if (emailEntry.count >= config.maxAttempts) {
        const minutesUntilReset = Math.ceil((emailEntry.resetAt - now) / 1000 / 60)
        return {
          allowed: false,
          error: `Too many attempts for this email. Please try again in ${minutesUntilReset} minutes.`,
        }
      }
    }

    return { allowed: true }
  }

  static async recordAttempt(email?: string): Promise<void> {
    const clientId = await getClientIdentifier()
    const now = Date.now()

    // Update IP counter
    const ipEntry = this.ipAttempts.get(clientId)
    if (ipEntry && ipEntry.resetAt > now) {
      ipEntry.count++
    }

    // Update email counter
    if (email) {
      const emailKey = email.toLowerCase()
      const emailEntry = this.emailAttempts.get(emailKey)
      if (emailEntry && emailEntry.resetAt > now) {
        emailEntry.count++
      }
    }
  }

  // Clean up old entries periodically
  static startCleanup(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now()

        // Clean IP attempts
        Array.from(this.ipAttempts.entries()).forEach(([key, value]) => {
          if (value.resetAt < now) {
            this.ipAttempts.delete(key)
          }
        })

        // Clean email attempts
        Array.from(this.emailAttempts.entries()).forEach(([key, value]) => {
          if (value.resetAt < now) {
            this.emailAttempts.delete(key)
          }
        })
      }, 60 * 60 * 1000) // Clean every hour
    }
  }
}

// Start cleanup on module load
EnhancedRateLimiter.startCleanup()