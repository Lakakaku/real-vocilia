# CLAUDE.md - Vocilia Business Platform Development Guide

## Project Overview
Building a production-ready business dashboard for Vocilia - an AI-powered customer feedback platform that rewards customers with cashback for quality feedback via voice conversations.

## Critical: Production-First Development
� **NO DEMO ENVIRONMENT - EVERYTHING IS REAL FROM DAY ONE** �
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

### Active Feature: Payment Verification Dashboard System (003-7-1-verification)
**Branch**: `003-7-1-verification`
**Status**: Implementation Planning Complete

#### Technology Stack
- **Language/Version**: TypeScript 5.5+ / Node.js 20+
- **Primary Dependencies**: Next.js 14.2.5, Supabase (@supabase/supabase-js 2.39.3), React Hook Form 7.62.0, Tailwind CSS, Shadcn/ui, Zod 3.23.8, OpenAI API
- **Storage**: Supabase PostgreSQL with existing business/store schema, new verification tables, Supabase Storage for CSV files
- **Testing**: Vitest, React Testing Library, contract testing, Playwright (E2E)
- **Target Platform**: Web application (business.vocilia.com), mobile-responsive

#### Feature Description
Create a comprehensive payment verification dashboard system for weekly business-admin data exchange with 7-day deadlines, fraud detection, and automated approval. Admin sends payment batches to businesses who verify transactions against POS records and upload results.

#### Key Requirements
- 7-day verification deadline management with countdown timers
- CSV download/upload for payment batch processing
- AI-powered fraud detection with risk scoring (0-100)
- Real-time verification progress tracking
- Automated approval for missed deadlines
- Complete audit trail for compliance
- Mobile-optimized verification interface

#### Implementation Decisions
- Supabase Storage for secure CSV file handling with RLS
- OpenAI GPT-4o-mini for fraud detection assistance
- Real-time countdown timers with server-side authority
- Progressive Web App approach for offline capability
- IP-based rate limiting and audit logging
- Multi-factor fraud scoring algorithm

#### New Database Tables
- `payment_batches`: Weekly transaction collections from admin
- `verification_sessions`: Business verification workflow management
- `verification_results`: Individual transaction verification decisions
- `fraud_assessments`: AI-generated risk analysis
- `verification_audit_logs`: Complete activity tracking

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
1. **Payment Verification System** - Comprehensive verification dashboard with AI fraud detection
2. **CSV File Processing** - Secure upload/download with Supabase Storage integration
3. **Deadline Management** - Real-time countdown timers with auto-approval fallback
4. **Audit System** - Complete activity tracking for compliance requirements

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
*Last updated: 2025-09-16 | Feature: 003-7-1-verification*