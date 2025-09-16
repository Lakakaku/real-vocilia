# CLAUDE.md - Vocilia Business Platform Development Guide

## Project Overview
Building a production-ready business dashboard for Vocilia - an AI-powered customer feedback platform that rewards customers with cashback for quality feedback via voice conversations.

## Critical: Production-First Development
  **NO DEMO ENVIRONMENT - EVERYTHING IS REAL FROM DAY ONE**  
- All accounts created are REAL production accounts
- Use actual (small) transactions when testing payments
- Database is production from the start
- No test data, no fake feedback, no sample businesses

## Project Infrastructure

### Already Created Services
- **Supabase Project**: ervnxnbxsaaeakbvwieh
  - Dashboard: https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh
  - PostgreSQL database for all data
  - Authentication system ready
  - File storage for CSVs and uploads

- **Vercel Project**: real-vocilia
  - Dashboard: https://vercel.com/lakakas-projects-b9fec40c/real-vocilia
  - Hosts all three domains
  - Next.js 14+ with TypeScript

- **Railway Project**: e8cca9a7-9604-4202-a44b-8266aed13561
  - Service ID: 80545867-88f8-409a-a75e-4087224e5be1
  - For voice processing and background jobs

## Current Development Context

### Active Feature: Customer Entry Flow (002-6-3-customer)
**Branch**: `002-6-3-customer`
**Status**: Implementation Planning Complete

#### Technology Stack
- **Language/Version**: TypeScript 5.x / Node.js 20+
- **Primary Dependencies**: Next.js 14+, Supabase Client SDK, React Hook Form, Tailwind CSS, Shadcn/ui
- **Storage**: Supabase PostgreSQL (existing project: ervnxnbxsaaeakbvwieh)
- **Testing**: Vitest, React Testing Library, Playwright (E2E)
- **Target Platform**: Web (mobile-first responsive), deployed on Vercel

#### Feature Description
Create a minimal, mobile-optimized landing page at vocilia.com where customers can enter 6-digit store codes after scanning QR codes. The system validates codes against the Supabase database and redirects to the feedback page.

#### Key Requirements
- Accept exactly 6 numeric digits as valid store code input
- Validate store codes exist in system database
- Redirect valid entries to vocilia.com/feedback/{store_code}
- Mobile-optimized with responsive design
- Rate limiting: 5 attempts per minute per IP
- Performance: < 2s load on 3G, < 1s submission on 4G

#### Implementation Decisions
- React Hook Form with Zod for form validation
- Supabase RLS for secure database access
- Progressive Web App approach for offline capability
- IP-based rate limiting via Edge Functions
- Service Worker for offline functionality

#### New Database Tables
- `store_code_validations`: Tracks validation attempts for security monitoring

## URL Structure
- **Customer Platform**: vocilia.com
  - Landing page for QR code entry (current feature)
  - Customer enters 6-digit store code
  - Redirects to vocilia.com/feedback/{store_code}

- **Business Platform**: business.vocilia.com
  - Business dashboard and management

- **Admin Platform**: admin.vocilia.com
  - Manual account creation only
  - Weekly batch management

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[get-from-settings]
SUPABASE_SERVICE_ROLE_KEY=[get-from-settings]
OPENAI_API_KEY=[your-key]
```

## Testing Approach
- Unit tests with Vitest
- Integration tests for API endpoints
- E2E tests with Playwright
- Test with real data but minimal amounts (1-5 SEK)

## Recent Changes
1. **Customer Entry Flow** - Implemented mobile-optimized landing page with 6-digit code validation
2. **Rate Limiting** - Added IP-based rate limiting for security
3. **Database Schema** - Added store_code_validations table for audit logging

## Commands Reference
```bash
# Development
npm run dev           # Start development server
npm run build        # Build for production
npm run test         # Run all tests

# Database
npm run supabase:migrate  # Run migrations
npm run supabase:types    # Generate TypeScript types

# Deployment
git push origin main  # Auto-deploy to Vercel
```

## Important Notes
- Always build with production security in mind
- Use feature flags for incomplete features
- Implement proper error handling
- Add comprehensive logging
- Test with real but minimal data
- No placeholder content - everything functional

---
*Last updated: 2025-09-16 | Feature: 002-6-3-customer*