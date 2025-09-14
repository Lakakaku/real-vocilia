# Task Completion Workflow

## When a Task is Completed

### 1. Code Quality Checks
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Fix any issues before committing
```

### 2. Testing Requirements
- Test with real production data (small amounts)
- Create actual business accounts for testing
- Use real phone numbers and emails
- Process micro-payments (1-5 SEK) when testing payments
- Delete test accounts after development

### 3. Git Workflow
```bash
# Check status
git status

# Add changes
git add .

# Commit with descriptive message
git commit -m "feat: implement AI context integration"

# Push to main (auto-deploys to Vercel)
git push origin main
```

### 4. Deployment Verification
- Check Vercel dashboard for successful deployment
- Test the deployed feature on actual domains
- Monitor Sentry for any new errors
- Verify Supabase database changes if applicable

### 5. Documentation
- Update any relevant documentation
- Add JSDoc comments for new functions
- Update type definitions if needed
- No need to create README files unless explicitly requested

### 6. Security Considerations
- Ensure proper authentication checks
- Verify Row Level Security (RLS) policies
- Check for proper input validation
- Ensure no sensitive data exposure

### 7. Production Validation
- Test the complete user flow end-to-end
- Verify with actual data (minimal amounts)
- Check mobile responsiveness if UI changes
- Confirm proper error handling

## Important Reminders
- ⚠️ Everything is production from day one
- No demo data or test environments
- Use feature flags for incomplete features
- Maintain audit logs for sensitive operations
- Always use HTTPS and proper security headers