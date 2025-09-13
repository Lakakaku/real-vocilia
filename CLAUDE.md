CLAUDE.md - Vocilia Business Platform Development Guide
Project Overview
Building a production-ready business dashboard for Vocilia - an AI-powered customer feedback platform that rewards customers with cashback for quality feedback via voice conversations.
Critical: Production-First Development
⚠️ NO DEMO ENVIRONMENT - EVERYTHING IS REAL FROM DAY ONE ⚠️

All accounts created are REAL production accounts
Use actual (small) transactions when testing payments
Database is production from the start
No test data, no fake feedback, no sample businesses

Project Infrastructure
Already Created Services

Supabase Project: ervnxnbxsaaeakbvwieh

Dashboard: https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh
PostgreSQL database for all data
Authentication system ready
File storage for CSVs and uploads


Vercel Project: real-vocilia

Dashboard: https://vercel.com/lakakas-projects-b9fec40c/real-vocilia
Hosts all three domains
Next.js 14+ with TypeScript


Railway Project: e8cca9a7-9604-4202-a44b-8266aed13561

Service ID: 80545867-88f8-409a-a75e-4087224e5be1
For voice processing and background jobs



URL Structure
Customer Platform: vocilia.com

Simple landing page for QR code entry
Customer enters 6-digit store code
Redirects to vocilia.com/feedback/{store_code}
No customer accounts needed

Business Platform: business.vocilia.com

/login - Business login
/signup - New business registration (3 fields only)
/dashboard - Main overview (post-login)
/context - AI-powered context management
/feedback - Weekly feedback analytics
/verification - Upload verified databases
/stores - Manage locations & QR codes
/settings - Account configuration

Admin Platform: admin.vocilia.com

Manual account creation only
Weekly batch management
Payment processing

Core Business Flow
Weekly Cycle

Customers scan QR codes → Enter store code → Voice feedback
AI scores feedback quality → 3-15% cashback calculated
Admin sends payment batch → Businesses have 7 days to verify
Businesses verify transactions → Upload verified CSV
Admin releases feedback → Appears in business dashboards
Customers get paid → Consolidated Swish payments

Key Features to Build
Core Authentication & Setup

Basic authentication (Supabase Auth)
Business registration (3 fields: name, email, password)
Comprehensive onboarding flow (6 steps)
Dashboard layout and navigation
Store code generation system

Context Management System

AI context assistant (GPT-4o-mini integration)
Context categories and storage
Onboarding data pre-population
Custom question configuration
Context completeness scoring

Verification Workflow

Payment batch reception from admin
CSV download functionality
7-day countdown timer
Verification upload portal
Status tracking dashboard

Feedback Analytics Dashboard

Weekly feedback release display
Search and filtering system
Quality score breakdown
Trend analysis
Multi-store comparison (if applicable)

Admin System

Admin dashboard at admin.vocilia.com
Business list management
Payment batch creation
Feedback release system
Invoice generation

Database Schema (Supabase)
sql-- Core tables needed
businesses (id, name, email, created_at, subscription_status)
business_contexts (id, business_id, context_data, completeness_score)
stores (id, business_id, name, store_code, location)
feedbacks (id, store_id, phone, amount, quality_score, reward_amount, week)
verifications (id, business_id, week, status, deadline, uploaded_at)
payments (id, phone, amount, week, status, paid_at)
admin_logs (id, action, admin_id, timestamp, details)
Environment Variables Needed
env# Supabase (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[get-from-settings]
SUPABASE_SERVICE_ROLE_KEY=[get-from-settings]

# OpenAI
OPENAI_API_KEY=[your-key]

# URLs
NEXT_PUBLIC_APP_URL=https://vocilia.com
NEXT_PUBLIC_BUSINESS_URL=https://business.vocilia.com
NEXT_PUBLIC_ADMIN_URL=https://admin.vocilia.com

# Railway
RAILWAY_SERVICE_URL=[get-from-railway]
Tech Stack
Frontend

Next.js 14+ (App Router)
TypeScript
Tailwind CSS
Shadcn/ui components
React Hook Form
React Query/SWR

Backend

Supabase (Database, Auth, Storage)
Railway (Voice processing, background jobs)
GPT-4o-mini (Context assistant)

Development Approach
Getting Started

Clone repository
Install dependencies: npm install
Set up environment variables
Run locally: npm run dev
Deploy to Vercel: Auto-deploy on push to main

Testing in Production

Create real business account (e.g., "Test Store 1")
Complete actual onboarding
Use small amounts (1-5 SEK) for payment testing
Generate real feedback through voice calls
Delete test accounts when done

Key Implementation Details
Onboarding Flow

Minimal registration (3 fields)
6-step educational onboarding
Pre-populates context system
Generates industry-specific templates

Context System

AI assistant guides context building
Weekly learning from feedback
Fraud detection patterns
85% completeness target

Verification Workflow

7-day countdown timer
CSV download/upload
Status tracking
Auto-approval if deadline missed

Payment System

Quality tiers: 3%, 5-8%, 10-12%, 15%
Platform fee: 20% on top of rewards
Weekly consolidated Swish payments
Invoice generation

Success Metrics

Context completeness: 85% within first week
Fraud detection: 95% accuracy
Verification completion: >90% on time
Customer participation: 10-20% of shoppers

Future Enhancements (Post-MVP)

POS system integrations (Square, Shopify)
Automated verification
Mobile app
Multi-language support
Advanced analytics

Important Notes

Always build with production security in mind
Use feature flags for incomplete features
Implement proper error handling
Add comprehensive logging
Test with real but minimal data
No placeholder content - everything functional

Support & Questions

Supabase docs: https://supabase.com/docs
Next.js docs: https://nextjs.org/docs
Railway docs: https://docs.railway.app
OpenAI API: https://platform.openai.com/docs

Remember: This is a REAL production system from day one. Build accordingly.