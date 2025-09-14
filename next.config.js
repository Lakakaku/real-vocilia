const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Multi-domain routing configuration
  async headers() {
    return [
      // Cache control for root page - prevent caching issues
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Global security headers (enhanced by middleware for platform-specific needs)
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      // CORS headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Will be overridden by middleware for specific origins
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },

  // Rewrites for multi-domain support in development
  async rewrites() {
    // Only apply rewrites in development
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    return [
      // Business platform routes
      {
        source: '/business/:path*',
        destination: '/business/:path*',
      },
      // Admin platform routes
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
      // Customer feedback routes
      {
        source: '/feedback/:store_code',
        destination: '/feedback/:store_code',
      },
    ];
  },

  // Redirects for domain consistency
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.vocilia.com',
          },
        ],
        destination: 'https://vocilia.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.business.vocilia.com',
          },
        ],
        destination: 'https://business.vocilia.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.admin.vocilia.com',
          },
        ],
        destination: 'https://admin.vocilia.com/:path*',
        permanent: true,
      },
    ];
  },

  // Configure domains for multi-domain support
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    domains: [
      'ervnxnbxsaaeakbvwieh.supabase.co',
      'vocilia.com',
      'business.vocilia.com',
      'admin.vocilia.com',
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_CUSTOMER_URL: process.env.NEXT_PUBLIC_CUSTOMER_URL || 'https://vocilia.com',
    NEXT_PUBLIC_BUSINESS_URL: process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business.vocilia.com',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.vocilia.com',
  },

  // Webpack configuration for optimizations
  webpack: (config, { isServer }) => {
    // Optimizations for client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project
  org: 'vocilia',
  project: 'vocilia-platform',

  // Only upload source maps in production
  silent: true,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from public access
  hideSourceMaps: true,

  // Disable source map uploading in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',

  // Automatically instrument the app
  autoInstrumentServerFunctions: true,

  // Tree shake Sentry code in production
  widenClientFileUpload: true,

  // Tunnel to avoid ad blockers
  tunnelRoute: '/monitoring',

  // Associate commits
  release: process.env.VERCEL_GIT_COMMIT_SHA,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions, {
  // Additional options
  hideSourceMaps: true,
  transpileClientSDK: true,
});