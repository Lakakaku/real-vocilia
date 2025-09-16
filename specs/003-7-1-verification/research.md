# Research: Payment Verification Dashboard System

**Feature**: Payment Verification Dashboard System
**Branch**: 003-7-1-verification
**Date**: 2025-09-16

## Research Objectives
Address NEEDS CLARIFICATION items from feature specification:
1. CSV format specifications for payment batches and verification results
2. Fraud detection algorithms and scoring criteria (0-100 scale)
3. Real-time countdown timer implementation patterns
4. Supabase file upload/download best practices for CSV handling
5. AI integration patterns with OpenAI for verification recommendations

---

## 1. CSV Format Specifications

### Decision: Standardized CSV Schema with Metadata Headers

**Payment Batch CSV (Admin → Business)**:
```csv
# VOCILIA_PAYMENT_BATCH_V1
# Week: 37-2024
# Business: ICA Södermalm
# Generated: 2024-10-16T09:00:00Z
# Deadline: 2024-10-23T17:00:00Z
transaction_id,date_time,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek,customer_feedback_id
VCL-4837,2024-10-14T14:30:00Z,500.00,**43,ABC123,85,10,50.00,fb_uuid_1234
VCL-4839,2024-10-14T09:20:00Z,780.00,**89,ABC123,92,12,93.60,fb_uuid_5678
```

**Verification Result CSV (Business → Admin)**:
```csv
# VOCILIA_VERIFICATION_RESULT_V1
# Week: 37-2024
# Business: ICA Södermalm
# Submitted: 2024-10-21T14:32:00Z
# Verified_By: business_user_email@example.com
transaction_id,date_time,amount_sek,phone_last4,verified,rejection_reason,business_notes
VCL-4837,2024-10-14T14:30:00Z,500.00,**43,YES,,Transaction confirmed in POS
VCL-4839,2024-10-14T09:20:00Z,780.00,**89,YES,,Verified against receipt #12345
VCL-4841,2024-10-15T10:15:00Z,340.00,**55,NO-NOT_FOUND,No matching transaction found,Checked 10:00-10:30 window
```

**Rationale**:
- Metadata headers provide version control and audit information
- Consistent field naming across both directions
- Phone number masking for privacy compliance
- Structured rejection reasons for fraud analysis
- ISO 8601 timestamps for timezone consistency

**Alternatives considered**:
- JSON format: Rejected due to business familiarity with CSV and Excel compatibility
- Fixed-width format: Rejected due to complexity and error-prone parsing
- XML format: Rejected due to verbosity and business tool compatibility

---

## 2. Fraud Detection Algorithm and Scoring

### Decision: Multi-Factor Risk Scoring Algorithm (0-100 scale)

**Fraud Risk Factors** (weighted scoring):

```typescript
interface FraudAssessment {
  transaction_id: string
  risk_score: number // 0-100 (0 = no risk, 100 = high fraud risk)
  risk_factors: FraudFactor[]
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT'
  confidence: number // 0-1
}

interface FraudFactor {
  factor: string
  weight: number
  score: number
  description: string
}
```

**Scoring Algorithm**:
1. **Time Anomalies** (25% weight):
   - Outside business hours: +40 points
   - Holiday/closed day: +60 points
   - Suspicious time patterns: +20 points

2. **Amount Patterns** (25% weight):
   - Round numbers (100, 500, 1000): +15 points
   - Duplicate amounts same day: +25 points
   - Amount outside typical range: +20 points

3. **Phone Number Abuse** (20% weight):
   - Same number multiple feedbacks/day: +30 points
   - Previously flagged number: +50 points
   - New number with suspicious patterns: +15 points

4. **Geographic/Context Inconsistencies** (15% weight):
   - Feedback content doesn't match store context: +35 points
   - Mentions non-existent staff/products: +45 points
   - Generic feedback with high reward claim: +25 points

5. **Behavioral Patterns** (15% weight):
   - Too fast completion: +20 points
   - Identical feedback language: +40 points
   - Feedback quality vs reward inconsistency: +30 points

**Risk Thresholds**:
- 0-30: Low risk → APPROVE
- 31-60: Medium risk → REVIEW
- 61-100: High risk → REJECT

**Rationale**:
- Multi-factor approach reduces false positives
- Business context integration leverages existing store data
- Weighted scoring allows tuning based on fraud patterns
- Clear thresholds enable automated decision support

**Alternatives considered**:
- Machine learning model: Rejected due to insufficient training data initially
- Binary fraud detection: Rejected as insufficient granularity for business decisions
- External fraud service: Rejected due to cost and data privacy concerns

---

## 3. Real-Time Countdown Timer Implementation

### Decision: Server-Side Time Source with Client-Side Updates

**Implementation Pattern**:
```typescript
// Server-side deadline calculation
interface VerificationDeadline {
  deadline: string // ISO 8601 timestamp
  time_remaining: number // seconds
  status: 'active' | 'warning' | 'critical' | 'expired'
}

// Client-side countdown component
const CountdownTimer = ({ deadline }: { deadline: string }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [status, setStatus] = useState<'active' | 'warning' | 'critical' | 'expired'>('active')

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const remaining = Math.max(0, deadlineTime - now)

      setTimeRemaining(remaining)
      setStatus(getStatusFromRemaining(remaining))
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline])
}
```

