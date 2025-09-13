# API.md - Vocilia API Specification

## Critical Notice: Production API Only
⚠️ **NO TEST ENVIRONMENT** - All API calls hit production immediately ⚠️

Use minimal amounts (1-5 SEK) when testing payment endpoints. All data created is permanent production data.

## API Architecture

### Base URLs
```
Customer API: https://vocilia.com/api
Business API: https://business.vocilia.com/api
Admin API: https://admin.vocilia.com/api
```

### Authentication
- **Business Users:** Supabase Auth JWT tokens
- **Admin Users:** Supabase Auth with admin role verification
- **Customer Endpoints:** Public (no auth required)

### Headers
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-Request-ID: {unique_request_id}
```

## Authentication Endpoints

### POST /auth/signup
Create new business account (production account).

**Request:**
```json
{
  "email": "business@example.com",
  "password": "SecurePassword123!",
  "name": "ICA Södermalm"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "business@example.com",
    "created_at": "2024-03-15T10:00:00Z"
  },
  "business": {
    "id": "uuid",
    "name": "ICA Södermalm",
    "onboarding_step": 0
  },
  "access_token": "jwt_token",
  "refresh_token": "refresh_token"
}
```

### POST /auth/login
Authenticate business user.

**Request:**
```json
{
  "email": "business@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "business@example.com"
  },
  "business": {
    "id": "uuid",
    "name": "ICA Södermalm",
    "onboarding_completed": true
  },
  "access_token": "jwt_token",
  "refresh_token": "refresh_token"
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response (200):**
```json
{
  "access_token": "new_jwt_token",
  "refresh_token": "new_refresh_token"
}
```

### POST /auth/logout
Logout user.

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

## Business Onboarding Endpoints

### GET /onboarding/status
Get current onboarding status.

**Response (200):**
```json
{
  "completed": false,
  "current_step": 3,
  "total_steps": 6,
  "data": {
    "business_type": "grocery_store",
    "store_count": 2,
    "completed_steps": ["welcome", "profile", "technical"]
  }
}
```

### POST /onboarding/step
Save onboarding step data.

**Request:**
```json
{
  "step": 3,
  "data": {
    "business_type": "grocery_store",
    "store_count": 2,
    "avg_transaction_value": 500,
    "expected_volume": "realistic"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "next_step": 4,
  "progress_percentage": 50
}
```

### POST /onboarding/complete
Complete onboarding and activate account.

**Response (200):**
```json
{
  "success": true,
  "business": {
    "id": "uuid",
    "onboarding_completed": true,
    "context_completeness": 25
  },
  "next_actions": [
    "Download QR codes",
    "Complete context setup",
    "Display QR codes in store"
  ]
}
```

## Context Management Endpoints

### GET /context
Get business context data.

**Response (200):**
```json
{
  "context": {
    "id": "uuid",
    "completeness_score": 75,
    "physical_layout": {
      "departments": ["produce", "meat", "dairy", "bakery"],
      "checkout_areas": 4,
      "special_sections": ["organic", "gluten-free"]
    },
    "staff_info": {
      "employees": [
        {"name": "Anna", "department": "bakery"},
        {"name": "Erik", "department": "checkout"}
      ]
    },
    "products_services": {
      "categories": ["groceries", "household", "pharmacy"],
      "price_ranges": {"min": 10, "max": 2000}
    },
    "operational_details": {
      "hours": {
        "weekdays": "07:00-22:00",
        "weekends": "08:00-21:00"
      },
      "peak_times": ["12:00-13:00", "17:00-19:00"]
    },
    "custom_questions": [
      {
        "id": "q1",
        "text": "How was the produce section today?",
        "frequency": 20,
        "active": true
      }
    ]
  }
}
```

### PUT /context
Update business context.

**Request:**
```json
{
  "physical_layout": {
    "departments": ["produce", "meat", "dairy", "bakery", "deli"],
    "new_section": "hot_food_counter"
  },
  "staff_info": {
    "add_employee": {"name": "Sandra", "department": "deli"}
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "completeness_score": 82,
  "improvements": [
    "Add operating hours for holidays",
    "Include typical transaction patterns"
  ]
}
```

