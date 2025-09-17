# TASKS.md - Vocilia Platform Development Roadmap

## PROJECT OVERVIEW
Building a production-ready business dashboard for Vocilia - an AI-powered customer feedback platform with cashback rewards via voice conversations.

**⚠️ CRITICAL: PRODUCTION-FIRST DEVELOPMENT - NO DEMO ENVIRONMENT ⚠️**
- All accounts are REAL production accounts from day one
- Database is production from the start
- Use actual (small) transactions when testing payments
- No test data, no fake feedback, no sample businesses

---

## PHASE 1: Foundation & Infrastructure Setup ✅ COMPLETED
**Timeline: Already Done**
**Status: Vercel, Supabase, and Railway projects already created with necessary keys/URLs**

---

## PHASE 2: Database Architecture & Security
**Timeline: Week 1**
**Priority: CRITICAL - Must be production-ready from start**

### 2.1 Core Database Schema Design ✅
**Agent: supabase-architect**
- [x] Create businesses table with production constraints
- [x] Create business_contexts table with JSONB for flexible context storage
- [x] Create stores table with unique 6-digit code generation
- [x] Create feedbacks table with quality scoring fields
- [x] Create verifications table for weekly cycles
- [x] Create payments table for Swish tracking
- [x] Create admin_logs table for audit trail
- [x] Set up proper indexes for performance

### 2.2 Security & RLS Implementation ✅
**Agent: supabase-architect + security-authentication**
- [x] Implement Row Level Security on all tables
- [x] Create business isolation policies (user_id foreign keys)
- [x] Set up admin-only table protections
- [x] Configure auth.users integration
- [x] Create secure service role functions
- [x] Implement rate limiting policies
- [x] Set up data encryption for sensitive fields

### 2.3 Database Functions & Triggers
**Agent: supabase-architect**
- [x] Create store code generation function (6-digit alphanumeric)
- [x] Create verification deadline trigger (7-day countdown)
- [x] Create feedback quality score calculation function
- [x] Create payment consolidation function
- [x] Create audit logging triggers
- [x] Create context completeness scoring function

---

## PHASE 3: Authentication & Core Infrastructure
**Timeline: Week 1-2**
**Priority: HIGH - Required for all other features**

### 3.1 Supabase Auth Configuration ✅
**Agent: security-authentication + frontend-specialist**
- [x] Set up business account authentication
- [x] Configure JWT tokens with proper expiration
- [x] Implement password requirements (production standards)
- [x] Create password reset flow
- [x] Set up email verification
- [x] Configure auth redirects for business.vocilia.com

### 3.2 Multi-Domain Routing Setup ✅
**Agent: frontend-specialist**
- [x] Configure Next.js for multi-domain support
- [x] Set up domain detection middleware
- [x] Create routing for vocilia.com (customer entry)
- [x] Create routing for business.vocilia.com (business dashboard)
- [x] Create routing for admin.vocilia.com (admin panel)
- [x] Implement proper CORS policies

### 3.3 Environment & Deployment Configuration ✅
**Agent: frontend-specialist**
- [x] Configure production environment variables in Vercel
- [x] Set up automatic deployments from main branch
- [x] Configure Railway service endpoints
- [x] Set up monitoring and error tracking (Sentry)
- [x] Configure CDN and caching strategies

---

## PHASE 4: Business Registration & Onboarding
**Timeline: Week 2-3**
**Priority: HIGH - First user touchpoint**

### 4.1 Registration Flow (3-Field Signup) ✅
**Agent: business-onboarding + frontend-specialist**
- [x] Create minimal signup page at business.vocilia.com/signup
- [x] Implement 3-field form (company name, email, password)
- [x] Add real-time validation (production accounts)
- [x] Create account in Supabase (real production account)
- [x] Send welcome email
- [x] Auto-redirect to dashboard for onboarding

### 4.2 Comprehensive Onboarding System (6 Steps) ✅
**Agent: business-onboarding**
- [x] Step 1: Welcome & value proposition carousel
- [x] Step 2: Educational content about feedback importance
- [x] Step 3: Business profile setup (type, locations, size)
- [x] Step 4: Technical integration preferences
- [x] Step 5: Success goals selection
- [x] Step 6: Quick context starter with AI response
- [x] Implement progress tracking and gamification
- [x] Create celebration screen and next steps checklist

