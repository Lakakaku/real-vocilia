# Tasks: Customer Entry Flow

**Input**: Design documents from `/specs/002-6-3-customer/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓ COMPLETED
   → Tech stack: Next.js 14+, TypeScript, Supabase, React Hook Form
   → Structure: Next.js App Router monorepo
2. Load optional design documents: ✓ COMPLETED
   → data-model.md: Store, StoreCodeValidation entities
   → contracts/: validate-store-code.yaml API contract
   → quickstart.md: 10 test scenarios for validation
3. Generate tasks by category: ✓ COMPLETED
   → Setup: database migrations, dependencies
   → Tests: contract tests, integration tests, E2E tests
   → Core: components, API endpoint, validation logic
   → Integration: Supabase connection, rate limiting
   → Polish: PWA, performance optimization
4. Apply task rules: ✓ COMPLETED
   → Different files = marked [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✓ COMPLETED
6. Generate dependency graph ✓ COMPLETED
7. Create parallel execution examples ✓ COMPLETED
8. Validate task completeness: ✓ COMPLETED
   → validate-store-code.yaml has contract test
   → Store/StoreCodeValidation entities have implementation
   → All quickstart scenarios covered in tests
9. Return: SUCCESS (tasks ready for execution) ✓ COMPLETED
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Following Next.js App Router structure from plan.md:
- **Frontend**: `app/`, `components/`, `lib/`
- **Database**: `lib/supabase/`
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

## Phase 3.1: Setup & Database
- [ ] T001 Create Supabase migration for store_code_validations table in `lib/supabase/migrations/[timestamp]_create_store_code_validations.sql`
- [ ] T002 Apply RLS policies for stores and store_code_validations tables in `lib/supabase/migrations/[timestamp]_store_code_rls_policies.sql`
- [ ] T003 Verify database indexes exist for store_code lookup and rate limiting in `lib/supabase/migrations/[timestamp]_store_code_indexes.sql`
- [ ] T004 Create TypeScript types from Supabase schema in `lib/types/database.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test POST /api/validate-store-code in `tests/contract/validate-store-code.test.ts`
- [ ] T006 [P] Integration test valid store code validation flow in `tests/integration/store-code-validation.test.ts`
- [ ] T007 [P] Integration test invalid code handling in `tests/integration/invalid-code-handling.test.ts`
- [ ] T008 [P] Integration test rate limiting behavior in `tests/integration/rate-limiting.test.ts`
- [ ] T009 [P] Unit test input sanitization function in `tests/unit/input-sanitization.test.ts`
- [ ] T010 [P] Unit test validation logic in `tests/unit/validation-logic.test.ts`
- [ ] T011 [P] Unit test error message generation in `tests/unit/error-messages.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T012 [P] Input sanitization utility function in `lib/validation/sanitize-input.ts`
- [ ] T013 [P] Store code validation service in `lib/services/store-code-validation.ts`
- [ ] T014 [P] Error message utility in `lib/utils/error-messages.ts`
- [ ] T015 [P] Rate limiting utility in `lib/utils/rate-limiting.ts`
- [ ] T016 [P] StoreCodeInput component in `components/store-code-form/store-code-input.tsx`
- [ ] T017 [P] ErrorMessage component in `components/store-code-form/error-message.tsx`
- [ ] T018 [P] LoadingSpinner component in `components/ui/loading-spinner.tsx`
- [ ] T019 Landing page layout in `app/page.tsx`
- [ ] T020 Store code form with React Hook Form in `components/store-code-form/store-code-form.tsx`
- [ ] T021 POST /api/validate-store-code endpoint in `app/api/validate-store-code/route.ts`

## Phase 3.4: Integration & Middleware
- [ ] T022 Supabase client configuration in `lib/supabase/client.ts`
- [ ] T023 Rate limiting middleware for API routes in `lib/middleware/rate-limiting.ts`
- [ ] T024 Database query functions in `lib/supabase/queries/store-codes.ts`
- [ ] T025 Validation attempt logging in `lib/supabase/queries/validation-logs.ts`

## Phase 3.5: E2E Testing
- [ ] T026 [P] E2E test happy path (code entry to redirect) in `tests/e2e/happy-path.spec.ts`
- [ ] T027 [P] E2E test mobile experience and responsive design in `tests/e2e/mobile-experience.spec.ts`
- [ ] T028 [P] E2E test offline behavior and PWA functionality in `tests/e2e/offline-behavior.spec.ts`

## Phase 3.6: Performance & Polish
- [ ] T029 [P] PWA manifest and service worker in `public/manifest.json` and `public/sw.js`
- [ ] T030 [P] Bundle size optimization and code splitting in `next.config.js`
- [ ] T031 [P] Performance monitoring setup in `lib/analytics/performance.ts`
- [ ] T032 [P] Error tracking and logging in `lib/analytics/error-tracking.ts`
- [ ] T033 [P] Accessibility improvements (ARIA labels, focus management) in all components
- [ ] T034 Run quickstart.md test scenarios for manual validation

## Dependencies
**Setup Phase**:
- T001-T004 must complete before any implementation

**Tests Before Implementation**:
- T005-T011 (all tests) before T012-T021 (implementation)

**Component Dependencies**:
- T012-T015 (utilities) before T016-T018 (components)
- T016-T018 (components) before T019-T020 (forms/pages)
- T022-T025 (database/middleware) before T021 (API endpoint)

**Integration Dependencies**:
- T012-T025 (core + integration) before T026-T028 (E2E tests)
- T021 (API endpoint) before T026-T028 (E2E tests)

**Polish Phase**:
- All implementation (T012-T025) before polish (T029-T034)

## Parallel Execution Examples

### Setup Phase (can run together):
```bash
# Launch T001-T003 together (different migration files):
Task: "Create Supabase migration for store_code_validations table"
Task: "Apply RLS policies for stores and store_code_validations tables"
Task: "Verify database indexes exist for store_code lookup"
```

### Test Phase (can run together):
```bash
# Launch T005-T011 together (different test files):
Task: "Contract test POST /api/validate-store-code in tests/contract/validate-store-code.test.ts"
Task: "Integration test valid store code validation flow in tests/integration/store-code-validation.test.ts"
Task: "Integration test rate limiting behavior in tests/integration/rate-limiting.test.ts"
Task: "Unit test input sanitization function in tests/unit/input-sanitization.test.ts"
Task: "Unit test validation logic in tests/unit/validation-logic.test.ts"
```

### Utility Implementation (can run together):
```bash
# Launch T012-T015 together (different utility files):
Task: "Input sanitization utility function in lib/validation/sanitize-input.ts"
Task: "Store code validation service in lib/services/store-code-validation.ts"
Task: "Error message utility in lib/utils/error-messages.ts"
Task: "Rate limiting utility in lib/utils/rate-limiting.ts"
```

### Component Implementation (can run together):
```bash
# Launch T016-T018 together (different component files):
Task: "StoreCodeInput component in components/store-code-form/store-code-input.tsx"
Task: "ErrorMessage component in components/store-code-form/error-message.tsx"
Task: "LoadingSpinner component in components/ui/loading-spinner.tsx"
```

### E2E Tests (can run together):
```bash
# Launch T026-T028 together (different E2E test files):
Task: "E2E test happy path (code entry to redirect) in tests/e2e/happy-path.spec.ts"
Task: "E2E test mobile experience and responsive design in tests/e2e/mobile-experience.spec.ts"
Task: "E2E test offline behavior and PWA functionality in tests/e2e/offline-behavior.spec.ts"
```

### Polish Phase (can run together):
```bash
# Launch T029-T033 together (different files):
Task: "PWA manifest and service worker in public/manifest.json and public/sw.js"
Task: "Bundle size optimization and code splitting in next.config.js"
Task: "Performance monitoring setup in lib/analytics/performance.ts"
Task: "Error tracking and logging in lib/analytics/error-tracking.ts"
Task: "Accessibility improvements (ARIA labels, focus management)"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify tests fail before implementing (TDD requirement)
- Each task should result in a commit
- Follow existing code conventions from the codebase
- Use existing Supabase project: ervnxnbxsaaeakbvwieh
- Maintain mobile-first responsive design throughout

