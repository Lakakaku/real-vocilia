# Quickstart: Payment Verification Dashboard System

**Feature**: Payment Verification Dashboard System
**Branch**: 003-7-1-verification
**Date**: 2025-09-16

## Overview

This quickstart guide validates the complete payment verification workflow from admin batch creation to business verification and result processing. It covers the end-to-end user journey with realistic test data.

---

## Prerequisites

### Environment Setup
```bash
# Ensure you're on the correct branch
git checkout 003-7-1-verification

# Install dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://ervnxnbxsaaeakbvwieh.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon_key]"
export SUPABASE_SERVICE_ROLE_KEY="[service_role_key]"
export OPENAI_API_KEY="[openai_key]"

# Run database migrations
npm run supabase:migrate

# Start development server
npm run dev
```

### Test Data Setup
```sql
-- Create test business (if not exists)
INSERT INTO businesses (id, name, email, phone)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'ICA Södermalm Test',
  'test@ica-sodermalm.se',
  '+46701234567'
) ON CONFLICT (id) DO NOTHING;

-- Create test admin user
INSERT INTO admin_users (id, email, role)
VALUES (
  '456e7890-e89b-12d3-a456-426614174001',
  'admin@vocilia.com',
  'admin'
) ON CONFLICT (id) DO NOTHING;
```

---

## End-to-End Workflow Test

### Phase 1: Admin Creates Payment Batch

**Objective**: Admin creates weekly payment batch with 5 test transactions

**Steps**:
1. **Navigate to Admin Portal**
   ```
   URL: http://localhost:3000/admin/verification
   Login: admin@vocilia.com
   ```

2. **Create New Payment Batch**
   ```bash
   # API Test (Alternative to UI)
   curl -X POST http://localhost:3000/api/admin/batches \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [admin_token]" \
     -d '{
       "business_id": "123e4567-e89b-12d3-a456-426614174000",
       "week_number": 38,
       "year": 2024,
       "transactions": [
         {
           "transaction_id": "VCL-10001",
           "date_time": "2024-09-14T14:30:00Z",
           "amount_sek": 500.00,
           "phone_last4": "**43",
           "store_code": "ABC123",
           "quality_score": 85,
           "reward_percentage": 10,
           "reward_amount_sek": 50.00,
           "customer_feedback_id": "fb123e456-7890-1234-5678-901234567890"
         },
         {
           "transaction_id": "VCL-10002",
           "date_time": "2024-09-14T09:20:00Z",
           "amount_sek": 780.00,
           "phone_last4": "**89",
           "store_code": "ABC123",
           "quality_score": 92,
           "reward_percentage": 12,
           "reward_amount_sek": 93.60,
           "customer_feedback_id": "fb123e456-7890-1234-5678-901234567891"
         },
         {
           "transaction_id": "VCL-10003",
           "date_time": "2024-09-15T10:15:00Z",
           "amount_sek": 340.00,
           "phone_last4": "**55",
           "store_code": "ABC123",
           "quality_score": 78,
           "reward_percentage": 8,
           "reward_amount_sek": 27.20,
           "customer_feedback_id": "fb123e456-7890-1234-5678-901234567892"
         },
         {
           "transaction_id": "VCL-10004",
           "date_time": "2024-09-15T16:45:00Z",
           "amount_sek": 1200.00,
           "phone_last4": "**22",
           "store_code": "ABC123",
           "quality_score": 95,
           "reward_percentage": 15,
           "reward_amount_sek": 180.00,
           "customer_feedback_id": "fb123e456-7890-1234-5678-901234567893"
         },
         {
           "transaction_id": "VCL-10005",
           "date_time": "2024-09-16T11:30:00Z",
           "amount_sek": 250.00,
           "phone_last4": "**67",
           "store_code": "ABC123",
           "quality_score": 88,
           "reward_percentage": 10,
           "reward_amount_sek": 25.00,
           "customer_feedback_id": "fb123e456-7890-1234-5678-901234567894"
         }
       ],
       "notes": "Weekly verification batch for testing - Week 38"
     }'
   ```

3. **Verify Batch Creation**
   ```bash
   # Check batch was created
   curl -X GET "http://localhost:3000/api/admin/batches?business_id=123e4567-e89b-12d3-a456-426614174000&week_number=38&year=2024" \
     -H "Authorization: Bearer [admin_token]"
   ```

4. **Release Batch to Business**
   ```bash
   # Release batch (changes status from draft to pending)
   curl -X POST http://localhost:3000/api/admin/batches/[batch_id]/release \
     -H "Authorization: Bearer [admin_token]"
   ```

**Expected Results**:
- ✅ Batch created with status "draft"
- ✅ CSV file generated and stored in Supabase Storage
- ✅ VerificationSession created with status "not_started"
- ✅ Fraud assessments generated for all 5 transactions
- ✅ Batch status changed to "pending" after release
- ✅ 7-day deadline set correctly

---

### Phase 2: Business Downloads and Reviews Batch

**Objective**: Business user accesses verification dashboard and downloads payment batch

