# Implementation Plan: Customer Entry Flow

**Branch**: `002-6-3-customer` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-6-3-customer/spec.md`
**Execution Status**: ✅ **PHASES 0-2 COMPLETE** - Ready for /tasks command

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅ COMPLETED
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✅ COMPLETED
   → Project Type: web (Next.js application)
   → All clarifications resolved in research phase
3. Fill the Constitution Check section ✅ COMPLETED
   → All constitutional requirements satisfied
4. Evaluate Constitution Check section ✅ COMPLETED
   → No violations, complexity tracking not needed
   → Initial Constitution Check: PASS
5. Execute Phase 0 → research.md ✅ COMPLETED
   → All NEEDS CLARIFICATION resolved
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅ COMPLETED
   → All artifacts generated successfully
7. Re-evaluate Constitution Check section ✅ COMPLETED
   → Post-Design Constitution Check: PASS
8. Plan Phase 2 → Task generation approach ✅ COMPLETED
9. STOP - Ready for /tasks command ✅ COMPLETED
```

**IMPORTANT**: The /plan command execution is now COMPLETE. Phase 2 task creation ready for /tasks command.

## Summary
Create a minimal, mobile-optimized landing page at vocilia.com where customers can enter 6-digit store codes after scanning QR codes. The system validates codes against the Supabase database and redirects to the feedback page. Implementation will utilize existing Supabase infrastructure, Next.js 14+, and maintain production-first principles.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Next.js 14+, Supabase Client SDK, React Hook Form, Tailwind CSS, Shadcn/ui
**Storage**: Supabase PostgreSQL (existing project: ervnxnbxsaaeakbvwieh)
**Testing**: Vitest, React Testing Library, Playwright (E2E)
**Target Platform**: Web (mobile-first responsive), deployed on Vercel
**Project Type**: web - Next.js application with App Router
**Performance Goals**: Landing page load < 2s on 3G, form submission < 1s on 4G
**Constraints**: Must work offline after initial load, handle intermittent connectivity, prevent brute-force attacks (rate limiting: 5 attempts per minute per IP)
**Scale/Scope**: Expected 100-1000 daily users initially, must scale to 10k daily without architecture changes

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **INITIAL CHECK: PASSED**
- [x] **Simplicity**: Single-purpose landing page with minimal dependencies ✓
- [x] **Production-First**: Using real Supabase database from day one ✓
- [x] **Security**: Input validation, rate limiting, SQL injection prevention ✓
- [x] **Performance**: Mobile-first, < 2s load time target ✓
- [x] **Testability**: Clear acceptance criteria, unit and E2E tests planned ✓
- [x] **Accessibility**: Basic accessibility (form labels, error messages) ✓

✅ **POST-DESIGN CHECK: PASSED**
- [x] All design decisions align with constitutional principles
- [x] No unnecessary complexity introduced
- [x] TDD approach maintained throughout

## Project Structure

### Documentation (this feature) ✅ COMPLETE
```
specs/002-6-3-customer/
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   └── validate-store-code.yaml
└── tasks.md             # Phase 2 output (/tasks command) - PENDING
```

### Source Code (repository root)
```
# Option 2: Web application (Next.js monorepo)
app/                     # Next.js 14+ App Router
├── page.tsx             # Landing page (vocilia.com)
├── api/
│   └── validate-store-code/
└── feedback/
    └── [store_code]/

components/
├── ui/                  # Shadcn components
└── store-code-form/     # Feature components

lib/
├── supabase/           # Database client
├── validation/         # Input validation
└── types/              # TypeScript types

tests/
├── unit/               # Component and function tests
├── integration/        # API endpoint tests
└── e2e/                # Playwright tests
```

**Structure Decision**: Option 2 (Web application) - Next.js monorepo with existing structure

## Phase 0: Outline & Research ✅ COMPLETED

**Status**: ✅ All research completed and documented in `research.md`

**Key Decisions Made**:
- Next.js 14+ with App Router for framework
- React Hook Form with Zod for validation
- Supabase Client SDK with RLS for security
- Progressive Web App approach for offline capability
- IP-based rate limiting via Edge Functions

**All NEEDS CLARIFICATION Resolved**:
1. Expired codes handling → Generic "invalid code" message
2. Offline behavior → Service worker with cached offline message
3. Rate limiting → 5 attempts per minute per IP
4. Performance target → < 2s on 3G, < 1s on 4G
5. Accessibility → Basic compliance, full WCAG AA in future

**Output**: ✅ research.md created with all decisions documented

## Phase 1: Design & Contracts ✅ COMPLETED

**Status**: ✅ All design artifacts created successfully

