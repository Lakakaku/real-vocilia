# Deployment Configuration Guide

## Environment Variables

### Required Environment Variables

All environment variables must be configured in the respective platforms:

#### Vercel Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Dashboard > Settings > API]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard > Settings > API]

# OpenAI Configuration
OPENAI_API_KEY=[Your OpenAI API Key]

# URLs (Production)
NEXT_PUBLIC_APP_URL=https://vocilia.com
NEXT_PUBLIC_BUSINESS_URL=https://business.vocilia.com
NEXT_PUBLIC_ADMIN_URL=https://admin.vocilia.com

# Railway Service
RAILWAY_SERVICE_URL=[Get from Railway Dashboard]

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=[Get from Sentry Project Settings]
SENTRY_AUTH_TOKEN=[Get from Sentry Auth Tokens]
SENTRY_ORG=vocilia
SENTRY_PROJECT=vocilia-platform
```

#### Railway Environment Variables
```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Same as Vercel]

# OpenAI Configuration
OPENAI_API_KEY=[Same as Vercel]
```

## Domain Configuration

### Required Domains

The following domains need to be configured in Vercel:

1. **vocilia.com** - Customer platform
2. **business.vocilia.com** - Business dashboard
3. **admin.vocilia.com** - Admin panel

### DNS Configuration

Add the following DNS records to your domain provider:

```
# Main domain
vocilia.com          A     76.76.21.21
vocilia.com          AAAA  2606:4700:3037::6815:2a15

# Business subdomain
business.vocilia.com CNAME cname.vercel-dns.com

# Admin subdomain
admin.vocilia.com    CNAME cname.vercel-dns.com
```

## Deployment Pipeline

### Automatic Deployments

The project is configured for automatic deployments:

- **Production**: Pushes to `main` branch trigger production deployments
- **Preview**: Pull requests create preview deployments
- **Branch Deployments**: Feature branches create preview URLs

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy with specific environment
vercel --env production
```

## Service Configuration

### Vercel Configuration

The `vercel.json` file includes:

- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Caching Strategy**: Optimized for static assets and API routes
- **Edge Functions**: Configured with appropriate timeouts
- **Cron Jobs**: Weekly batch processing and verification reminders
- **Performance Monitoring**: Speed Insights and Analytics enabled

### Railway Configuration

The `railway.json` file includes:

- **Voice Processing Service**: Handles voice AI interactions
- **Background Jobs Service**: Processes weekly batches and payments
- **Cron Jobs**: Automated weekly operations
- **Health Checks**: Monitoring endpoints

### Sentry Configuration

Error tracking and performance monitoring is configured with:

- **Client-side monitoring**: Browser errors and performance
- **Server-side monitoring**: API errors and database issues
- **Edge runtime monitoring**: Edge function errors
- **Performance tracking**: Web Vitals and custom metrics
- **Release tracking**: Automatic source map upload

## Performance Optimization

### CDN Configuration

Static assets are served with optimized caching:

- **Images**: 30 days cache with stale-while-revalidate
- **Fonts**: Immutable, 1 year cache
- **CSS/JS**: 24 hours cache with 7 days stale-while-revalidate
- **API Routes**: No cache, always fresh

### Edge Caching

- **Homepage**: 24 hours edge cache
- **Static Pages**: 7 days with stale-while-revalidate
- **Dynamic Routes**: No cache for authenticated pages

## Monitoring Setup

### Sentry Integration

1. Create a Sentry project at https://sentry.io
2. Get your DSN from Project Settings > Client Keys
3. Create an auth token from Settings > Auth Tokens
4. Add environment variables to Vercel

### Performance Monitoring

Web Vitals are automatically tracked:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8s
- **TTFB** (Time to First Byte): < 800ms

### Custom Metrics

The application tracks:

- Page load times
- API response times
- Form submission performance
- Search query performance
- Component render times

## Security Configuration

### Content Security Policy

The CSP is configured to allow:

- Scripts from self and Sentry
- Styles from self (inline allowed for Tailwind)
- Images from self, data URIs, and HTTPS
- Connections to Supabase, Sentry, and OpenAI

### CORS Policy

API routes are configured with:

- Credentials allowed
- Specific origin allowlist
- Proper preflight handling

## Testing Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Domains DNS propagated
- [ ] SSL certificates active
- [ ] Railway services running
- [ ] Sentry receiving events
- [ ] Database migrations applied

### Post-deployment Verification

```bash
# Test main domain
curl -I https://vocilia.com

# Test business subdomain
curl -I https://business.vocilia.com

# Test admin subdomain
curl -I https://admin.vocilia.com

# Test API health
curl https://vocilia.com/api/health

# Test Railway service
curl $RAILWAY_SERVICE_URL/health
```

### Monitoring Dashboard Links

- **Vercel Dashboard**: https://vercel.com/lakakas-projects-b9fec40c/real-vocilia
- **Railway Dashboard**: https://railway.app/project/e8cca9a7-9604-4202-a44b-8266aed13561
- **Sentry Dashboard**: https://sentry.io/organizations/vocilia/projects/vocilia-platform
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh

## Rollback Procedures

### Vercel Rollback

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]

# Or use dashboard
# Go to Vercel Dashboard > Deployments > Select deployment > Promote to Production
```

### Database Rollback

```sql
-- Check migration history
SELECT * FROM supabase_migrations ORDER BY executed_at DESC;

-- Rollback specific migration
-- Use Supabase Dashboard > Database > Migrations
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Check Vercel dashboard for correct values
   - Ensure no quotes in environment values
   - Rebuild after adding new variables

2. **Domain Not Working**
   - Verify DNS propagation (24-48 hours)
   - Check SSL certificate status in Vercel
   - Ensure domains added to Vercel project

3. **Railway Service Unavailable**
   - Check Railway deployment status
   - Verify environment variables match
   - Check service logs in Railway dashboard

4. **Sentry Not Receiving Events**
   - Verify DSN is correct
   - Check auth token permissions
   - Ensure Sentry package installed correctly

## Support

For deployment issues:

- **Vercel Support**: https://vercel.com/support
- **Railway Support**: https://railway.app/help
- **Sentry Support**: https://sentry.io/support/
- **Supabase Support**: https://supabase.com/support