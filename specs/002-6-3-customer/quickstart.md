# Quickstart: Customer Entry Flow

## Overview
This guide walks through testing the customer entry flow feature from QR code scan to feedback redirect.

## Prerequisites

1. **Development Environment**
   ```bash
   # Install dependencies
   npm install

   # Set environment variables
   cp .env.example .env.local
   # Add your Supabase credentials to .env.local
   ```

2. **Database Setup**
   ```bash
   # Run migrations to create validation tracking table
   npm run supabase:migrate
   ```

3. **Test Data**
   ```sql
   -- Insert test stores with codes
   INSERT INTO stores (id, business_id, name, store_code, is_active)
   VALUES
     ('550e8400-e29b-41d4-a716-446655440001', '[business_id]', 'Test Store 1', '123456', true),
     ('550e8400-e29b-41d4-a716-446655440002', '[business_id]', 'Test Store 2', '654321', true),
     ('550e8400-e29b-41d4-a716-446655440003', '[business_id]', 'Inactive Store', '999999', false);
   ```

## Running the Application

```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## Testing Scenarios

### 1. Happy Path - Valid Store Code
1. Navigate to http://localhost:3000
2. Enter code: `123456`
3. Click submit or press Enter
4. **Expected**: Redirect to `/feedback/123456`
5. **Verify**: URL changed, feedback page loads

### 2. Invalid Format - Too Few Digits
1. Navigate to http://localhost:3000
2. Enter code: `1234`
3. Click submit
4. **Expected**: Error message "Please enter exactly 6 digits"
5. **Verify**: No redirect, error visible, form still usable

### 3. Invalid Code - Not Found
1. Navigate to http://localhost:3000
2. Enter code: `000000`
3. Click submit
4. **Expected**: Error "This code is not recognized. Please check and try again"
5. **Verify**: No redirect, can retry with different code

### 4. Inactive Store Code
1. Navigate to http://localhost:3000
2. Enter code: `999999`
3. Click submit
4. **Expected**: Error "This code is not recognized. Please check and try again"
5. **Verify**: Same error as not found (security: don't reveal existence)

### 5. Input Sanitization
1. Navigate to http://localhost:3000
2. Enter code with spaces: `123 456`
3. Click submit
4. **Expected**: Successful redirect (spaces stripped)
5. **Verify**: Redirect to `/feedback/123456`

### 6. Rate Limiting
1. Navigate to http://localhost:3000
2. Enter wrong code: `111111` and submit 6 times rapidly
3. **Expected**: After 5 attempts, error "Too many attempts. Please wait a minute and try again"
4. **Verify**: Further attempts blocked for 60 seconds

### 7. Mobile Experience
1. Open Chrome DevTools → Toggle device toolbar
2. Select iPhone 12 Pro
3. Navigate to http://localhost:3000
4. **Verify**:
   - Form fits screen without horizontal scroll
   - Input field is large enough to tap
   - Numeric keyboard appears on input focus
   - Error messages are readable

### 8. Offline Behavior
1. Load http://localhost:3000
2. Open DevTools → Network → Set to "Offline"
3. Enter code: `123456` and submit
4. **Expected**: Error "Connection issue. Please check your internet and try again"
5. **Verify**: Form remains functional, can retry when online

### 9. Direct Navigation (Bookmark)
1. Navigate directly to http://localhost:3000
2. **Expected**: Page loads normally
3. **Verify**: Form is functional without QR code context

### 10. Performance Test
1. Open DevTools → Network → Slow 3G
2. Navigate to http://localhost:3000
3. **Verify**:
   - Page loads in < 2 seconds
   - Form is interactive immediately
   - Validation response in < 3 seconds

## Automated Test Commands

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Monitoring Validation Attempts

```sql
-- View recent validation attempts
SELECT
  store_code_attempt,
  ip_address,
  is_valid,
  error_type,
  attempted_at
FROM store_code_validations
ORDER BY attempted_at DESC
LIMIT 20;

-- Check rate limit violations
SELECT
  ip_address,
  COUNT(*) as attempts,
  DATE_TRUNC('minute', attempted_at) as minute_window
FROM store_code_validations
WHERE attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address, minute_window
HAVING COUNT(*) > 5
ORDER BY minute_window DESC;
```

## Troubleshooting

### Issue: "Network Error" on valid code
- Check Supabase URL and anon key in `.env.local`
- Verify network connectivity
- Check browser console for CORS errors

### Issue: All codes show "not recognized"
- Verify test data was inserted
- Check database connection
- Ensure RLS policies are enabled

### Issue: Rate limiting not working
- Check Redis/memory cache is running
- Verify IP address is being captured
- Check Edge Function deployment

### Issue: Slow page load
- Run Lighthouse audit: `npm run lighthouse`
- Check bundle size: `npm run analyze`
- Verify static generation: `npm run build`

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Rate limiting Edge Function deployed
- [ ] SSL certificate active
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Analytics tracking code added
- [ ] Accessibility audit passed
- [ ] Security headers configured