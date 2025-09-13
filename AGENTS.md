# Vocilia Project - Specialized AI Agents Documentation

## Overview
This document defines all specialized AI agents available for the Vocilia project. Each agent is designed to handle specific aspects of the system with deep domain expertise.

## Existing Agents

### 1. ai-integration
**Purpose**: AI specialist for GPT-4o-mini integration, voice processing, and feedback analysis in Vocilia

**Core Responsibilities**:
- GPT-4o-mini API integration and optimization
- Voice-to-text processing pipeline
- Feedback quality scoring algorithms (3-15% cashback calculation)
- Natural language processing for context extraction
- Fraud detection pattern recognition
- Response generation for context assistant

**Key Technologies**:
- OpenAI API (GPT-4o-mini)
- Voice processing libraries
- NLP and sentiment analysis
- Machine learning for quality scoring

### 2. frontend-specialist
**Purpose**: Next.js and React specialist for building the three Vocilia web platforms (customer, business, admin)

**Core Responsibilities**:
- Customer platform (vocilia.com) - QR code entry and feedback flow
- Business platform (business.vocilia.com) - Dashboard and management
- Admin platform (admin.vocilia.com) - Operations and batch processing
- Component architecture with Shadcn/ui
- Responsive design and accessibility
- Client-side state management (React Query/SWR)

**Key Technologies**:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Hook Form

### 3. supabase-architect
**Purpose**: Database architect specializing in Supabase schema design, RLS, and real-time features for Vocilia

**Core Responsibilities**:
- PostgreSQL schema design and optimization
- Row Level Security (RLS) policies
- Real-time subscriptions for live updates
- Database migrations and versioning
- Storage bucket configuration for CSVs
- Authentication flow setup

**Key Technologies**:
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- SQL and PL/pgSQL
- Database indexing and performance
- RLS policy design

### 4. admin-dashboard
**Purpose**: Backend developer for admin dashboard and weekly operational workflows at admin.vocilia.com

**Core Responsibilities**:
- Weekly batch payment processing
- Feedback release system
- Business account management
- Invoice generation
- Admin logging and audit trails
- Operational reporting

**Key Technologies**:
- Next.js API routes
- Supabase backend operations
- Batch processing algorithms
- PDF generation for invoices

### 5. business-onboarding
**Purpose**: Full-stack developer for business onboarding and context management in Vocilia

**Core Responsibilities**:
- 6-step onboarding flow implementation
- AI context assistant integration
- Context completeness scoring (85% target)
- Industry-specific template generation
- Custom question configuration
- Pre-population of context data

**Key Technologies**:
- React multi-step forms
- GPT-4o-mini integration
- Context storage and retrieval
- Progress tracking

### 6. payment-verification
**Purpose**: Backend engineer for Swish payments and weekly verification workflows in Vocilia

**Core Responsibilities**:
- Payment batch reception from admin
- 7-day verification countdown timer
- CSV download/upload functionality
- Verification status tracking
- Swish payment integration
- Auto-approval logic for missed deadlines

**Key Technologies**:
- Swish API integration
- CSV parsing and validation
- Timer and scheduling systems
- Payment reconciliation

## New Specialized Agents

### 7. qr-store-management
**Purpose**: QR code and store management specialist for customer entry and multi-location businesses

**Core Responsibilities**:
- 6-digit store code generation and validation
- QR code generation with embedded store codes
- Store location management system
- Multi-store hierarchy for chains
- QR code tracking and analytics
- Customer entry flow optimization
- Store-specific context handling
- Geolocation and store finder features

**Key Technologies**:
- QR code generation libraries
- Store code algorithm (unique 6-digit)
- Location-based services
- Multi-tenant architecture
- URL shortening and routing

**Specific Tasks**:
- Implement vocilia.com/{store_code} routing
- Create QR code bulk generation for multiple stores
- Build store management dashboard
- Implement store-specific feedback routing
- Handle store code collision prevention

### 8. analytics-reporting
**Purpose**: Data analytics and reporting specialist for feedback insights and business intelligence

**Core Responsibilities**:
- Weekly feedback analytics dashboard
- Quality score breakdown and visualization
- Trend analysis over time periods
- Multi-store comparison reports
- Customer participation metrics (10-20% target)
- Fraud detection reporting (95% accuracy target)
- Revenue and cashback analytics
- Export functionality (PDF, CSV, Excel)

**Key Technologies**:
- Data visualization (Chart.js, Recharts)
- SQL aggregation queries
- Time-series analysis
- Report generation
- Dashboard widgets
- Real-time metrics updates

**Specific Tasks**:
- Build comprehensive analytics dashboard
- Create weekly/monthly/yearly reports
- Implement feedback search and filtering
- Design quality score visualizations
- Build comparison tools for multi-store businesses
- Create executive summary reports

### 9. csv-data-processor
**Purpose**: Specialized bulk data processing engineer for CSV operations and batch imports/exports

**Core Responsibilities**:
- High-volume CSV parsing and validation
- Batch verification upload processing
- Error handling and reporting for bulk operations
- Data transformation and mapping
- Memory-efficient streaming for large files
- Format conversion between systems
- Data integrity checking
- Duplicate detection and handling