## Task Generation Rules Applied
✅ **From Contracts**:
- validate-store-code.yaml → T005 contract test + T021 implementation

✅ **From Data Model**:
- Store entity → T024 database queries (existing table)
- StoreCodeValidation entity → T001 migration + T025 logging

✅ **From Quickstart Scenarios**:
- 10 test scenarios → T005-T011 (tests) + T026-T028 (E2E)
- Performance requirements → T030-T031 (optimization)

✅ **Ordering Applied**:
- Setup (T001-T004) → Tests (T005-T011) → Implementation (T012-T025) → E2E (T026-T028) → Polish (T029-T034)

## Validation Checklist
✅ **All contracts have corresponding tests**: validate-store-code.yaml → T005
✅ **All entities have model tasks**: StoreCodeValidation → T001, Store queries → T024
✅ **All tests come before implementation**: T005-T011 before T012-T025
✅ **Parallel tasks truly independent**: Each [P] task operates on different files
✅ **Each task specifies exact file path**: All tasks include specific file paths
✅ **No task modifies same file as another [P] task**: Verified no file conflicts

## Expected Outcomes
- **Landing Page**: Mobile-optimized page at vocilia.com for 6-digit code entry
- **API Endpoint**: /api/validate-store-code with rate limiting and validation
- **Database**: New validation tracking table with RLS policies
- **Performance**: < 2s load time, < 1s form submission
- **Security**: Input sanitization, SQL injection prevention, rate limiting
- **Testing**: 100% test coverage with unit, integration, and E2E tests
- **PWA**: Offline capability with service worker and manifest

**Total Tasks**: 34 tasks
**Parallel Opportunities**: 20 tasks can run in parallel across 5 phases
**Estimated Completion**: 3-5 days with parallel execution