# CONSTITUTION.md - Vocilia Platform Core Principles

## Mission Statement
Vocilia transforms customer feedback into actionable business insights through AI-powered voice conversations, rewarding customers fairly for quality feedback while providing businesses with authentic, valuable data.

## Non-Negotiable Principles

### 1. Production-First Development
- **NO demo environments** - Everything is real from day one
- All accounts, transactions, and feedback are production data
- Test with real but minimal data, never fake or placeholder content
- Every deployment must be production-ready

### 2. Customer Trust & Privacy
- Customer data is sacred and must be protected at all times
- No customer accounts required for feedback submission
- Phone numbers are used solely for payment, never for marketing
- Transparent reward calculation based on feedback quality
- Customers must always understand how their data is used

### 3. Fair Value Exchange
- Quality feedback deserves quality rewards (3-15% cashback)
- Reward tiers must be transparent and consistent:
  - Basic feedback: 3% cashback
  - Good feedback: 5-8% cashback
  - Detailed feedback: 10-12% cashback
  - Exceptional feedback: 15% cashback
- Platform fee (20%) is clearly disclosed to businesses
- Weekly consolidated payments via Swish, never delayed

### 4. Business Empowerment
- Businesses own their feedback data completely
- Context system must achieve 85% completeness for optimal results
- 7-day verification window is sacred - no exceptions
- Actionable insights, not just raw data
- Multi-store support for growing businesses

### 5. Security & Reliability
- All sensitive data must be encrypted at rest and in transit
- Row-level security (RLS) policies on all database tables
- Comprehensive audit logging for all administrative actions
- Zero tolerance for security vulnerabilities
- 99.9% uptime commitment for business dashboards

### 6. Operational Excellence
- Weekly cycle is immutable:
  - Monday: Payment batch sent
  - Monday-Sunday: 7-day verification window
  - Following Monday: Feedback released
  - Same day: Customer payments processed
- Automated reminders for critical deadlines
- Manual admin operations must have clear audit trails

### 7. Quality Over Quantity
- AI scoring must be consistent and explainable
- Fraud detection accuracy target: 95%
- Context completeness target: 85% within first week
- Verification completion target: >90% on time
- Customer participation target: 10-20% of shoppers

### 8. Data Integrity
- No data manipulation or artificial inflation
- All metrics must be real and verifiable
- Transparent reporting to all stakeholders
- Version control for all context updates
- Immutable audit logs

### 9. User Experience
- Onboarding must be completed in under 10 minutes
- Maximum 3 fields for initial registration
- QR code entry must work on all devices
- Voice feedback must be accessible to all
- Dashboard must load in under 2 seconds

### 10. Ethical AI Usage
- GPT-4o-mini for context assistance only
- No AI-generated fake feedback
- Human oversight for all AI decisions
- Transparent AI scoring explanations
- Continuous improvement based on real outcomes

## Implementation Standards

### Code Quality
- TypeScript strict mode enabled
- 100% type safety, no `any` types
- Comprehensive error handling
- Meaningful variable and function names
- Comments only where necessary

### Testing Requirements
- Test with production data (minimal amounts)
- Real payment testing with 1-5 SEK amounts
- End-to-end testing for critical paths
- Performance testing for all dashboards
- Security testing before each deployment

### Deployment Rules
- Auto-deploy to Vercel on main branch push
- Feature flags for incomplete features
- Rollback plan for every deployment
- Database migrations must be reversible
- Zero-downtime deployments only

### Monitoring & Logging
- Real-time error tracking (Sentry integration)
- Performance monitoring for all endpoints
- User session recording for debugging
- Weekly metric reviews
- Incident response within 1 hour

## Compliance & Legal
- GDPR compliance for all EU customers
- Swedish data protection laws adherence
- Clear terms of service and privacy policy
- Age verification (18+ for payments)
- Tax compliance for cashback rewards

## Future-Proofing
- API-first architecture for integrations
- Scalable database design
- Modular component structure
- Documentation for all major decisions
- Regular security audits

## Decision Framework
When making any decision, ask:
1. Does this protect customer trust?
2. Does this provide real business value?
3. Is this production-ready today?
4. Can this scale to 10,000+ businesses?
5. Is this the simplest solution that works?

## Amendments
This constitution can only be amended with:
- Clear justification for the change
- Impact analysis on existing principles
- Consensus from all stakeholders
- Version control and change documentation
- Grandfather clause for existing implementations

---

**Remember**: Every line of code, every feature, every decision must serve our mission of creating authentic connections between businesses and customers through quality feedback.

**Last Updated**: 2025-01-16
**Version**: 1.0.0