### POST /context/ai-assistant
Interact with AI context assistant.

**Request:**
```json
{
  "message": "We just opened a new coffee corner in the store",
  "conversation_id": "uuid"
}
```

**Response (200):**
```json
{
  "response": "Great! A coffee corner is an excellent addition. Let me update your context. What coffee brands do you serve? Do you offer pastries? This will help me identify legitimate feedback about this new area.",
  "context_updates": {
    "suggested": [
      "Add 'coffee_corner' to physical_layout",
      "Add coffee products to products_services"
    ]
  },
  "conversation_id": "uuid"
}
```

### POST /context/custom-questions
Manage custom questions.

**Request:**
```json
{
  "action": "add",
  "question": {
    "text": "What did you think of our new coffee corner?",
    "frequency": 15,
    "store_ids": ["all"],
    "priority": "high"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "question_id": "q2",
  "active_questions": 3
}
```

## Store Management Endpoints

### GET /stores
List all stores for business.

**Response (200):**
```json
{
  "stores": [
    {
      "id": "uuid",
      "name": "ICA Södermalm Main",
      "store_code": "ABC123",
      "location": {
        "address": "Götgatan 45",
        "city": "Stockholm",
        "postal": "11821"
      },
      "qr_code_url": "https://storage.vocilia.com/qr/ABC123.png",
      "is_active": true,
      "feedback_count_this_week": 34
    }
  ]
}
```

### POST /stores
Create new store location.

**Request:**
```json
{
  "name": "ICA Södermalm Express",
  "location": {
    "address": "Hornsgatan 23",
    "city": "Stockholm",
    "postal": "11823"
  },
  "operating_hours": {
    "weekdays": "08:00-20:00",
    "weekends": "10:00-18:00"
  }
}
```

**Response (201):**
```json
{
  "store": {
    "id": "uuid",
    "name": "ICA Södermalm Express",
    "store_code": "XYZ789",
    "qr_code_url": "https://storage.vocilia.com/qr/XYZ789.png"
  }
}
```

### GET /stores/{store_id}/qr-code
Generate QR code for store.

**Response (200):**
```json
{
  "store_code": "ABC123",
  "qr_formats": {
    "png": "https://storage.vocilia.com/qr/ABC123.png",
    "svg": "https://storage.vocilia.com/qr/ABC123.svg",
    "pdf": "https://storage.vocilia.com/qr/ABC123.pdf"
  },
  "display_sizes": {
    "counter": "https://storage.vocilia.com/qr/ABC123_small.pdf",
    "wall": "https://storage.vocilia.com/qr/ABC123_medium.pdf",
    "window": "https://storage.vocilia.com/qr/ABC123_large.pdf"
  }
}
```

## Customer Feedback Endpoints (Public)

### POST /feedback/validate-store
Validate store code entered by customer.

**Request:**
```json
{
  "store_code": "ABC123"
}
```

**Response (200):**
```json
{
  "valid": true,
  "store_name": "ICA Södermalm",
  "redirect_url": "https://vocilia.com/feedback/ABC123"
}
```

### POST /feedback/initiate
Start feedback session.

**Request:**
```json
{
  "store_code": "ABC123",
  "transaction_time": "2024-03-15T14:30:00Z",
  "transaction_amount": 500,
  "phone_number": "+46701234567"
}
```

**Response (200):**
```json
{
  "session_id": "uuid",
  "voice_session_url": "wss://voice.vocilia.com/session/uuid",
  "estimated_duration": "2-5 minutes"
}
```

### POST /feedback/complete
Complete feedback session and show reward.

**Request:**
```json
{
  "session_id": "uuid",
  "voice_transcript": "...",
  "duration_seconds": 180
}
```

**Response (200):**
```json
{
  "quality_score": 85,
  "quality_tier": "10-12%",
  "reward_percentage": 10,
  "reward_amount": 50,
  "payment_schedule": "Within 7 days",
  "feedback_tips": [
    "Next time, mention specific staff names for higher rewards"
  ]
}
```

