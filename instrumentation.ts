export async function register() {
  // Server-side instrumentation
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Sentry for server-side
    await import('./sentry.server.config');
  }

  // Edge runtime instrumentation
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import and initialize Sentry for edge runtime
    await import('./sentry.edge.config');
  }
}