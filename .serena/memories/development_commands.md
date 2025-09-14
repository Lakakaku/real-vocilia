# Vocilia Development Commands

## Essential Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler check

## Development Workflow
1. Make changes to code
2. Test locally with `npm run dev`
3. Run `npm run typecheck` to check for type errors
4. Run `npm run lint` to check for linting issues
5. Commit and push (auto-deploys to Vercel)

## Testing Guidelines
- Use real but minimal amounts (1-5 SEK) for payment testing
- Create real business accounts for testing (delete when done)
- Test with actual voice calls through Railway service
- No demo data or test accounts allowed

## Key Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- RAILWAY_SERVICE_URL