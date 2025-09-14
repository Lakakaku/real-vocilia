import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
  if (pathname === '/') {
    if (isBusinessDomain) {
      // Redirect business domain root to login (use /login in production, /business/login in dev)
      const loginPath = isDevelopment ? '/business/login' : '/login'
      return NextResponse.redirect(new URL(loginPath, request.url))
    }
    if (isAdminDomain) {
      // Redirect admin domain root to login (use /login in production, /admin/login in dev)
      const loginPath = isDevelopment ? '/admin/login' : '/login'
      return NextResponse.redirect(new URL(loginPath, request.url))
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

  // Initialize Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value })
          response = NextResponse.next({
            request,
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.delete(name)
          response = NextResponse.next({
            request,
          })
          response.cookies.delete(name)
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection for customer platform
  if (isCustomerDomain) {
    // Customer platform has minimal protected routes
    const protectedPaths = ['/account', '/history']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    if (isProtectedPath && !user) {
      // For customer platform, we might want to handle this differently
      // For now, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Route protection for business platform
  if (isBusinessDomain) {
    const protectedPaths = ['/dashboard', '/context', '/feedback', '/verification', '/stores', '/settings', '/onboarding']
    // In production, the rewrite maps business.vocilia.com/* to /business/*
    // So the middleware sees /business/* paths even in production
    const isProtectedPath = protectedPaths.some(path =>
      pathname.startsWith('/business' + path) || pathname.startsWith(path)
    )
    const isAuthPath = pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/reset-password')

    if (isProtectedPath && !user) {
      const loginUrl = isDevelopment
        ? new URL('/business/login', request.url)
        : new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    if (isAuthPath && user) {
      const dashboardUrl = isDevelopment
        ? new URL('/business/dashboard', request.url)
        : new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Route protection for admin platform
  if (isAdminDomain) {
    const isAuthPath = pathname.includes('/login')
    const adminPaths = ['/dashboard', '/businesses', '/payments', '/feedback', '/settings']
    // In production, the rewrite maps admin.vocilia.com/* to /admin/*
    // So the middleware sees /admin/* paths even in production
    const isAdminPath = adminPaths.some(path =>
      pathname.startsWith('/admin' + path) || pathname.startsWith(path)
    )

    if (!isAuthPath && !user) {
      const loginUrl = isDevelopment
        ? new URL('/admin/login', request.url)
        : new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // TODO: Add admin role verification
    // This would require checking the admin_users table or user metadata
    if (user && isAdminPath) {
      // Verify admin role here
      // const isAdmin = await verifyAdminRole(user.id, supabase)
      // if (!isAdmin) {
      //   return NextResponse.redirect(new URL('/unauthorized', request.url))
      // }
    }
  }

  // Log domain routing for debugging (remove in production)
  if (isDevelopment) {
    console.log(`[Middleware] Platform: ${platform}, Path: ${pathname}, User: ${user?.email || 'anonymous'}`)
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}