### 4.3 Onboarding-to-Context Integration ✅
**Agent: business-onboarding + ai-integration**
- [x] Auto-populate context from onboarding data
- [x] Create industry-specific templates
- [x] Map business type to pre-filled departments
- [x] Transfer transaction patterns to context
- [x] Generate initial custom questions from goals
- [x] Calculate initial context completeness score

---

## PHASE 5: AI-Powered Context Management System
**Timeline: Week 3-4**
**Priority: HIGH - Critical for fraud detection and insights**

### 5.1 GPT-4o-mini Integration ✅
**Agent: ai-integration**
- [x] Set up OpenAI API integration
- [x] Configure GPT-4o-mini for Swedish/English
- [x] Implement conversation memory system
- [x] Create context-aware prompting
- [x] Set up response validation and fallbacks
- [x] Implement rate limiting and cost controls

### 5.2 Context Building Interface ✅
**Agent: business-onboarding + frontend-specialist**
- [x] Create /context route in business dashboard
- [x] Build conversational AI chat interface
- [x] Implement context categories UI
- [x] Create completeness score display (0-100%)
- [x] Build context editing capabilities
- [x] Add save/update functionality

### 5.3 AI Context Assistant Features
**Agent: ai-integration + business-onboarding**
- [x] Implement active context discovery
- [x] Create pattern recognition from feedback
- [x] Build continuous learning system
- [x] Implement context validation
- [x] Create weekly context suggestions
- [x] Build fraud pattern learning

### 5.4 Custom Question System ✅
**Agent: business-onboarding + ai-integration**
- [x] Create question configuration interface
- [x] Implement frequency settings (every Nth customer)
- [x] Build store-specific targeting
- [x] Add seasonal activation options
- [x] Auto-generate questions from goals
- [x] Integrate with voice AI system

---

## PHASE 6: Store Code & QR Code Management
**Timeline: Week 4**
**Priority: HIGH - Required for customer entry**

### 6.1 Store Code Generation System ✅
**Agent: qr-store-management**
- [x] Generate unique 6-digit alphanumeric codes
- [x] Create store-to-code mapping in database
- [x] Build multi-store support
- [x] Implement code rotation capability
- [x] Add geographic validation
- [x] Create rate limiting per phone number

### 6.2 QR Code Generation & Download
**Agent: qr-store-management + frontend-specialist**
- [ ] Create QR code generation for each store
- [ ] Add store code display below QR
- [ ] Generate multiple size variants (counter, wall, window)
- [ ] Create print-ready formats (PDF, PNG, SVG)
- [ ] Add Swedish/English instructions
- [ ] Build download center in dashboard

### 6.3 Customer Entry Flow ✅
**Agent: frontend-specialist + mobile-responsive**
- [x] Create minimal landing page at vocilia.com
- [x] Build 6-digit code entry form
- [x] Implement code validation
- [x] Create redirect to vocilia.com/feedback/{store_code}
- [x] Add error handling for invalid codes
- [x] Optimize for mobile QR code scanning

---

## PHASE 7: Weekly Verification Workflow
**Timeline: Week 5-6**
**Priority: CRITICAL - Core business operation**

### 7.1 Verification Dashboard Section ✅
**Agent: payment-verification + frontend-specialist**
- [x] Create verification section in business dashboard
- [x] Build countdown timer display (7-day)
- [x] Implement batch download functionality
- [x] Create CSV preview interface
- [x] Add verification status tracking
- [x] Build deadline notifications

### 7.2 Payment Batch Processing ✅
**Agent: payment-verification + csv-data-processor**
- [x] Implement payment batch reception from admin
- [x] Create CSV download with transaction details
- [x] Build verification interface (YES/NO marking)
- [x] Implement CSV upload functionality
- [x] Add format validation
- [x] Create confirmation screens

### 7.3 Automated Verification Features ✅
**Agent: payment-verification + ai-integration**
- [x] Build fraud detection assistance
- [x] Implement anomaly flagging
- [x] Create risk scoring (0-100)
- [x] Add pattern alerts
- [x] Build verification recommendations
- [x] Implement auto-approval after deadline

### 7.4 Data Exchange System ✅
**Agent: payment-verification + admin-dashboard**
- [x] Create admin-to-business data flow
- [x] Build business-to-admin upload system
- [x] Implement status synchronization
- [x] Create audit trail for all exchanges
- [x] Build confirmation notifications
- [x] Add error recovery mechanisms

---

