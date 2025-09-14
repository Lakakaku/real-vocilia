# Tech Stack and Code Conventions

## Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with Shadcn/ui components
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Query/SWR for server state
- **AI**: OpenAI GPT-4o-mini and Whisper
- **Payments**: Swish Business API
- **Email**: Resend
- **Monitoring**: Sentry

## Code Style and Conventions
- **TypeScript**: Strict mode, proper type definitions
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **File Structure**: 
  - `types/` - Type definitions
  - `lib/` - Utilities, services, and business logic
  - `components/` - Reusable UI components
  - `app/` - Next.js app router pages
  - `hooks/` - Custom React hooks

## Component Patterns
- Use functional components with hooks
- Prefer TypeScript interfaces for props
- Use Shadcn/ui components as base
- Implement proper error boundaries
- Use React Hook Form for form handling
- Validate with Zod schemas

## Database Conventions
- Use Row Level Security (RLS) on all tables
- Foreign keys for data relationships
- JSONB for flexible data (context storage)
- Proper indexing for performance
- Audit trails for sensitive operations

## API Conventions
- RESTful endpoints in `app/api/` routes
- Proper error handling and status codes
- Rate limiting implementation
- Input validation with Zod
- Service role functions for secure operations