## Business Verification Endpoints

### GET /verification/current
Get current verification batch.

**Response (200):**
```json
{
  "verification": {
    "id": "uuid",
    "week_number": 37,
    "year": 2024,
    "status": "pending",
    "deadline": "2024-10-23T17:00:00Z",
    "time_remaining": {
      "days": 5,
      "hours": 14,
      "minutes": 32
    },
    "batch_url": "https://storage.vocilia.com/batches/week37_ica.csv",
    "total_items": 28,
    "total_amount": 1450
  }
}
```

### GET /verification/{id}/download
Download verification batch CSV.

**Response (200):**
```csv
Transaction_ID,Date_Time,Amount_SEK,Phone_Last4
#4837,2024-10-14 14:30,500,**43
#4839,2024-10-14 09:20,780,**89
```

### POST /verification/{id}/upload
Upload verified CSV.

**Request:** Multipart form data with CSV file

**Response (200):**
```json
{
  "success": true,
  "processed": {
    "total": 28,
    "approved": 27,
    "rejected": 1
  },
  "status": "uploaded",
  "summary": {
    "approved_amount": 1380,
    "platform_fee": 276,
    "total_invoice": 1656
  }
}
```

### GET /verification/history
Get verification history.

**Response (200):**
```json
{
  "verifications": [
    {
      "week": 36,
      "status": "completed",
      "submitted_on_time": true,
      "approval_rate": 0.96
    },
    {
      "week": 35,
      "status": "completed",
      "submitted_on_time": true,
      "approval_rate": 0.94
    }
  ],
  "statistics": {
    "on_time_rate": 0.85,
    "average_approval_rate": 0.95
  }
}
```

## Feedback Analytics Endpoints

### GET /feedback
Get released feedback.

**Query Parameters:**
- `week`: Week number (optional)
- `year`: Year (optional)
- `quality_min`: Minimum quality score
- `sentiment`: positive/negative/neutral
- `category`: Category filter
- `search`: Text search
- `limit`: Results per page
- `offset`: Pagination offset

