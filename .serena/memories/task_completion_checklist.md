# Task Completion Checklist

## Before Completing Any Task
1. **Type Check**: Run `npm run typecheck` to ensure no TypeScript errors
2. **Linting**: Run `npm run lint` to check code style
3. **Manual Testing**: Test functionality locally with `npm run dev`
4. **Error Handling**: Ensure all error cases are handled gracefully
5. **Loading States**: Add appropriate loading indicators
6. **Production Ready**: Code should be production-quality from day one

## Code Quality Standards
- No console.log statements in final code (use proper error logging)
- All functions have proper TypeScript types
- Database operations include error handling
- User feedback for all async operations
- Responsive design for all UI components

## Testing Requirements
- Test happy path functionality
- Test error scenarios
- Test with real but small data amounts
- Verify loading states work correctly
- Test on different screen sizes

## Database Considerations
- Always validate input data
- Use proper foreign key relationships
- Include created_at/updated_at timestamps
- Handle null/undefined values appropriately
- Use transactions for related operations

## Security Checklist
- Validate all user inputs
- Use server-side validation
- Protect against SQL injection
- Implement proper authentication checks
- Use environment variables for secrets