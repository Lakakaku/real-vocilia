# Vocilia Project Overview

## Purpose
Building a production-ready business dashboard for Vocilia - an AI-powered customer feedback platform that rewards customers with cashback for quality feedback via voice conversations.

## Critical Production-First Development
⚠️ NO DEMO ENVIRONMENT - EVERYTHING IS REAL FROM DAY ONE ⚠️
- All accounts created are REAL production accounts
- Use actual (small) transactions when testing payments
- Database is production from the start
- No test data, no fake feedback, no sample businesses

## Multi-Domain Architecture
- **Customer Platform**: vocilia.com - Simple landing page for QR code entry
- **Business Platform**: business.vocilia.com - Business dashboard with authentication
- **Admin Platform**: admin.vocilia.com - Manual account creation and batch management

## Core Business Flow
1. Customers scan QR codes → Enter store code → Voice feedback
2. AI scores feedback quality → 3-15% cashback calculated
3. Admin sends payment batch → Businesses have 7 days to verify
4. Businesses verify transactions → Upload verified CSV
5. Admin releases feedback → Appears in business dashboards
6. Customers get paid → Consolidated Swish payments

## Already Created Services
- **Supabase Project**: ervnxnbxsaaeakbvwieh (Database, Auth, Storage)
- **Vercel Project**: real-vocilia (Hosts all three domains)
- **Railway Project**: e8cca9a7-9604-4202-a44b-8266aed13561 (Voice processing, background jobs)

## Tech Stack
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- Backend: Supabase (Database, Auth, Storage), Railway (Voice processing)
- AI: OpenAI GPT-4o-mini (Context assistant), OpenAI Whisper (Voice-to-text)
- Payments: Swish Business API