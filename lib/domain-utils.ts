/**
 * Domain utilities for multi-domain routing support
 */

// Domain configuration
export const DOMAINS = {
  customer: process.env.NEXT_PUBLIC_CUSTOMER_URL || 'https://vocilia.com',
  business: process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business.vocilia.com',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.vocilia.com',
  api: process.env.NEXT_PUBLIC_API_URL || 'https://api.vocilia.com',
} as const

// Development domains
export const DEV_DOMAINS = {
  customer: 'http://localhost:3000',
  business: 'http://localhost:3000/business',
  admin: 'http://localhost:3000/admin',
  api: 'http://localhost:3000/api',
} as const

/**
 * Get the current domain type based on hostname
 */
export function getDomainType(hostname: string): 'customer' | 'business' | 'admin' | null {
  if (!hostname) return null

  // Check for admin domain
  if (hostname.includes('admin.')) return 'admin'

  // Check for business domain
  if (hostname.includes('business.')) return 'business'

  // Check for localhost with path prefix (development)
  if (hostname.includes('localhost')) {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.startsWith('/admin')) return 'admin'
      if (path.startsWith('/business')) return 'business'
    }
    return 'customer'
  }

  // Default to customer domain
  if (hostname.includes('vocilia.com') && !hostname.includes('business.') && !hostname.includes('admin.')) {
    return 'customer'
  }

  return null
}

/**
 * Check if current domain is customer platform
 */
export function isCustomerDomain(): boolean {
  if (typeof window === 'undefined') return false
  return getDomainType(window.location.hostname) === 'customer'
}

/**
 * Check if current domain is business platform
 */
export function isBusinessDomain(): boolean {
  if (typeof window === 'undefined') return false
  return getDomainType(window.location.hostname) === 'business'
}

/**
 * Check if current domain is admin platform
 */
export function isAdminDomain(): boolean {
  if (typeof window === 'undefined') return false
  return getDomainType(window.location.hostname) === 'admin'
}

/**
 * Get the appropriate API endpoint based on current domain
 */
export function getAPIEndpoint(path: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const baseUrl = isDevelopment ? DEV_DOMAINS.api : DOMAINS.api

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${normalizedPath}`
}

/**
 * Get domain URL by type
 */
export function getDomainURL(type: 'customer' | 'business' | 'admin'): string {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return DEV_DOMAINS[type]
  }

  return DOMAINS[type]
}

/**
 * Redirect to a different domain
 */
export function redirectToDomain(
  type: 'customer' | 'business' | 'admin',
  path?: string
): void {
  if (typeof window === 'undefined') return

  const domainUrl = getDomainURL(type)
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''

  window.location.href = `${domainUrl}${normalizedPath}`
}

/**
 * Build cross-domain link
 */
export function buildCrossDomainLink(
  type: 'customer' | 'business' | 'admin',
  path?: string
): string {
  const domainUrl = getDomainURL(type)
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''

  return `${domainUrl}${normalizedPath}`
}

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig(hostname?: string) {
  const domainType = hostname
    ? getDomainType(hostname)
    : typeof window !== 'undefined'
    ? getDomainType(window.location.hostname)
    : null

  switch (domainType) {
    case 'customer':
      return {
        name: 'Vocilia',
        theme: 'customer',
        primaryColor: 'blue',
        features: {
          feedback: true,
          rewards: true,
          qrScanning: true,
        },
      }
    case 'business':
      return {
        name: 'Vocilia Business',
        theme: 'business',
        primaryColor: 'indigo',
        features: {
          dashboard: true,
          analytics: true,
          verification: true,
          stores: true,
          context: true,
        },
      }
    case 'admin':
      return {
        name: 'Vocilia Admin',
        theme: 'admin',
        primaryColor: 'red',
        features: {
          businessManagement: true,
          paymentProcessing: true,
          feedbackRelease: true,
          systemMonitoring: true,
        },
      }
    default:
      return {
        name: 'Vocilia',
        theme: 'default',
        primaryColor: 'blue',
        features: {},
      }
  }
}

/**
 * Check if a feature is enabled for the current platform
 */
export function isFeatureEnabled(feature: string): boolean {
  const config = getPlatformConfig()
  return config.features[feature as keyof typeof config.features] === true
}

/**
 * Get CORS allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const origins = [
    DOMAINS.customer,
    DOMAINS.business,
    DOMAINS.admin,
  ]

  if (isDevelopment) {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000'
    )
  }

  return origins
}

/**
 * Validate if an origin is allowed for CORS
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.includes(origin)
}

/**
 * Get the authentication redirect URL based on platform
 */
export function getAuthRedirectURL(type: 'customer' | 'business' | 'admin'): string {
  const domainUrl = getDomainURL(type)

  switch (type) {
    case 'customer':
      return domainUrl // Customer platform doesn't require auth for most features
    case 'business':
      return `${domainUrl}/dashboard`
    case 'admin':
      return `${domainUrl}/dashboard`
    default:
      return domainUrl
  }
}

/**
 * Get the login URL for a specific platform
 */
export function getLoginURL(type: 'customer' | 'business' | 'admin'): string {
  const domainUrl = getDomainURL(type)

  switch (type) {
    case 'customer':
      return domainUrl // Customer platform has minimal auth
    case 'business':
      return `${domainUrl}/login`
    case 'admin':
      return `${domainUrl}/login`
    default:
      return domainUrl
  }
}

// Export types for TypeScript
export type DomainType = 'customer' | 'business' | 'admin'
export type PlatformFeatures = ReturnType<typeof getPlatformConfig>['features']