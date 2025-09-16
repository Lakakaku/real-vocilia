# Data Model: Customer Entry Flow

## Overview
Data structures and relationships for the customer entry flow feature.

## Entities

### Store
Existing entity in the database that store codes reference.

```typescript
interface Store {
  id: string;                    // UUID, primary key
  business_id: string;           // UUID, foreign key to businesses
  name: string;                   // Store name
  store_code: string;             // 6-digit unique code
  location?: string;              // Optional location details
  is_active: boolean;             // Whether store accepts feedback
  created_at: Date;               // Timestamp
  updated_at: Date;               // Timestamp
}
```

**Constraints**:
- `store_code` must be unique across all stores
- `store_code` must be exactly 6 digits (validated: /^[0-9]{6}$/)
- `is_active` determines if code is valid for entry

### StoreCodeValidation (New)
Tracks validation attempts for security monitoring.

```typescript
interface StoreCodeValidation {
  id: string;                    // UUID, primary key
  store_code_attempt: string;    // The code that was attempted
  ip_address: string;             // Client IP for rate limiting
  user_agent?: string;            // Browser info for analytics
  is_valid: boolean;              // Whether code was valid
  store_id?: string;              // UUID, foreign key if valid
  attempted_at: Date;             // Timestamp
  error_type?: string;            // 'invalid_format' | 'not_found' | 'inactive' | 'rate_limited'
}
```

**Constraints**:
- Index on `ip_address` and `attempted_at` for rate limit queries
- Retention: 30 days for failed attempts, 7 days for successful

### RateLimitTracker (Runtime only - Redis/Memory)
Tracks rate limiting state per IP.

```typescript
interface RateLimitTracker {
  ip_address: string;             // Client IP address
  attempts: number;               // Count in current window
  window_start: Date;             // Start of current minute window
  blocked_until?: Date;           // If blocked, when it expires
}
```

**Constraints**:
- Resets every 60 seconds
- Max 5 attempts per window
- Stored in memory/Redis, not database

## Database Schema Updates

### Indexes Required
```sql
-- Existing (verify these exist)
CREATE UNIQUE INDEX idx_stores_store_code ON stores(store_code);
CREATE INDEX idx_stores_is_active ON stores(is_active);

-- New for validation tracking
CREATE INDEX idx_validations_ip_timestamp
  ON store_code_validations(ip_address, attempted_at DESC);
CREATE INDEX idx_validations_store_id
  ON store_code_validations(store_id)
  WHERE store_id IS NOT NULL;
```

### Row Level Security (RLS)
```sql
-- stores table: Public read for active stores only
CREATE POLICY "Public can read active store codes"
  ON stores FOR SELECT
  USING (is_active = true);

-- store_code_validations: Insert only, no read
CREATE POLICY "Public can insert validation attempts"
  ON store_code_validations FOR INSERT
  WITH CHECK (true);

-- Admin can read all validations
CREATE POLICY "Admins can read validations"
  ON store_code_validations FOR SELECT
  USING (auth.jwt() -> 'role' = 'admin');
```

## API Response Types

### ValidateStoreCodeRequest
```typescript
interface ValidateStoreCodeRequest {
  code: string;                   // 6-digit code from user input
}
```

### ValidateStoreCodeResponse
```typescript
interface ValidateStoreCodeResponse {
  success: boolean;
  redirect_url?: string;          // Only if success=true
  error?: {
    code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'RATE_LIMITED' | 'NETWORK_ERROR';
    message: string;              // User-friendly message
    retry_after?: number;         // Seconds until retry (for rate limit)
  };
}
```

## State Management

### Form State
```typescript
interface StoreCodeFormState {
  input_value: string;            // Current input (may include non-digits)
  sanitized_value: string;        // Digits only
  is_valid_format: boolean;       // Client-side validation
  is_submitting: boolean;         // Prevent double-submit
  error_message?: string;         // Current error to display
  attempts_count: number;         // For client-side rate limit
  last_attempt?: Date;            // For debouncing
}
```

## Data Flow

### Validation Flow
1. User enters code → Client sanitizes (removes non-digits)
2. Client validates format (exactly 6 digits)
3. Client checks rate limit (max 5 per minute)
4. API call to validate against database
5. Log validation attempt (success or failure)
6. Return redirect URL or error message

### Security Flow
```
User Input → Sanitization → Format Check → Rate Limit → Database Query → Audit Log
     ↓            ↓              ↓             ↓              ↓            ↓
   [Raw]      [Clean]      [Valid?]      [Allowed?]     [Exists?]    [Track]
```

## Migration Requirements

### Create validation tracking table
```sql
CREATE TABLE store_code_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_code_attempt VARCHAR(10) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  is_valid BOOLEAN NOT NULL,
  store_id UUID REFERENCES stores(id),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  error_type VARCHAR(20)
);

-- Add indexes
CREATE INDEX idx_validations_ip_timestamp
  ON store_code_validations(ip_address, attempted_at DESC);
CREATE INDEX idx_validations_store_id
  ON store_code_validations(store_id)
  WHERE store_id IS NOT NULL;

-- Enable RLS
ALTER TABLE store_code_validations ENABLE ROW LEVEL SECURITY;
```

### Ensure stores table has required fields
```sql
-- Add is_active if not exists
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure store_code is indexed
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_store_code
  ON stores(store_code);
```

## Performance Considerations

### Query Optimization
- Store code lookup: O(1) with unique index
- Rate limit check: O(1) with compound index on (ip, timestamp)
- Validation logging: Async/background to not block response

### Caching Strategy
- Cache active store codes in Redis/Edge (5 minute TTL)
- Cache rate limit state in memory
- No caching of validation results (security)