**Steps**:
1. **Navigate to Business Dashboard**
   ```
   URL: http://localhost:3000/dashboard/verification
   Login: test@ica-sodermalm.se
   ```

2. **Verify Dashboard Display**
   - ✅ Verification section appears in dashboard
   - ✅ Countdown timer shows correct remaining time
   - ✅ Download button is available
   - ✅ Batch summary shows 5 transactions, total reward: 375.80 SEK

3. **Download Payment Batch**
   ```bash
   # API Test (Alternative to UI)
   curl -X POST http://localhost:3000/api/verification/download \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{"batch_id": "[batch_id]"}'
   ```

4. **Verify CSV Download**
   ```bash
   # Download and inspect CSV content
   curl -o test_batch.csv "[signed_download_url]"
   head -10 test_batch.csv
   ```

**Expected Results**:
- ✅ Signed download URL generated (24-hour expiry)
- ✅ CSV file contains correct header format
- ✅ All 5 transactions present with correct data
- ✅ Session status updated to "downloaded"
- ✅ Audit log entry created for download event

---

### Phase 3: Business Performs Verification

**Objective**: Business user reviews transactions and marks verification decisions

**Steps**:
1. **Load Verification Interface**
   ```bash
   # Get transactions for verification
   curl -X GET "http://localhost:3000/api/verification/transactions?page=1&limit=10" \
     -H "Authorization: Bearer [business_token]"
   ```

2. **Review Fraud Assessments**
   - ✅ VCL-10003: Risk score 45 (medium risk - time outside busy hours)
   - ✅ VCL-10004: Risk score 25 (low risk - high value but good quality score)
   - ✅ VCL-10001, VCL-10002, VCL-10005: Risk scores 15-20 (low risk)

3. **Make Verification Decisions**
   ```bash
   # Approve transaction VCL-10001
   curl -X PUT http://localhost:3000/api/verification/transactions/VCL-10001 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{
       "verified": true,
       "business_notes": "Transaction confirmed in POS system"
     }'

   # Approve transaction VCL-10002
   curl -X PUT http://localhost:3000/api/verification/transactions/VCL-10002 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{
       "verified": true,
       "business_notes": "Verified against receipt #12345"
     }'

   # Reject transaction VCL-10003
   curl -X PUT http://localhost:3000/api/verification/transactions/VCL-10003 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{
       "verified": false,
       "rejection_reason": "not_found",
       "business_notes": "No matching transaction found in POS for this time period"
     }'

   # Approve transaction VCL-10004
   curl -X PUT http://localhost:3000/api/verification/transactions/VCL-10004 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{
       "verified": true,
       "business_notes": "Large transaction verified with store manager"
     }'

   # Approve transaction VCL-10005
   curl -X PUT http://localhost:3000/api/verification/transactions/VCL-10005 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [business_token]" \
     -d '{
       "verified": true,
       "business_notes": "Standard transaction, confirmed"
     }'
   ```

4. **Check Verification Progress**
   ```bash
   # Get current verification status
   curl -X GET http://localhost:3000/api/verification/status \
     -H "Authorization: Bearer [business_token]"
   ```

**Expected Results**:
- ✅ Session status updated to "in_progress"
- ✅ Progress tracking shows 5/5 transactions verified
- ✅ Approved count: 4, Rejected count: 1
- ✅ All verification decisions saved with audit trail
- ✅ AI recommendations displayed correctly

---

### Phase 4: Business Uploads Verification Results

**Objective**: Business completes verification and uploads results CSV

**Steps**:
1. **Create Verification Results CSV**
   ```csv
   # VOCILIA_VERIFICATION_RESULT_V1
   # Week: 38-2024
   # Business: ICA Södermalm Test
   # Submitted: 2024-09-16T15:30:00Z
   # Verified_By: test@ica-sodermalm.se
   transaction_id,date_time,amount_sek,phone_last4,verified,rejection_reason,business_notes
   VCL-10001,2024-09-14T14:30:00Z,500.00,**43,YES,,Transaction confirmed in POS system
   VCL-10002,2024-09-14T09:20:00Z,780.00,**89,YES,,Verified against receipt #12345
   VCL-10003,2024-09-15T10:15:00Z,340.00,**55,NO-NOT_FOUND,not_found,No matching transaction found in POS for this time period
   VCL-10004,2024-09-15T16:45:00Z,1200.00,**22,YES,,Large transaction verified with store manager
   VCL-10005,2024-09-16T11:30:00Z,250.00,**67,YES,,Standard transaction confirmed
   ```

2. **Upload Verification Results**
   ```bash
   # Upload verification results CSV
   curl -X POST http://localhost:3000/api/verification/upload \
     -H "Authorization: Bearer [business_token]" \
     -F "batch_id=[batch_id]" \
     -F "file=@verification_results.csv"
   ```

3. **Verify Upload Success**
   ```bash
   # Check session status after upload
   curl -X GET http://localhost:3000/api/verification/status \
     -H "Authorization: Bearer [business_token]"
   ```

**Expected Results**:
- ✅ CSV file validation passes
- ✅ All 5 verification results processed
- ✅ Session status updated to "submitted"
- ✅ File stored in Supabase Storage
- ✅ Audit log entries created for upload and completion

