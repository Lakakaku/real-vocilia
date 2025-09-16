# Research: Customer Entry Flow

## Overview
Research findings for implementing the customer entry flow - a mobile-optimized landing page for 6-digit store code entry.

## Technology Decisions

### Frontend Framework
**Decision**: Next.js 14+ with App Router
**Rationale**: Already in use, supports SSR/SSG for fast initial load, excellent mobile performance
**Alternatives considered**:
- Static HTML/JS: Too limited for future features
- React SPA: Slower initial load on mobile networks

### Form Handling
**Decision**: React Hook Form with Zod validation
**Rationale**: Lightweight, excellent TypeScript support, built-in validation
**Alternatives considered**:
- Formik: Heavier bundle size
- Native forms: Less user-friendly error handling

### Database Access
**Decision**: Supabase Client SDK with Row Level Security (RLS)
**Rationale**: Direct database queries from client, built-in security, real-time capabilities
**Alternatives considered**:
- REST API layer: Unnecessary complexity for simple validation
- Direct PostgreSQL: Security concerns

### Rate Limiting Strategy
**Decision**: Combination of client-side debouncing + Supabase Edge Functions
**Rationale**: Prevents both accidental and malicious submissions
**Implementation**:
- Client: 500ms debounce on form submission
- Server: IP-based rate limiting (5 attempts/minute) via Edge Function
- Database: Failed attempt logging for security monitoring

### Mobile Optimization
**Decision**: Progressive Web App (PWA) approach
**Rationale**: Works offline after first load, installable, native-like experience
**Key features**:
- Service Worker for offline capability
- Web App Manifest for installation
- Cache-first strategy for static assets

### Error Handling
**Decision**: User-friendly messages with recovery actions
**Rationale**: Customers need clear guidance, not technical details
**Error types**:
- Invalid format: "Please enter exactly 6 digits"
- Store not found: "This code is not recognized. Please check and try again"
- Network error: "Connection issue. Please check your internet and try again"
- Rate limited: "Too many attempts. Please wait a minute and try again"

## Security Considerations

### Input Validation
- **Client-side**: Regex pattern for 6 digits, immediate feedback
- **Server-side**: Parameterized queries, no direct SQL construction
- **Sanitization**: Strip all non-numeric characters before validation

### Store Code Security
- **No sequential codes**: Use random 6-digit generation
- **Expiration**: Codes can be deactivated by businesses
- **Logging**: Track all validation attempts for audit

## Performance Optimizations

### Initial Load
- **Static generation**: Landing page pre-rendered at build time
- **Minimal JavaScript**: Only load form validation logic
- **Inline critical CSS**: Reduce render-blocking resources
- **Target**: < 50KB initial bundle

### Database Queries
- **Index on store_code**: O(1) lookup performance
- **Connection pooling**: Via Supabase built-in pooler
- **Query optimization**: Single SELECT with specific columns

## Accessibility Requirements

### Form Accessibility
- **Labels**: Explicit association with input field
- **ARIA attributes**: aria-invalid, aria-describedby for errors
- **Keyboard navigation**: Full keyboard support
- **Screen readers**: Meaningful error announcements

### Mobile Considerations
- **Touch targets**: Minimum 44x44px for all interactive elements
- **Font sizes**: Minimum 16px to prevent zoom on iOS
- **Contrast ratios**: WCAG AA compliance (4.5:1 minimum)

## Testing Strategy

### Unit Tests
- Form validation logic
- Input sanitization functions
- Error message generation

### Integration Tests
- Database connection and queries
- Rate limiting behavior
- Error handling flows

### E2E Tests
- Complete user journey from QR scan to redirect
- Mobile device emulation
- Offline functionality

## Deployment Considerations

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from dashboard]
```

### Vercel Configuration
- **Regions**: Auto (global edge network)
- **Functions**: Edge runtime for API routes
- **Caching**: Stale-while-revalidate for static assets

## Future Enhancements

### Phase 2 Possibilities
- QR code scanner directly in web app
- Store location detection
- Multi-language support
- Analytics integration

### Technical Debt to Monitor
- Rate limiting may need Redis for scale
- Consider CDN for static assets at scale
- Database read replicas if validation becomes bottleneck

## Resolved Clarifications

All NEEDS CLARIFICATION items from the spec have been resolved:

1. **Expired codes handling**: Show generic "invalid code" message (same as non-existent)
2. **Offline behavior**: Use service worker to show cached page with offline message
3. **Rate limiting**: 5 attempts per minute per IP address
4. **Performance target**: < 2 seconds on 3G, < 1 second on 4G
5. **Accessibility**: Basic compliance, full WCAG AA in future phase