## PHASE 8: Feedback Analytics Dashboard
**Timeline: Week 6-7**
**Priority: HIGH - Core value proposition**

### 8.1 Weekly Feedback Release System
**Agent: analytics-reporting + admin-dashboard**
- [ ] Build admin release mechanism
- [ ] Create notification system for new feedback
- [ ] Implement feedback population in /feedback route
- [ ] Build weekly summary generation
- [ ] Create automated categorization
- [ ] Add intelligent grouping

### 8.2 Search & Filtering System
**Agent: analytics-reporting + frontend-specialist**
- [ ] Implement sentiment-based search
- [ ] Create problem classification filters
- [ ] Build operational category filters
- [ ] Add temporal analysis tools
- [ ] Create release-based filtering
- [ ] Implement quick filter buttons

### 8.3 Analytics Visualizations
**Agent: analytics-reporting + frontend-specialist**
- [ ] Create feedback quality distribution charts
- [ ] Build trend analysis graphs
- [ ] Implement sentiment tracking
- [ ] Create issue frequency heatmaps
- [ ] Build multi-store comparison views
- [ ] Add ROI calculation displays

### 8.4 Multi-Store Analytics
**Agent: analytics-reporting**
- [ ] Build store comparison features
- [ ] Create performance benchmarking
- [ ] Implement best practice identification
- [ ] Add location-specific filtering
- [ ] Build regional grouping
- [ ] Create manager performance tracking

---

## PHASE 9: Admin Dashboard System
**Timeline: Week 7-8**
**Priority: HIGH - Required for operations**

### 9.1 Admin Authentication & Security
**Agent: admin-dashboard + security-authentication**
- [ ] Create manual admin account creation
- [ ] Implement separate admin auth flow
- [ ] Add two-factor authentication
- [ ] Configure IP whitelist
- [ ] Build comprehensive audit logging
- [ ] Create role-based permissions

### 9.2 Business Management Interface
**Agent: admin-dashboard**
- [ ] Create business list view
- [ ] Build feedback management per business
- [ ] Implement payment batch creation
- [ ] Add verification tracking dashboard
- [ ] Create bulk action capabilities
- [ ] Build search and filter tools

### 9.3 Weekly Operational Tools
**Agent: admin-dashboard + payment-verification**
- [ ] Build batch review interface
- [ ] Create payment batch generator
- [ ] Implement verification sender
- [ ] Add deadline tracker
- [ ] Build auto-approval system
- [ ] Create feedback release mechanism

### 9.4 Financial Management
**Agent: admin-dashboard + payment-verification**
- [ ] Build invoice generation system
- [ ] Create payment consolidation view
- [ ] Implement platform fee calculator
- [ ] Add financial reporting
- [ ] Build Swish batch export
- [ ] Create accounting integrations

---

## PHASE 10: Customer Feedback Collection
**Timeline: Week 8-9**
**Priority: CRITICAL - Revenue generation**

### 10.1 Customer Entry Interface
**Agent: frontend-specialist + mobile-responsive**
- [ ] Create vocilia.com/feedback/{store_code} route
- [ ] Build transaction detail form
- [ ] Implement time picker (purchase time)
- [ ] Add amount input with validation
- [ ] Create phone number collection
- [ ] Add Swedish number validation

### 10.2 Voice AI Integration
**Agent: ai-integration**
- [ ] Integrate voice recording in browser
- [ ] Implement WebRTC for real-time audio
- [ ] Set up OpenAI Whisper for transcription
- [ ] Configure Swedish language processing
- [ ] Build conversation flow logic
- [ ] Implement custom question injection

### 10.3 Quality Scoring System
**Agent: ai-integration + payment-verification**
- [ ] Implement legitimacy scoring (40% weight)
- [ ] Build depth analysis (25% weight)
- [ ] Create constructiveness scoring (20% weight)
- [ ] Add specificity evaluation (15% weight)
- [ ] Calculate final quality score
- [ ] Determine reward tier (3-15%)

### 10.4 Reward Display & Communication
**Agent: frontend-specialist + mobile-responsive**
- [ ] Create immediate reward display screen
- [ ] Build quality explanation interface
- [ ] Add improvement suggestions
- [ ] Implement payment timeline display
- [ ] Create SMS notification system
- [ ] Build reward history tracking

---

## PHASE 11: Payment Processing System
**Timeline: Week 9-10**
**Priority: HIGH - Customer trust**