---

### Phase 5: Admin Processes Results

**Objective**: Admin reviews verification results and processes payments

**Steps**:
1. **Review Verification Results**
   ```bash
   # Get verification results for admin review
   curl -X GET "http://localhost:3000/api/admin/verification-results?business_id=123e4567-e89b-12d3-a456-426614174000&week_number=38&year=2024" \
     -H "Authorization: Bearer [admin_token]"
   ```

2. **Download Verification Results CSV**
   ```bash
   # Get download URL for results
   curl -X GET http://localhost:3000/api/admin/verification-results/[session_id]/download \
     -H "Authorization: Bearer [admin_token]"
   ```

3. **Process Verification Results**
   ```bash
   # Mark results as processed and trigger payments
   curl -X POST http://localhost:3000/api/admin/verification-results/[session_id]/process \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [admin_token]" \
     -d '{
       "admin_notes": "Week 38 verification completed. 1 transaction rejected due to POS mismatch.",
       "override_rejections": []
     }'
   ```

**Expected Results**:
- ✅ Verification summary shows 4 approved, 1 rejected
- ✅ Total payout amount: 348.60 SEK (excluding rejected transaction)
- ✅ Session status updated to "completed"
- ✅ Payment workflow triggered for approved transactions
- ✅ Complete audit trail available

---

## Deadline and Auto-Approval Test

**Objective**: Test automatic approval when deadline passes

**Steps**:
1. **Create Batch with Short Deadline (Test Only)**
   ```sql
   -- Create test batch with 1-minute deadline
   UPDATE payment_batches
   SET deadline = NOW() + INTERVAL '1 minute'
   WHERE id = '[test_batch_id]';
   ```

2. **Wait for Deadline to Pass**
   ```bash
   # Monitor auto-approval process
   sleep 70
   curl -X GET http://localhost:3000/api/verification/status \
     -H "Authorization: Bearer [business_token]"
   ```

**Expected Results**:
- ✅ Session status changes to "auto_approved"
- ✅ All unverified transactions marked as approved
- ✅ Notification sent to admin about auto-approval
- ✅ Audit log entry created for auto-approval event

---

## Error Handling Tests

### Invalid CSV Upload Test
```bash
# Test malformed CSV upload
echo "invalid,csv,format" > invalid.csv
curl -X POST http://localhost:3000/api/verification/upload \
  -H "Authorization: Bearer [business_token]" \
  -F "batch_id=[batch_id]" \
  -F "file=@invalid.csv"
```

**Expected Results**:
- ✅ 400 Bad Request with validation errors
- ✅ Specific error messages for format issues
- ✅ Session status remains unchanged

### Fraud Detection Test
```bash
# Create batch with suspicious transactions
curl -X POST http://localhost:3000/api/admin/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin_token]" \
  -d '{
    "business_id": "123e4567-e89b-12d3-a456-426614174000",
    "week_number": 39,
    "year": 2024,
    "transactions": [
      {
        "transaction_id": "VCL-20001",
        "date_time": "2024-09-16T02:30:00Z",
        "amount_sek": 1000.00,
        "phone_last4": "**99",
        "store_code": "ABC123",
        "quality_score": 100,
        "reward_percentage": 15,
        "reward_amount_sek": 150.00
      }
    ]
  }'
```

**Expected Results**:
- ✅ High fraud risk score (>60) for 2:30 AM transaction
- ✅ AI recommendation: "REVIEW" or "REJECT"
- ✅ Clear risk factors identified (time anomaly, round amount)

---

## Performance Validation

### Load Test Setup
```bash
# Test concurrent verification sessions
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/verification/status \
    -H "Authorization: Bearer [business_token]" &
done
wait
```

### Response Time Validation
- ✅ Verification dashboard loads in <2 seconds
- ✅ CSV download generated in <3 seconds
- ✅ Transaction verification saves in <1 second
- ✅ File upload processes in <5 seconds

---

## Success Criteria

**Feature Complete When**:
- ✅ All API endpoints respond correctly
- ✅ End-to-end workflow completes successfully
- ✅ Error handling works as expected
- ✅ Performance requirements met
- ✅ Security policies enforced (RLS working)
- ✅ Audit trail captures all events
- ✅ Auto-approval mechanism functions
- ✅ Fraud detection provides useful insights

**Deployment Ready When**:
- ✅ All tests pass
- ✅ Database migrations successful
- ✅ File storage permissions configured
- ✅ OpenAI API integration working
- ✅ Rate limiting functional
- ✅ Monitoring and alerting configured

---

## Cleanup

```bash
# Clean up test data
DELETE FROM verification_audit_logs WHERE business_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM verification_results WHERE verification_session_id IN (
  SELECT id FROM verification_sessions WHERE business_id = '123e4567-e89b-12d3-a456-426614174000'
);
DELETE FROM verification_sessions WHERE business_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM payment_batches WHERE business_id = '123e4567-e89b-12d3-a456-426614174000';

# Clean up test files from Supabase Storage
# (Manual cleanup via Supabase dashboard)
```

**Quickstart Complete** - System validated and ready for production deployment.