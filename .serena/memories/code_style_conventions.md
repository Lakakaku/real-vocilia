# Vocilia Code Style and Conventions

## TypeScript Standards
- Use strict TypeScript with proper typing
- Define interfaces in `/types` directory
- Use type imports: `import type { ... } from '...'`
- Avoid `any` type, use proper type definitions

## React Patterns
- Use functional components with hooks
- Client components: `'use client'` directive at top
- Server components by default (no directive needed)
- Custom hooks in `/hooks` directory with `use` prefix

## Component Structure
- One component per file
- Export as default
- Use Shadcn/ui components for UI elements
- Props interfaces defined inline or in types file

## Naming Conventions
- Files: kebab-case (`context-service.ts`)
- Components: PascalCase (`OnboardingFlow.tsx`)
- Functions/variables: camelCase (`handleNext`)
- Constants: UPPER_SNAKE_CASE (`TOTAL_ONBOARDING_STEPS`)
- Database tables: snake_case (`business_contexts`)

## File Organization
- Server actions in `/app/actions/`
- Database operations in `/lib/db/`
- Services in `/lib/services/`
- Shared utilities in `/lib/utils.ts`
- UI components in `/components/`

## Error Handling
- Always handle database errors
- Use try-catch blocks for async operations
- Log errors to console
- Show user-friendly error messages
- Implement loading states

## Database Patterns
- Use Supabase client from `/lib/supabase/`
- Server components use server client
- Client components use browser client  
- Always validate data before DB operations
- Use transactions for multi-table operations