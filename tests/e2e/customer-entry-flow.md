# End-to-End Testing: Customer Entry Flow

## Overview
This document outlines the end-to-end testing strategy for the Customer Entry Flow feature. These tests ensure the complete user journey works correctly from landing page to store validation.

## Test Environment Setup

### Prerequisites
1. Local development server running (`npm run dev`)
2. Supabase database with test data
3. Valid test store codes in the database
4. Browser with developer tools enabled

### Test Data Requirements
- At least one active store with a valid 6-digit code
- At least one inactive store for negative testing
- Test store codes: `123456` (active), `999999` (inactive)

## Test Scenarios

### Scenario 1: Successful Store Code Validation
**Test Case**: Happy path - valid store code entry and validation

**Steps**:
1. Navigate to `/` (customer landing page)
2. Verify page loads with correct title "Welcome to Vocilia"
3. Locate the store code input field
4. Enter a valid 6-digit store code: `123456`
5. Verify input formatting (digits only, centered text)
6. Click "Enter Store" button or press Enter
7. Verify loading state appears ("Validating...")
8. Verify success message appears
9. Verify automatic redirect to feedback page

**Expected Results**:
- Input accepts only digits
- Button enables when 6 digits entered
- Loading state shows during validation
- Success message displays briefly
- User redirected to `/feedback/123456`

### Scenario 2: Invalid Store Code Format
**Test Case**: User enters invalid format (non-digits, wrong length)

**Steps**:
1. Navigate to `/` (customer landing page)
2. Test various invalid inputs:
   - Letters: `ABCDEF`
   - Mixed: `AB1234`
   - Special chars: `12-345`
   - Too short: `12345`
   - Too long: `1234567`
3. For each input, verify error message
4. Verify button remains disabled for invalid formats

**Expected Results**:
- Invalid characters are automatically removed/sanitized
- Error messages appear for wrong length
- Submit button disabled for invalid formats
- Progressive validation guides user

### Scenario 3: Store Code Not Found
**Test Case**: Valid format but store doesn't exist

**Steps**:
1. Navigate to `/` (customer landing page)
2. Enter a valid format but non-existent code: `000001`
3. Click "Enter Store" button
4. Verify appropriate error message displays
5. Verify retry option is available

**Expected Results**:
- Validation request sent to API
- "Store not found" error message displays
- User can retry with different code
- No redirect occurs

### Scenario 4: Rate Limiting
**Test Case**: Too many validation attempts

**Steps**:
1. Navigate to `/` (customer landing page)
2. Rapidly submit invalid store codes 6 times
3. Verify rate limiting kicks in
4. Check error message includes retry time
5. Wait for rate limit to reset
6. Verify validation works again

**Expected Results**:
- After 5 attempts, rate limiting activates
- Error shows "Too many attempts" with countdown
- Retry button disabled during rate limit
- Rate limit resets after 1 minute

### Scenario 5: Network Error Handling
**Test Case**: Simulate network issues

**Steps**:
1. Open browser developer tools
2. Navigate to `/` (customer landing page)
3. Set network to "Offline" in developer tools
4. Enter valid store code: `123456`
5. Click "Enter Store" button
6. Verify network error handling
7. Restore network connection
8. Click retry button

**Expected Results**:
- Network error message displays
- User informed about connection issue
- Retry option available
- Works correctly when connection restored

### Scenario 6: Mobile Responsiveness
**Test Case**: Verify mobile experience

**Steps**:
1. Open browser in mobile device mode (375px width)
2. Navigate to `/` (customer landing page)
3. Verify page layout adapts correctly
4. Test input field usability on mobile
5. Verify touch targets are appropriate size
6. Test keyboard input on mobile

**Expected Results**:
- Page is fully responsive
- Input field easy to use on mobile
- Buttons large enough for touch
- Text readable at mobile sizes

### Scenario 7: Accessibility Testing
**Test Case**: Verify accessibility compliance

**Steps**:
1. Navigate to `/` (customer landing page)
2. Test keyboard navigation (Tab, Enter, Escape)
3. Test screen reader compatibility
4. Verify color contrast ratios
5. Check focus indicators

**Expected Results**:
- All interactive elements keyboard accessible
- Proper ARIA labels and roles
- Good color contrast (WCAG AA)
- Clear focus indicators

## Performance Testing

### Load Time Testing
1. Measure initial page load time
2. Verify critical resources load quickly
3. Check Core Web Vitals scores
4. Test on various network speeds

### API Response Testing
1. Measure store validation API response time
2. Test under various load conditions
3. Verify rate limiting performance
4. Monitor database query performance

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Testing Matrix
Test each scenario across:
- Desktop browsers (latest versions)
- Mobile browsers (iOS Safari, Chrome Android)
- Different screen sizes and orientations

## Security Testing

### Input Sanitization
1. Test XSS prevention in input fields
2. Verify SQL injection protection
3. Test CSRF protection
4. Verify rate limiting security

### API Security
1. Test authentication requirements
2. Verify input validation
3. Test error message information disclosure
4. Check HTTPS enforcement

## Monitoring and Logging

### Error Tracking
1. Verify error logging works correctly
2. Test error reporting to monitoring service
3. Check user-friendly error messages
4. Verify sensitive data not logged

### Analytics
1. Test user interaction tracking
2. Verify conversion funnel metrics
3. Check performance monitoring
4. Test A/B testing framework (if applicable)

## Test Data Management

### Setup Script
```bash
# Insert test store data
npx supabase db seed
```

### Cleanup Script
```bash
# Clean test data after testing
npm run test:cleanup
```

## Automation Opportunities

### Future Test Automation
1. Set up Playwright or Cypress for E2E testing
2. Create automated regression test suite
3. Integrate with CI/CD pipeline
4. Set up visual regression testing

### Manual Testing Checklist
- [ ] Successful validation flow
- [ ] Invalid format handling
- [ ] Store not found error
- [ ] Rate limiting functionality
- [ ] Network error recovery
- [ ] Mobile responsiveness
- [ ] Accessibility compliance
- [ ] Performance benchmarks
- [ ] Browser compatibility
- [ ] Security validation

## Bug Reporting Template

When issues are found during testing:

```
**Environment**: Development/Staging/Production
**Browser**: Chrome 120.0.0.0
**Device**: Desktop/Mobile
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen
**Actual Result**: What actually happened
**Screenshots**: Attach if applicable
**Console Errors**: Any JavaScript errors
**Network Logs**: Relevant API calls
```

## Success Criteria

The Customer Entry Flow is considered ready for production when:
- ✅ All test scenarios pass consistently
- ✅ Performance meets requirements (< 2s load time)
- ✅ Accessibility compliance verified
- ✅ Cross-browser compatibility confirmed
- ✅ Security validation complete
- ✅ Error handling robust
- ✅ Mobile experience optimized
- ✅ Rate limiting working correctly
- ✅ Database integration stable
- ✅ Monitoring and logging operational