**Update Strategy**:
- Server provides authoritative deadline timestamp
- Client calculates remaining time locally (1-second updates)
- Status indicators: >24h (active), 24-6h (warning), <6h (critical), 0 (expired)
- Automatic refresh every 5 minutes to sync with server time
- Visual indicators: Progress bar, color changes, pulsing animations

**Rationale**:
- Server time authority prevents client clock manipulation
- Local updates provide smooth user experience
- Multiple status levels enable progressive urgency communication
- Regular sync prevents drift accumulation

**Alternatives considered**:
- Pure client-side countdown: Rejected due to clock manipulation vulnerability
- Server-sent events for real-time updates: Rejected as overkill for this use case
- WebSocket real-time sync: Rejected due to complexity and resource usage

---

## 4. Supabase File Upload/Download Patterns

### Decision: Supabase Storage with Secure Access Patterns

**File Organization Structure**:
```
verification-batches/
├── {business_id}/
│   ├── incoming/
│   │   └── week-{week_number}-{year}.csv
│   ├── outgoing/
│   │   └── week-{week_number}-{year}-verified.csv
│   └── archive/
│       └── {year}/
│           └── week-{week_number}/
```

**Security Implementation**:
```sql
-- Row Level Security for verification files
CREATE POLICY "Businesses can access own verification files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'verification-batches' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin access policy
CREATE POLICY "Admins can access all verification files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'verification-batches' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

**Upload/Download Workflow**:
1. Admin uploads payment batch → `incoming/` folder
2. Business downloads from `incoming/` with signed URL (24h expiry)
3. Business uploads verification results → `outgoing/` folder
4. Admin downloads from `outgoing/` and moves to `archive/`

**File Validation**:
- CSV format validation on upload
- File size limits (10MB max)
- Header validation against expected schema
- Virus scanning (future enhancement)

**Rationale**:
- Supabase Storage provides secure, scalable file handling
- RLS policies ensure data isolation between businesses
- Signed URLs enable secure temporary access
- Structured folders support audit trails and archival

**Alternatives considered**:
- Direct database BLOB storage: Rejected due to size limitations and performance
- External S3 integration: Rejected due to added complexity and cost
- File system storage: Rejected due to scalability and backup concerns

---

## 5. AI Integration for Verification Recommendations

### Decision: OpenAI GPT-4o-mini with Context-Aware Prompting

**Integration Architecture**:
```typescript
interface VerificationRecommendation {
  transaction_id: string
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT'
  confidence: number // 0-1
  reasoning: string[]
  risk_factors: string[]
  suggested_actions: string[]
}

const generateVerificationRecommendation = async (
  transaction: Transaction,
  businessContext: BusinessContext,
  fraudAssessment: FraudAssessment
): Promise<VerificationRecommendation> => {
  const prompt = buildContextualPrompt(transaction, businessContext, fraudAssessment)
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1, // Low temperature for consistent recommendations
    max_tokens: 500
  })

  return parseRecommendationResponse(response.choices[0].message.content)
}
```

**Prompt Engineering Strategy**:
```
You are a fraud detection assistant for Vocilia's payment verification system.

Business Context:
- Store: {store_name}
- Business Type: {business_type}
- Known Staff: {staff_list}
- Operating Hours: {hours}
- Typical Transaction Range: {amount_range}

Transaction Details:
- ID: {transaction_id}
- Time: {timestamp}
- Amount: {amount} SEK
- Quality Score: {score}/100

Fraud Assessment:
- Risk Score: {risk_score}/100
- Key Risk Factors: {risk_factors}

Based on this information, provide:
1. Recommendation (APPROVE/REVIEW/REJECT)
2. Confidence level (0-1)
3. Key reasoning points
4. Suggested verification actions for the business
```

**Rate Limiting and Cost Control**:
- Max 100 AI recommendations per business per week
- Batch processing for efficiency
- Fallback to rule-based system if API unavailable
- Usage tracking and billing alerts

**Rationale**:
- GPT-4o-mini provides good balance of capability and cost
- Context-aware prompts leverage business-specific information
- Structured response format enables programmatic processing
- Rate limiting prevents cost overruns

**Alternatives considered**:
- GPT-4: Rejected due to higher cost for this use case
- Local LLM: Rejected due to infrastructure complexity and accuracy concerns
- Rule-based only: Rejected as insufficient for complex fraud patterns

---

## Implementation Readiness Assessment

**All NEEDS CLARIFICATION items resolved**: ✅
- CSV formats defined with versioning and validation
- Fraud scoring algorithm specified with clear thresholds
- Real-time countdown pattern established with fallback strategies
- Supabase file handling patterns defined with security policies
- AI integration approach specified with cost controls

**Next Phase Prerequisites Met**:
- Technical patterns established for all core requirements
- Security considerations addressed across all components
- Performance and cost constraints identified and planned for
- Integration points with existing Supabase/Next.js architecture confirmed

**Risk Mitigation Strategies**:
- Gradual rollout with feature flags
- Comprehensive testing including edge cases
- Monitoring and alerting for all critical components
- Fallback mechanisms for external dependencies

---

**Phase 0 Complete** - Ready for Phase 1: Design & Contracts