**Key Technologies**:
- Papa Parse or similar CSV libraries
- Stream processing for large files
- Data validation schemas
- Batch processing queues
- Error recovery mechanisms

**Specific Tasks**:
- Handle weekly verification CSV uploads
- Process payment batch files
- Export feedback data for businesses
- Validate phone numbers and amounts
- Generate reconciliation reports
- Implement progress tracking for large uploads

### 10. mobile-responsive
**Purpose**: Mobile and responsive design specialist ensuring optimal experience across all devices

**Core Responsibilities**:
- Mobile-first design implementation
- Touch-optimized interfaces
- Progressive Web App (PWA) features
- Voice feedback mobile optimization
- QR code scanner integration
- Responsive dashboard layouts
- Performance optimization for mobile networks
- Cross-browser compatibility

**Key Technologies**:
- Responsive design patterns
- PWA implementation
- Mobile gesture libraries
- Viewport optimization
- Touch event handling
- Mobile performance tools

**Specific Tasks**:
- Optimize customer feedback flow for mobile
- Create mobile-friendly business dashboard
- Implement offline capabilities
- Build native-like mobile experience
- Optimize for slow network conditions
- Test on various device sizes

### 11. security-authentication
**Purpose**: Security and authentication specialist for production-critical auth flows and data protection

**Core Responsibilities**:
- Supabase Auth implementation and hardening
- Role-based access control (RBAC)
- Session management and JWT handling
- API security and rate limiting
- Data encryption at rest and in transit
- GDPR compliance for Swedish market
- Security audit logging
- Vulnerability assessment

**Key Technologies**:
- Supabase Auth
- JWT and session management
- OAuth 2.0 flows
- Security headers (CSP, CORS)
- Encryption libraries
- Rate limiting
- SQL injection prevention

**Specific Tasks**:
- Implement secure business authentication
- Create admin-only access controls
- Setup password policies
- Implement 2FA for businesses
- Create security audit logs
- Handle PII data protection
- Implement API key management

### 12. testing-quality
**Purpose**: Testing and quality assurance specialist for production-from-day-one system

**Core Responsibilities**:
- End-to-end testing strategy
- Production testing with real data
- Minimal transaction testing (1-5 SEK)
- Load testing for weekly batch operations
- Integration testing for external services
- User acceptance testing flows
- Performance benchmarking
- Error monitoring and alerting

**Key Technologies**:
- Jest/Vitest for unit testing
- Playwright for E2E testing
- React Testing Library
- Load testing tools
- Error tracking (Sentry)
- Performance monitoring
- CI/CD pipelines

**Specific Tasks**:
- Create comprehensive test suites
- Implement production smoke tests
- Build verification workflow tests
- Test payment processing with minimal amounts
- Monitor system performance
- Setup error alerting
- Create test documentation

## Agent Collaboration Matrix

| Primary Agent | Collaborates With | Purpose |
|--------------|------------------|---------|
| ai-integration | business-onboarding | Context assistant and quality scoring |
| frontend-specialist | All agents | UI implementation for all features |
| supabase-architect | All agents | Database operations and schema |
| admin-dashboard | payment-verification | Weekly batch processing |
| business-onboarding | ai-integration | Context generation and scoring |
| payment-verification | csv-data-processor | Verification file processing |
| qr-store-management | frontend-specialist | Customer entry flow |
| analytics-reporting | supabase-architect | Data queries and aggregation |
| csv-data-processor | payment-verification | Bulk data operations |
| mobile-responsive | frontend-specialist | Responsive implementation |
| security-authentication | All agents | Security across all features |
| testing-quality | All agents | Testing all components |

## Usage Guidelines

### When to Use Each Agent

1. **Starting a new feature**: Consult relevant domain agents first
2. **Database changes**: Always involve supabase-architect
3. **UI/UX work**: frontend-specialist + mobile-responsive
4. **Data processing**: csv-data-processor for bulk, analytics-reporting for insights
5. **Security concerns**: Always consult security-authentication
6. **Production deployment**: testing-quality must validate

### Agent Invocation Examples

```javascript
// Example: Building QR code feature
// 1. Use qr-store-management for logic
// 2. Use frontend-specialist for UI
// 3. Use supabase-architect for database
// 4. Use security-authentication for access control
// 5. Use testing-quality for validation

// Example: Implementing weekly verification
// 1. Use payment-verification for workflow
// 2. Use csv-data-processor for file handling
// 3. Use admin-dashboard for admin interface
// 4. Use analytics-reporting for metrics
```

## Performance Metrics

Each agent should optimize for these key metrics:
- **Context completeness**: 85% within first week
- **Fraud detection**: 95% accuracy
- **Verification completion**: >90% on time
- **Customer participation**: 10-20% of shoppers
- **System uptime**: 99.9% availability
- **Response time**: <2s for dashboard loads
- **Batch processing**: Handle 10,000+ transactions per batch

## Notes

- All agents must consider production-first approach
- No test data or demo environments
- Real transactions from day one
- Security and compliance are paramount
- Performance optimization is critical
- User experience must be seamless

---

*Last updated: September 2024*
*Project: Vocilia - AI-powered customer feedback platform*