### 11.1 Swish Integration Setup
**Agent: payment-verification**
- [ ] Configure Swish Business API
- [ ] Set up merchant certificates
- [ ] Implement payment request creation
- [ ] Build callback handling
- [ ] Add payment status tracking
- [ ] Create retry mechanisms

### 11.2 Payment Consolidation System
**Agent: payment-verification + csv-data-processor**
- [ ] Build phone number consolidation
- [ ] Create weekly batch processing
- [ ] Implement multi-store aggregation
- [ ] Calculate consolidated amounts
- [ ] Generate Swish batch files
- [ ] Track payment savings

### 11.3 Invoice Generation
**Agent: payment-verification + admin-dashboard**
- [ ] Create invoice templates
- [ ] Build automatic generation
- [ ] Calculate platform fees (20%)
- [ ] Add payment terms
- [ ] Generate PDF invoices
- [ ] Implement sending system

---

## PHASE 12: Mobile Optimization & PWA
**Timeline: Week 10**
**Priority: MEDIUM - User experience**

### 12.1 Mobile-First Design
**Agent: mobile-responsive + frontend-specialist**
- [ ] Optimize all interfaces for mobile
- [ ] Implement touch-friendly controls
- [ ] Create responsive layouts
- [ ] Optimize image loading
- [ ] Implement lazy loading
- [ ] Add offline capabilities

### 12.2 Progressive Web App Features
**Agent: mobile-responsive**
- [ ] Create service worker
- [ ] Implement offline mode
- [ ] Add install prompt
- [ ] Configure app manifest
- [ ] Enable push notifications
- [ ] Build background sync

---

## PHASE 13: Testing & Quality Assurance
**Timeline: Week 11**
**Priority: CRITICAL - Production stability**

### 13.1 End-to-End Testing
**Agent: testing-quality**
- [ ] Create E2E test suite
- [ ] Test complete registration flow
- [ ] Verify onboarding process
- [ ] Test verification workflow
- [ ] Validate payment processing
- [ ] Test multi-store scenarios

### 13.2 Production Testing Strategy
**Agent: testing-quality + security-authentication**
- [ ] Test with real micro-transactions (1-5 SEK)
- [ ] Verify with actual phone numbers
- [ ] Test real Swish payments
- [ ] Validate production auth
- [ ] Test rate limiting
- [ ] Verify security measures

### 13.3 Performance Monitoring
**Agent: testing-quality**
- [ ] Set up performance tracking
- [ ] Configure error monitoring
- [ ] Implement uptime monitoring
- [ ] Add API response tracking
- [ ] Create alert system
- [ ] Build performance dashboards

---

## PHASE 14: Security & Compliance
**Timeline: Week 11-12**
**Priority: CRITICAL - Legal requirements**

### 14.1 GDPR Compliance
**Agent: security-authentication**
- [ ] Implement data privacy controls
- [ ] Create consent management
- [ ] Build data export functionality
- [ ] Add data deletion capabilities
- [ ] Create privacy policy
- [ ] Implement cookie consent

### 14.2 Security Hardening
**Agent: security-authentication**
- [ ] Conduct security audit
- [ ] Implement API rate limiting
- [ ] Add input sanitization
- [ ] Configure CSP headers
- [ ] Enable audit logging
- [ ] Set up intrusion detection

---

## PHASE 15: Launch Preparation
**Timeline: Week 12**
**Priority: HIGH - Go-live readiness**

### 15.1 Final Testing & Validation
**Agent: testing-quality**
- [ ] Complete full system test
- [ ] Verify all integrations
- [ ] Test payment flows end-to-end
- [ ] Validate all user journeys
- [ ] Check mobile responsiveness
- [ ] Verify security measures

### 15.2 Documentation & Support
**Agent: frontend-specialist**
- [ ] Create user guides
- [ ] Build help center
- [ ] Add in-app tutorials
- [ ] Create FAQ section
- [ ] Build contact forms
- [ ] Set up support email

### 15.3 Launch Configuration
**Agent: admin-dashboard + frontend-specialist**
- [ ] Configure production domains
- [ ] Set up SSL certificates
- [ ] Enable production monitoring
- [ ] Configure backup systems
- [ ] Set up analytics
- [ ] Prepare launch communications

---

## PHASE 16: Post-Launch Optimization
**Timeline: Month 2-3**
**Priority: MEDIUM - Continuous improvement**

