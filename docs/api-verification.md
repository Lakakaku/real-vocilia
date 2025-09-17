# Verification API Documentation

## Overview

The Verification API provides endpoints for managing payment verification workflows, including batch processing, transaction verification, and deadline management with 7-day auto-approval cycles.

## Base URL

```
https://admin.vocilia.com/api
```

## Authentication

All endpoints require authentication via Supabase JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

## Endpoints

### Batch Management

#### GET /api/admin/batches

Retrieve paginated list of verification batches with filtering and sorting.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `status` (string) - Filter by status: `pending`, `processing`, `completed`, `failed`
- `business_id` (string) - Filter by business ID
- `date_from` (string, ISO 8601) - Filter batches created after date
- `date_to` (string, ISO 8601) - Filter batches created before date
- `sort` (string, default: `created_at`) - Sort field: `created_at`, `deadline`, `transaction_count`
- `order` (string, default: `desc`) - Sort order: `asc`, `desc`

**Response:**
```json
{
  "data": [
    {
      "id": "batch_001",
      "business_id": "biz_123",
      "business_name": "Test Restaurant AB",
      "status": "pending",
      "transaction_count": 45,
      "total_amount": 12500.50,
      "currency": "SEK",
      "deadline": "2023-12-22T14:30:00Z",
      "auto_approve_eligible": true,
      "created_at": "2023-12-15T14:30:00Z",
      "updated_at": "2023-12-15T14:30:00Z",
      "verification_summary": {
        "approved": 42,
        "rejected": 1,
        "pending": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

#### POST /api/admin/batches

Create a new verification batch from uploaded CSV file.

**Request Body (multipart/form-data):**
- `file` (file) - CSV file with Swish transaction data
- `business_id` (string) - Business identifier
- `metadata` (JSON string, optional) - Additional batch metadata

**CSV Format Requirements:**
```csv
Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed
```

**Response:**
```json
{
  "data": {
    "id": "batch_002",
    "business_id": "biz_123",
    "status": "processing",
    "transaction_count": 23,
    "total_amount": 5750.25,
    "currency": "SEK",
    "deadline": "2023-12-22T14:30:00Z",
    "created_at": "2023-12-15T14:30:00Z",
    "processing_job_id": "job_456"
  }
}
```

#### GET /api/admin/batches/{id}

Retrieve detailed information about a specific batch.

**Path Parameters:**
- `id` (string) - Batch identifier

**Response:**
```json
{
  "data": {
    "id": "batch_001",
    "business_id": "biz_123",
    "business_name": "Test Restaurant AB",
    "status": "pending",
    "transaction_count": 45,
    "total_amount": 12500.50,
    "currency": "SEK",
    "deadline": "2023-12-22T14:30:00Z",
    "auto_approve_eligible": true,
    "created_at": "2023-12-15T14:30:00Z",
    "updated_at": "2023-12-15T14:30:00Z",
    "fraud_analysis": {
      "risk_score": 15,
      "patterns_detected": [],
      "ai_analysis_completed": true
    },
    "verification_summary": {
      "approved": 42,
      "rejected": 1,
      "pending": 2
    },
    "transactions": [
      {
        "id": "txn_001",
        "swish_reference": "SW123456789",
        "amount": 250.00,
        "sender_name": "John Doe",
        "verification_status": "approved"
      }
    ]
  }
}
```

#### POST /api/admin/batches/{id}/process

Manually trigger batch processing for re-processing failed batches.

**Path Parameters:**
- `id` (string) - Batch identifier

**Request Body:**
```json
{
  "force_reprocess": false,
  "skip_fraud_analysis": false
}
```

**Response:**
```json
{
  "data": {
    "batch_id": "batch_001",
    "status": "processing",
    "processing_job_id": "job_789",
    "estimated_completion": "2023-12-15T14:35:00Z"
  }
}
```

### Transaction Verification

#### GET /api/admin/transactions

Retrieve paginated list of transactions with advanced filtering.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `batch_id` (string) - Filter by batch ID
- `business_id` (string) - Filter by business ID
- `verification_status` (string) - Filter by status: `pending`, `approved`, `rejected`
- `risk_score_min` (integer, 0-100) - Minimum risk score filter
- `risk_score_max` (integer, 0-100) - Maximum risk score filter
- `amount_min` (number) - Minimum transaction amount
- `amount_max` (number) - Maximum transaction amount
- `date_from` (string, ISO 8601) - Filter transactions after date
- `date_to` (string, ISO 8601) - Filter transactions before date
- `sender_number` (string) - Filter by sender phone number
- `recipient_number` (string) - Filter by recipient phone number

**Response:**
```json
{
  "data": [
    {
      "id": "txn_001",
      "batch_id": "batch_001",
      "swish_reference": "SW123456789",
      "amount": 250.00,
      "currency": "SEK",
      "sender_name": "John Doe",
      "sender_number": "+46709876543",
      "recipient_name": "Test Business AB",
      "recipient_number": "+46701234567",
      "message": "Payment for services",
      "timestamp": "2023-12-15T14:30:00Z",
      "verification_status": "pending",
      "risk_score": 25,
      "fraud_indicators": [],
      "deadline": "2023-12-22T14:30:00Z",
      "created_at": "2023-12-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1247,
    "pages": 63
  }
}
```

#### GET /api/admin/transactions/{id}

Retrieve detailed information about a specific transaction.

**Path Parameters:**
- `id` (string) - Transaction identifier

**Response:**
```json
{
  "data": {
    "id": "txn_001",
    "batch_id": "batch_001",
    "swish_reference": "SW123456789",
    "amount": 250.00,
    "currency": "SEK",
    "sender_name": "John Doe",
    "sender_number": "+46709876543",
    "recipient_name": "Test Business AB",
    "recipient_number": "+46701234567",
    "message": "Payment for services",
    "timestamp": "2023-12-15T14:30:00Z",
    "verification_status": "pending",
    "risk_score": 25,
    "fraud_indicators": [],
    "deadline": "2023-12-22T14:30:00Z",
    "created_at": "2023-12-15T14:30:00Z",
    "fraud_analysis": {
      "risk_score": 25,
      "fraud_indicators": [],
      "patterns_detected": [],
      "ai_analysis": {
        "confidence": 0.85,
        "explanation": "Low risk transaction with normal patterns"
      },
      "analyzed_at": "2023-12-15T14:31:00Z"
    },
    "verification_history": [
      {
        "action": "created",
        "timestamp": "2023-12-15T14:30:00Z",
        "user_id": "system",
        "details": "Transaction imported from CSV"
      }
    ]
  }
}
```

#### POST /api/admin/transactions/{id}/verify

Manually verify a transaction (approve or reject).

**Path Parameters:**
- `id` (string) - Transaction identifier

**Request Body:**
```json
{
  "action": "approve",
  "reason": "Verified legitimate transaction",
  "notes": "Customer confirmed transaction details"
}
```

**Action values:**
- `approve` - Approve the transaction
- `reject` - Reject the transaction
- `flag` - Flag for further review

**Response:**
```json
{
  "data": {
    "id": "txn_001",
    "verification_status": "approved",
    "verified_by": "user_123",
    "verified_at": "2023-12-15T15:00:00Z",
    "verification_reason": "Verified legitimate transaction",
    "verification_notes": "Customer confirmed transaction details"
  }
}
```

#### POST /api/admin/transactions/bulk-verify

Bulk verify multiple transactions.

**Request Body:**
```json
{
  "transaction_ids": ["txn_001", "txn_002", "txn_003"],
  "action": "approve",
  "reason": "Bulk approval after manual review",
  "notes": "Verified batch as legitimate"
}
```

**Response:**
```json
{
  "data": {
    "processed": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "transaction_id": "txn_001",
        "status": "success",
        "verification_status": "approved"
      },
      {
        "transaction_id": "txn_002",
        "status": "success",
        "verification_status": "approved"
      },
      {
        "transaction_id": "txn_003",
        "status": "success",
        "verification_status": "approved"
      }
    ]
  }
}
```

### Deadline Management

#### GET /api/admin/deadlines

Retrieve transactions approaching or past deadlines.

**Query Parameters:**
- `status` (string) - Filter by deadline status: `approaching`, `overdue`, `auto_approved`
- `hours_until_deadline` (integer, default: 24) - Filter transactions with deadline within X hours
- `business_id` (string) - Filter by business ID

**Response:**
```json
{
  "data": [
    {
      "transaction_id": "txn_001",
      "batch_id": "batch_001",
      "business_name": "Test Restaurant AB",
      "amount": 250.00,
      "deadline": "2023-12-22T14:30:00Z",
      "hours_remaining": 12.5,
      "status": "approaching",
      "auto_approve_eligible": true,
      "risk_score": 25
    }
  ],
  "summary": {
    "approaching_deadline": 23,
    "overdue": 5,
    "auto_approved_today": 157
  }
}
```

#### POST /api/admin/deadlines/process-auto-approvals

Manually trigger auto-approval processing for eligible transactions.

**Request Body:**
```json
{
  "dry_run": false,
  "max_risk_score": 30,
  "exclude_business_ids": ["biz_123"]
}
```

**Response:**
```json
{
  "data": {
    "processed": 45,
    "auto_approved": 42,
    "skipped": 3,
    "skipped_reasons": {
      "high_risk": 2,
      "business_excluded": 1
    }
  }
}
```

### Fraud Detection

#### GET /api/admin/fraud/patterns

Retrieve detected fraud patterns across batches.

**Query Parameters:**
- `batch_id` (string) - Filter by specific batch
- `business_id` (string) - Filter by business
- `pattern_type` (string) - Filter by pattern: `high_velocity`, `amount_clustering`, `time_clustering`
- `confidence_min` (number, 0-1) - Minimum confidence score

**Response:**
```json
{
  "data": [
    {
      "id": "pattern_001",
      "batch_id": "batch_001",
      "pattern_type": "high_velocity",
      "patterns_detected": ["high_velocity", "amount_clustering"],
      "confidence_score": 0.85,
      "affected_transactions": 12,
      "detected_at": "2023-12-15T14:32:00Z",
      "risk_assessment": {
        "overall_risk": "medium",
        "recommendation": "manual_review"
      }
    }
  ]
}
```

#### POST /api/admin/fraud/analyze

Trigger manual fraud analysis for a batch or transaction.

**Request Body:**
```json
{
  "target_type": "batch",
  "target_id": "batch_001",
  "force_reanalysis": false,
  "analysis_options": {
    "include_ai_analysis": true,
    "include_pattern_detection": true,
    "risk_threshold": 0.7
  }
}
```

**Response:**
```json
{
  "data": {
    "analysis_id": "analysis_456",
    "target_type": "batch",
    "target_id": "batch_001",
    "status": "processing",
    "estimated_completion": "2023-12-15T14:40:00Z"
  }
}
```

### Real-time Updates

#### WebSocket Connection

Connect to real-time updates for verification status changes.

**WebSocket URL:**
```
wss://admin.vocilia.com/api/ws/verification
```

**Authentication:**
Send JWT token in the first message after connection:
```json
{
  "type": "auth",
  "token": "your_jwt_token"
}
```

**Subscribe to Updates:**
```json
{
  "type": "subscribe",
  "channels": ["batch_updates", "transaction_updates", "deadline_alerts"]
}
```

**Message Types:**
- `batch_status_change` - Batch processing status updates
- `transaction_verified` - Transaction verification completed
- `deadline_approaching` - Transaction deadline approaching (1 hour warning)
- `auto_approval_completed` - Auto-approval processing completed
- `fraud_pattern_detected` - New fraud pattern identified

**Example Message:**
```json
{
  "type": "transaction_verified",
  "data": {
    "transaction_id": "txn_001",
    "batch_id": "batch_001",
    "verification_status": "approved",
    "verified_by": "user_123",
    "timestamp": "2023-12-15T15:00:00Z"
  }
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **File uploads**: 5 requests per minute per user
- **WebSocket connections**: 1 connection per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1671123600
```

## Webhook Notifications

Configure webhook endpoints to receive real-time notifications about verification events.

### Webhook Events

- `batch.created` - New batch uploaded
- `batch.completed` - Batch processing completed
- `transaction.verified` - Transaction manually verified
- `transaction.auto_approved` - Transaction auto-approved
- `deadline.approaching` - Transaction deadline approaching
- `fraud.pattern_detected` - Fraud pattern detected

### Webhook Payload

```json
{
  "event": "transaction.verified",
  "timestamp": "2023-12-15T15:00:00Z",
  "data": {
    "transaction_id": "txn_001",
    "batch_id": "batch_001",
    "business_id": "biz_123",
    "verification_status": "approved",
    "verified_by": "user_123"
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { VerificationAPI } from '@vocilia/verification-sdk'

const api = new VerificationAPI({
  baseUrl: 'https://admin.vocilia.com/api',
  token: 'your_jwt_token'
})

// Get batches
const batches = await api.batches.list({
  status: 'pending',
  limit: 50
})

// Verify transaction
const result = await api.transactions.verify('txn_001', {
  action: 'approve',
  reason: 'Verified legitimate transaction'
})

// Real-time updates
const ws = api.realtime.connect()
ws.subscribe(['transaction_updates'])
ws.on('transaction_verified', (data) => {
  console.log('Transaction verified:', data.transaction_id)
})
```

### cURL Examples

```bash
# Get batches
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://admin.vocilia.com/api/admin/batches?status=pending&limit=20"

# Verify transaction
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","reason":"Verified"}' \
  "https://admin.vocilia.com/api/admin/transactions/txn_001/verify"

# Upload batch
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@transactions.csv" \
  -F "business_id=biz_123" \
  "https://admin.vocilia.com/api/admin/batches"
```

## Error Handling Best Practices

1. **Always check HTTP status codes** before processing response data
2. **Implement exponential backoff** for retryable errors (5xx status codes)
3. **Handle rate limiting** by checking `X-RateLimit-*` headers
4. **Validate request data** before sending to avoid 400 errors
5. **Monitor webhook delivery** and implement retry logic for failed deliveries

## Security Considerations

- All requests must use HTTPS
- JWT tokens expire after 24 hours
- API keys should be stored securely and rotated regularly
- Webhook endpoints should validate request signatures
- Rate limiting prevents abuse and DoS attacks
- All sensitive data is encrypted at rest and in transit