**Completed Tasks**:
1. ✅ **Data Model**: `data-model.md` created
   - Store entity definition
   - New StoreCodeValidation entity for audit
   - API response types
   - Database migration requirements

2. ✅ **API Contracts**: `/contracts/validate-store-code.yaml` created
   - OpenAPI 3.0 specification
   - Request/response schemas
   - Error handling definitions
   - Rate limiting responses

3. ✅ **Testing Guide**: `quickstart.md` created
   - 10 comprehensive test scenarios
   - Performance testing guidelines
   - Production checklist
   - Monitoring queries

4. ✅ **Agent Context**: Updated `/Users/lucasjenner/vocilia/CLAUDE.md`
   - Current feature context added
   - Technology stack documented
   - Recent changes tracked

**Output**: ✅ All Phase 1 artifacts generated successfully

## Phase 2: Task Planning Approach ✅ COMPLETED

**Status**: ✅ Task generation strategy fully planned

**Task Generation Strategy**:
The /tasks command will generate approximately 25 tasks following TDD principles:

1. **Database Setup Tasks** (3 tasks)
   - Create migration for store_code_validations table
   - Apply RLS policies for stores and validations
   - Verify indexes exist for performance

2. **Contract Test Tasks** (2 tasks) [P]
   - Create API contract test for /api/validate-store-code
   - Create test fixtures with valid/invalid store codes

3. **Unit Test Tasks** (4 tasks) [P]
   - Test input sanitization function
   - Test validation logic
   - Test rate limiting logic
   - Test error message generation

4. **Component Implementation Tasks** (5 tasks)
   - Create StoreCodeInput component
   - Create ErrorMessage component
   - Create landing page layout
   - Implement form validation with React Hook Form
   - Add loading and submission states

5. **API Implementation Tasks** (3 tasks)
   - Create /api/validate-store-code endpoint
   - Implement Supabase query logic
   - Add rate limiting middleware

6. **Integration Test Tasks** (3 tasks)
   - Test complete validation flow
   - Test rate limiting behavior
   - Test error handling scenarios

7. **E2E Test Tasks** (2 tasks)
   - Test happy path from code entry to redirect
   - Test mobile experience and offline behavior

8. **Performance & Polish Tasks** (3 tasks)
   - Add PWA manifest and service worker
   - Optimize bundle size and loading
   - Add analytics and error tracking

**Ordering Strategy**:
- Database → Tests → Components → API → Integration → E2E → Polish
- Parallel tasks marked with [P] can be done simultaneously
- Each implementation task follows its corresponding test task

**Estimated Output**: 25 numbered, ordered tasks in tasks.md

**READY**: ✅ All planning complete - ready for /tasks command execution

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No complexity deviations required - all solutions follow constitutional principles*

✅ **No violations documented**: Design maintains simplicity and follows established patterns

## Progress Tracking ✅ ALL PLAN PHASES COMPLETE
*This checklist is updated during execution flow*

**Phase Status**:
- [x] ✅ Phase 0: Research complete (/plan command)
- [x] ✅ Phase 1: Design complete (/plan command)
- [x] ✅ Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] ✅ Initial Constitution Check: PASS
- [x] ✅ Post-Design Constitution Check: PASS
- [x] ✅ All NEEDS CLARIFICATION resolved
- [x] ✅ Complexity deviations documented (none required)

## Summary of Completed Work

### ✅ Completed Tasks:
1. **Feature Specification Analysis** - Requirements understood and clarified
2. **Technical Context Definition** - Stack and constraints documented
3. **Constitutional Compliance** - All principles satisfied
4. **Research Phase** - Technology decisions made and documented
5. **Data Model Design** - Database schema and entities defined
6. **API Contract Design** - OpenAPI specification created
7. **Testing Strategy** - Comprehensive test scenarios planned
8. **Agent Context Update** - Development context documented
9. **Task Generation Planning** - Implementation approach defined

### 📁 Generated Artifacts:
- `/specs/002-6-3-customer/spec.md` - Feature specification (7.1KB)
- `/specs/002-6-3-customer/research.md` - Research findings (5.0KB)
- `/specs/002-6-3-customer/data-model.md` - Database design (6.2KB)
- `/specs/002-6-3-customer/quickstart.md` - Testing guide (5.3KB)
- `/specs/002-6-3-customer/contracts/validate-store-code.yaml` - API contract
- `/specs/002-6-3-customer/plan.md` - This implementation plan (8.0KB)
- `/Users/lucasjenner/vocilia/CLAUDE.md` - Updated agent context

### 🎯 Next Step:
**Execute**: `/tasks` command to generate detailed task list (25 tasks) and begin implementation

---
*Plan Execution Complete | Ready for Implementation | Branch: 002-6-3-customer*