### 16.1 Performance Optimization
**Agent: frontend-specialist + testing-quality**
- [ ] Optimize database queries
- [ ] Improve page load times
- [ ] Enhance mobile performance
- [ ] Optimize API responses
- [ ] Reduce bundle sizes
- [ ] Implement caching strategies

### 16.2 Feature Enhancements
**Agent: Various based on feature**
- [ ] Add POS integration options
- [ ] Implement automated verification
- [ ] Build advanced analytics
- [ ] Add multi-language support
- [ ] Create mobile app
- [ ] Enhance AI capabilities

---

## SUCCESS CRITERIA

### Technical Metrics
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] 99.9% uptime
- [ ] Zero critical security vulnerabilities
- [ ] Mobile responsiveness score > 95

### Business Metrics
- [ ] Onboarding completion rate > 80%
- [ ] Context completeness > 85% within first week
- [ ] Verification completion > 90% on time
- [ ] Fraud detection accuracy > 95%
- [ ] Customer participation rate 10-20%

### User Experience Metrics
- [ ] Business satisfaction score > 4.5/5
- [ ] Customer feedback quality average > 7/10
- [ ] Payment processing success rate > 99%
- [ ] Support ticket resolution < 24 hours
- [ ] Feature adoption rate > 60%

---

## CRITICAL REMINDERS

⚠️ **PRODUCTION-FIRST DEVELOPMENT**
- Every account is REAL from day one
- Use actual money for payment testing (small amounts)
- No demo data or test accounts
- Implement security from the start
- Test with real phone numbers and emails

⚠️ **TESTING STRATEGY**
- Create real business accounts for testing
- Use actual voice calls for feedback
- Process real micro-payments (1-5 SEK)
- Delete test accounts after development
- Always use feature flags for incomplete features

⚠️ **PRIORITY ORDER**
1. Database & Security (Foundation)
2. Authentication & Registration (Entry point)
3. Onboarding & Context (Business setup)
4. Verification Workflow (Core operation)
5. Customer Feedback (Revenue generation)
6. Payment Processing (Trust building)
7. Analytics (Value delivery)
8. Admin Dashboard (Operational control)

---

## NOTES FOR DEVELOPERS

### Agent Specializations Quick Reference:
- **ai-integration**: OpenAI, GPT-4o-mini, voice processing, quality scoring
- **frontend-specialist**: Next.js, React, UI/UX, routing
- **supabase-architect**: Database, RLS, real-time, storage
- **admin-dashboard**: Admin operations, batch processing, reporting
- **business-onboarding**: Onboarding flow, context system, business setup
- **payment-verification**: Swish, verification, payments, invoicing
- **qr-store-management**: QR codes, store codes, multi-location
- **analytics-reporting**: Feedback analytics, charts, insights
- **csv-data-processor**: CSV operations, bulk data, validation
- **mobile-responsive**: Mobile optimization, PWA, touch UI
- **security-authentication**: Auth, security, GDPR, compliance
- **testing-quality**: E2E testing, monitoring, performance

### Development Workflow:
1. Always check the task's assigned agent
2. Use TodoWrite to track progress
3. Test in production with minimal real data
4. Implement feature flags for partial features
5. Maintain audit logs from day one
6. Document all production credentials securely

### Communication Between Agents:
- Use clear handoffs between agents
- Document API contracts
- Share database schemas
- Coordinate on shared components
- Maintain consistent coding standards

---

## PROJECT COMPLETION CHECKLIST

### Pre-Launch Requirements:
- [ ] All Phase 1-15 tasks completed
- [ ] Security audit passed
- [ ] GDPR compliance verified
- [ ] Payment processing tested
- [ ] Production monitoring active
- [ ] Support system ready
- [ ] Documentation complete

### Launch Day Tasks:
- [ ] Enable public registration
- [ ] Activate payment processing
- [ ] Monitor system performance
- [ ] Track first registrations
- [ ] Respond to support requests
- [ ] Gather initial feedback

### Post-Launch Week 1:
- [ ] Monitor system stability
- [ ] Address critical issues
- [ ] Gather user feedback
- [ ] Optimize performance
- [ ] Plan feature updates
- [ ] Celebrate success! 🎉

---

**END OF TASKS.md**

*Last Updated: [Current Date]*
*Total Tasks: 200+*
*Estimated Timeline: 12 weeks*
*Production-First Approach: MANDATORY*