**Response (200):**
```json
{
  "feedback": [
    {
      "id": "uuid",
      "date": "2024-10-14T14:30:00Z",
      "quality_score": 85,
      "quality_tier": "10-12%",
      "sentiment": "positive",
      "categories": ["checkout", "staff", "product_request"],
      "key_insights": {
        "praised": ["Staff friendliness", "Product freshness"],
        "issues": ["15-minute checkout wait"],
        "requests": ["Gluten-free bakery items"]
      },
      "transcript_summary": "Customer praised Anna in bakery...",
      "is_new": true,
      "is_addressed": false
    }
  ],
  "summary": {
    "total_count": 47,
    "average_quality": 72,
    "sentiment_breakdown": {
      "positive": 30,
      "neutral": 12,
      "negative": 5
    },
    "top_issues": [
      {"issue": "Checkout delays", "mentions": 18},
      {"issue": "Parking", "mentions": 7}
    ]
  },
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /feedback/{id}
Get detailed feedback.

**Response (200):**
```json
{
  "feedback": {
    "id": "uuid",
    "full_transcript": "Complete voice transcript...",
    "ai_analysis": {
      "legitimacy_score": 95,
      "depth_score": 80,
      "constructiveness_score": 85,
      "specificity_score": 75,
      "context_matches": ["Anna", "bakery", "lunch_rush"],
      "fraud_indicators": []
    },
    "customer_details": {
      "phone_last_four": "**43",
      "transaction_amount": 500,
      "transaction_time": "14:30"
    },
    "reward": {
      "percentage": 10,
      "amount": 50,
      "payment_status": "pending"
    }
  }
}
```

### POST /feedback/{id}/action
Mark feedback as addressed.

**Request:**
```json
{
  "action": "addressed",
  "notes": "Opened additional checkout during lunch hours"
}
```

**Response (200):**
```json
{
  "success": true,
  "feedback_id": "uuid",
  "status": "addressed"
}
```

### GET /feedback/analytics
Get advanced analytics.

**Response (200):**
```json
{
  "trends": {
    "weekly": [
      {"week": 37, "avg_quality": 75, "volume": 47},
      {"week": 36, "avg_quality": 72, "volume": 43}
    ],
    "improvement_areas": [
      {
        "area": "Checkout efficiency",
        "trend": "worsening",
        "mentions_change": "+35%"
      }
    ]
  },
  "insights": {
    "actionable_items": 12,
    "addressed_rate": 0.75,
    "customer_satisfaction_trend": "improving"
  },
  "financial": {
    "total_rewards_this_month": 5670,
    "platform_fees": 1134,
    "average_reward_per_feedback": 120
  }
}
```

## Settings Endpoints

### GET /settings
Get business settings.

**Response (200):**
```json
{
  "settings": {
    "notifications": {
      "verification_reminders": true,
      "new_feedback_alerts": true,
      "weekly_summaries": true
    },
    "verification": {
      "time_tolerance_minutes": 2,
      "amount_tolerance_sek": 0.5,
      "auto_approve_threshold": 95
    },
    "invoicing": {
      "billing_email": "accounts@business.com",
      "invoice_format": "pdf",
      "payment_terms_days": 10
    }
  }
}
```

### PUT /settings
Update settings.

**Request:**
```json
{
  "notifications": {
    "weekly_summaries": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "updated_fields": ["notifications.weekly_summaries"]
}
```

## Admin API Endpoints

### GET /admin/businesses
List all businesses (admin only).

**Response (200):**
```json
{
  "businesses": [
    {
      "id": "uuid",
      "name": "ICA Södermalm",
      "email": "contact@ica.se",
      "feedback_this_week": 34,
      "verification_status": "pending",
      "total_rewards": 1450
    }
  ],
  "statistics": {
    "total_businesses": 47,
    "active_this_week": 44,
    "pending_verifications": 12
  }
}
```

### POST /admin/verification/send
Send verification batch to business.

**Request:**
```json
{
  "business_id": "uuid",
  "week_number": 37,
  "feedback_ids": ["uuid1", "uuid2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "batch_id": "uuid",
  "items_sent": 28,
  "deadline": "2024-10-23T17:00:00Z"
}
```

### POST /admin/feedback/release
Release weekly feedback to businesses.

**Request:**
```json
{
  "week_number": 37,
  "business_ids": ["all"]
}
```

**Response (200):**
```json
{
  "success": true,
  "businesses_notified": 44,
  "total_feedback_released": 1247
}
```

### POST /admin/payments/process
Process weekly payments.

**Request:**
```json
{
  "week_number": 37,
  "consolidate": true
}
```

**Response (200):**
```json
{
  "batch": {
    "id": "uuid",
    "unique_recipients": 892,
    "total_amount": 45670,
    "swish_batch_url": "https://storage.vocilia.com/payments/week37.csv"
  },
  "consolidation": {
    "original_transactions": 1247,
    "consolidated_to": 892,
    "savings": 177.50
  }
}
```

### POST /admin/invoices/generate
Generate business invoices.

**Request:**
```json
{
  "week_number": 37,
  "business_id": "uuid"
}
```

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "number": "2024-W37-001",
    "business": "ICA Södermalm",
    "customer_rewards": 1450,
    "platform_fee": 290,
    "total": 1740,
    "pdf_url": "https://storage.vocilia.com/invoices/2024-W37-001.pdf"
  }
}
```

## Voice Processing Endpoints (Railway Service)

### WebSocket /voice/session/{session_id}
Real-time voice conversation.

**Connection:**
```javascript
const ws = new WebSocket('wss://voice.vocilia.com/session/uuid');
```

**Messages:**
```json
// Client -> Server
{
  "type": "audio_chunk",
  "data": "base64_audio_data"
}

// Server -> Client
{
  "type": "ai_response",
  "text": "Kan du berätta mer om din upplevelse?",
  "audio": "base64_audio_response"
}

// Server -> Client (completion)
{
  "type": "session_complete",
  "quality_score": 85,
  "transcript": "full_transcript"
}
```

### POST /voice/transcribe
Transcribe audio to text.

**Request:**
```json
{
  "audio": "base64_audio_data",
  "language": "sv-SE"
}
```

**Response (200):**
```json
{
  "transcript": "Jag handlade på ICA idag...",
  "confidence": 0.95,
  "duration_seconds": 180
}
```

## Webhook Endpoints

### POST /webhooks/payment-status
Swish payment status webhook.

**Request:**
```json
{
  "payment_id": "swish_id",
  "status": "COMPLETED",
  "amount": 50,
  "reference": "W37-2024",
  "phone_number": "+46701234567"
}
```

**Response (200):**
```json
{
  "received": true
}
```

### POST /webhooks/verification-deadline
Verification deadline reminder webhook.

**Triggered:** 24 hours before deadline

**Request:**
```json
{
  "business_id": "uuid",
  "verification_id": "uuid",
  "hours_remaining": 24
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "request_id": "req_xyz123"
}
```

### Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

### Limits by Endpoint Type
- Authentication: 5 requests/minute
- Business API: 100 requests/minute
- Admin API: 200 requests/minute
- Public API: 20 requests/minute per IP
- Voice API: 1 concurrent session per phone

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1710500000
```

## API Versioning

### Current Version
`v1` - Production

### Version Header
```http
X-API-Version: v1
```

### Deprecation Policy
- Minimum 6 months notice before deprecation
- Backward compatibility for 12 months
- Version sunset dates in headers

## Integration Examples

### JavaScript/TypeScript
```typescript
// Supabase client setup
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ervnxnbxsaaeakbvwieh.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// API call example
async function getVerificationBatch() {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('status', 'pending')
    .single();

  if (error) throw error;
  return data;
}

// Authenticated request
async function updateContext(contextData: any) {
  const response = await fetch('/api/context', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(contextData)
  });

  return response.json();
}
```

### Python
```python
import requests
from datetime import datetime

class VociliaAPI:
    def __init__(self, api_key):
        self.base_url = "https://business.vocilia.com/api"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def get_feedback(self, week=None):
        params = {"week": week} if week else {}
        response = requests.get(
            f"{self.base_url}/feedback",
            headers=self.headers,
            params=params
        )
        return response.json()

    def upload_verification(self, verification_id, csv_file):
        files = {"file": open(csv_file, "rb")}
        response = requests.post(
            f"{self.base_url}/verification/{verification_id}/upload",
            headers={"Authorization": self.headers["Authorization"]},
            files=files
        )
        return response.json()
```

### cURL Examples
```bash
# Login
curl -X POST https://business.vocilia.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"business@example.com","password":"pass123"}'

# Get verification batch
curl -X GET https://business.vocilia.com/api/verification/current \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload verified CSV
curl -X POST https://business.vocilia.com/api/verification/uuid/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@verified_week37.csv"
```

## Security Best Practices

1. **Always use HTTPS** for all API calls
2. **Store tokens securely** - never in client-side code
3. **Implement token refresh** before expiration
4. **Validate all inputs** on both client and server
5. **Use rate limiting** to prevent abuse
6. **Implement CORS** properly for browser requests
7. **Log all admin actions** for audit trail
8. **Rotate API keys** every 90 days
9. **Use webhook signatures** for verification
10. **Implement idempotency** for critical operations

## Testing in Production

### Safe Testing Practices
1. Create real business account with "Test" prefix
2. Use minimal amounts (1-5 SEK) for transactions
3. Use your own phone number for feedback
4. Clean up test data after verification
5. Monitor all test operations in logs

### Test Data Cleanup
```sql
-- Remove test business and all related data
DELETE FROM businesses WHERE name LIKE 'Test%';
```

## Support & Documentation

**API Status:** https://status.vocilia.com
**Developer Docs:** https://docs.vocilia.com/api
**Support Email:** api-support@vocilia.com
**Rate Limit Issues:** Contact support for increase
**Security Issues:** security@vocilia.com (urgent)