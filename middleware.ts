import { NextResponse, type NextRequest } from 'next/server'

// CORS configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

// Allowed origins for CORS
const getAllowedOrigins = (isDevelopment: boolean) => {
  const origins = [
    'https://vocilia.com',
    'https://business.vocilia.com',
    'https://admin.vocilia.com',
  ]

  if (isDevelopment) {
    origins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002')
  }

  return origins
}

// Security headers per platform
const getSecurityHeaders = (platform: 'customer' | 'business' | 'admin') => {
  const baseHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  }

  // Platform-specific CSP
  const cspPolicies = {
    customer: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com;",
    business: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com;",
    admin: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co;",
  }

  return {
    ...baseHeaders,
    'Content-Security-Policy': cspPolicies[platform],
  }
}

export async function middleware(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const origin = request.headers.get('origin') || ''
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Determine platform based on hostname
  const isBusinessDomain = hostname.includes('business.') || (isDevelopment && hostname.includes('localhost') && pathname.startsWith('/business'))
  const isAdminDomain = hostname.includes('admin.') || (isDevelopment && hostname.includes('localhost') && pathname.startsWith('/admin'))
  const isCustomerDomain = !isBusinessDomain && !isAdminDomain

  const platform = isAdminDomain ? 'admin' : isBusinessDomain ? 'business' : 'customer'

  // Handle root path redirects based on domain
  if (pathname === '/' || pathname === '/business' || pathname === '/admin') {
    if (isBusinessDomain) {
      // Redirect business domain root to login
      return NextResponse.redirect(new URL('/business/login', request.url))
    }
    if (isAdminDomain) {
      // Redirect admin domain root to login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    // Customer domain shows the main page
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const allowedOrigins = getAllowedOrigins(isDevelopment)
    const headers = new Headers()

    if (allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      headers.set(key, value)
    })

    return new NextResponse(null, { status: 200, headers })
  }

  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply security headers
  const securityHeaders = getSecurityHeaders(platform)
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply CORS headers for API routes
  if (pathname.startsWith('/api')) {
    const allowedOrigins = getAllowedOrigins(isDevelopment)

    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')

      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
  }

  // Note: Auth protection is handled by individual pages/routes
  // since middleware runs on Edge Runtime and cannot use Supabase client

  // Log domain routing for debugging (remove in production)
  if (isDevelopment) {
    console.log(`[Middleware] Platform: ${platform}, Path: ${pathname}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - static assets with extensions
     */
    '/((?!_next/static|_next/image|_next/webpack|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$).*)',
  ],
}