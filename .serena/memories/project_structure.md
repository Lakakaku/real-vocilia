# Vocilia Project Structure

## Project Overview
Vocilia is a production-ready business dashboard for an AI-powered customer feedback platform. It rewards customers with cashback for quality feedback via voice conversations.

## Tech Stack
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage), Railway (Voice processing)
- **AI**: GPT-4o-mini for context assistant
- **Deployment**: Vercel (multi-domain hosting)

## Key Services
- Supabase Project: ervnxnbxsaaeakbvwieh
- Vercel Project: real-vocilia 
- Railway Project: e8cca9a7-9604-4202-a44b-8266aed13561

## URL Structure
- Customer Platform: vocilia.com
- Business Platform: business.vocilia.com  
- Admin Platform: admin.vocilia.com

## Database Schema
Main tables: businesses, business_contexts, stores, feedbacks, verifications, payments, admin_logs

## Directory Structure
- `/app` - Next.js app router pages and layouts
- `/components` - Reusable UI components 
- `/lib` - Utilities, services, Supabase clients
- `/types` - TypeScript type definitions
- `/hooks` - Custom React hooks
- `/utils` - Utility functions

## Key Features
- Business onboarding (6 steps)
- Context management with AI assistance
- Verification workflow 
- Feedback analytics
- Store code generation & QR codes

## Production Requirements
- Everything is REAL from day one (no demo data)
- Production-first security and error handling
- Comprehensive logging
- Real but minimal transaction amounts for testing