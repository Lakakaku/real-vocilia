# Tasks: Payment Verification Dashboard System

**Input**: Design documents from `/specs/003-7-1-verification/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Next.js 14.2.5, Supabase, TypeScript 5.5+, React Hook Form, OpenAI
   → Structure: Web application with app/ directory, lib/ utilities
2. Load design documents ✅:
   → data-model.md: 5 entities (PaymentBatch, VerificationSession, VerificationResult, FraudAssessment, VerificationAuditLog)
   → contracts/: verification-api.json (7 endpoints), admin-api.json (8 endpoints)
   → research.md: CSV formats, fraud detection, countdown timers, Supabase Storage, AI integration
3. Generate tasks by category ✅:
   → Setup: migrations, types, dependencies
   → Tests: 15 contract tests, 5 integration tests
   → Core: 5 models, verification services, AI integration
   → Integration: 15 API endpoints, UI components, audit system
   → Polish: error handling, performance, documentation
4. Apply task rules ✅:
   → 25 tasks marked [P] for parallel execution (different files)
   → 18 sequential tasks (shared files/dependencies)
   → TDD: All tests before implementation
5. Number tasks sequentially T001-T043 ✅
6. Dependencies mapped ✅
7. Parallel execution examples provided ✅
8. Validation: All contracts tested, entities modeled, endpoints implemented ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web application structure** (from plan.md):
- **Frontend**: `app/`, `components/`
- **Backend**: `app/api/`, `lib/`
- **Database**: `lib/supabase/migrations/`, `lib/supabase/types/`
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/unit/`

---

## Phase 3.1: Setup & Database Foundation

- [x] **T001** Create verification database migration files structure in `lib/supabase/migrations/` ✅ COMPLETED
- [x] **T002** [P] Database migration: CREATE payment_batches table in `lib/supabase/migrations/007_create_payment_batches.sql` ✅ COMPLETED
- [x] **T003** [P] Database migration: CREATE verification_sessions table in `lib/supabase/migrations/008_create_verification_sessions.sql` ✅ COMPLETED
- [x] **T004** [P] Database migration: CREATE verification_results table in `lib/supabase/migrations/009_create_verification_results.sql` ✅ COMPLETED
- [x] **T005** [P] Database migration: CREATE fraud_assessments table in `lib/supabase/migrations/010_create_fraud_assessments.sql` ✅ COMPLETED
- [x] **T006** [P] Database migration: CREATE verification_audit_logs table in `lib/supabase/migrations/011_create_verification_audit_logs.sql` ✅ COMPLETED
- [x] **T007** [P] Database migration: Add indexes and RLS policies in `lib/supabase/migrations/012_verification_indexes_rls.sql` ✅ COMPLETED
- [x] **T008** Generate TypeScript types from Supabase schema in `lib/supabase/types/verification.ts` ✅ COMPLETED

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Business Verification API)
- [x] **T009** [P] Contract test GET /api/verification/current in `tests/contract/verification-current.test.ts` ✅ COMPLETED
- [x] **T010** [P] Contract test POST /api/verification/download in `tests/contract/verification-download.test.ts` ✅ COMPLETED
- [x] **T011** [P] Contract test GET /api/verification/transactions in `tests/contract/verification-transactions.test.ts` ✅ COMPLETED
- [x] **T012** [P] Contract test PUT /api/verification/transactions/{id} in `tests/contract/verification-transaction-update.test.ts` ✅ COMPLETED
- [x] **T013** [P] Contract test POST /api/verification/upload in `tests/contract/verification-upload.test.ts` ✅ COMPLETED
- [x] **T014** [P] Contract test GET /api/verification/status in `tests/contract/verification-status.test.ts` ✅ COMPLETED
- [ ] **T015** [P] Contract test GET /api/verification/history in `tests/contract/verification-history.test.ts`

### Contract Tests (Admin API)
- [x] **T016** [P] Contract test GET /api/admin/batches in `tests/contract/admin-batches-list.test.ts` ✅ COMPLETED
- [ ] **T017** [P] Contract test POST /api/admin/batches in `tests/contract/admin-batches-create.test.ts`
- [x] **T018** [P] Contract test GET /api/admin/batches/{id} in `tests/contract/admin-batch-detail.test.ts` ✅ COMPLETED
- [x] **T019** [P] Contract test GET /api/admin/businesses/{id} in `tests/contract/admin-business-detail.test.ts` ✅ COMPLETED
- [x] **T020** [P] Contract test GET /api/admin/businesses in `tests/contract/admin-businesses-list.test.ts` ✅ COMPLETED
- [x] **T021** [P] Contract test POST /api/admin/batches/{id}/actions in `tests/contract/admin-batch-actions.test.ts` ✅ COMPLETED
- [x] **T022** [P] Contract test GET /api/admin/statistics in `tests/contract/admin-statistics.test.ts` ✅ COMPLETED
- [ ] **T023** [P] Contract test POST /api/admin/verification-results/{id}/process in `tests/contract/admin-results-process.test.ts`

### Integration Tests (End-to-End Workflows)
- [x] **T024** [P] Integration test: Complete verification workflow in `tests/integration/verification-e2e.test.ts` ✅ COMPLETED
- [x] **T025** [P] Integration test: Deadline expiration auto-approval in `tests/integration/auto-approval.test.ts`
- [x] **T026** [P] Integration test: CSV upload validation and error recovery in `tests/integration/csv-validation.test.ts`
- [x] **T027** [P] Integration test: Fraud detection workflow in `tests/integration/fraud-detection.test.ts`
- [x] **T028** [P] Integration test: Admin batch management workflow in `tests/integration/admin-batch-flow.test.ts`

### Additional Contract Tests (Components & Services)
- [x] **T029A** [P] Contract test: Fraud assessment API in `tests/contract/fraud-assessment.test.ts` ✅ COMPLETED
- [x] **T029B** [P] Contract test: CSV processing utilities in `tests/contract/csv-processing.test.ts` ✅ COMPLETED
- [x] **T029C** [P] Contract test: Real-time updates system in `tests/contract/realtime-updates.test.ts` ✅ COMPLETED

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models and Types
- [x] **T029** [P] PaymentBatch model and validation schema in `lib/verification/models/payment-batch.ts`
- [x] **T030** [P] VerificationSession model and state management in `lib/verification/models/verification-session.ts`
- [x] **T031** [P] VerificationResult model and decision types in `lib/verification/models/verification-result.ts`
- [x] **T032** [P] FraudAssessment model and scoring types in `lib/verification/models/fraud-assessment.ts`
- [x] **T033** [P] VerificationAuditLog model and event tracking in `lib/verification/models/audit-log.ts`

### Core Services
- [x] **T034** [P] CSV processing service for batch generation/parsing in `lib/verification/services/csv-service.ts` ✅ COMPLETED
- [x] **T035** [P] Supabase Storage service for file upload/download in `lib/verification/services/storage-service.ts` ✅ COMPLETED
- [x] **T036** [P] AI fraud detection service with OpenAI integration in `lib/ai/fraud-detection-service.ts` ✅ COMPLETED
- [x] **T037** [P] Deadline management service for countdown/auto-approval in `lib/verification/services/deadline-service.ts` ✅ COMPLETED
- [x] **T038** Verification workflow service coordinating session state in `lib/verification/services/workflow-service.ts` ✅ COMPLETED
- [x] **T039** Audit logging service for compliance tracking in `lib/verification/services/audit-service.ts` ✅ COMPLETED

## Phase 3.4: API Implementation

### Business Verification Endpoints
- [x] **T040** GET /api/verification/current endpoint in `app/api/verification/current/route.ts` ✅ COMPLETED
- [x] **T041** POST /api/verification/download endpoint in `app/api/verification/download/route.ts` ✅ COMPLETED
- [x] **T042** GET /api/verification/transactions endpoint in `app/api/verification/transactions/route.ts` ✅ COMPLETED
- [x] **T043** PUT /api/verification/transactions/[id] endpoint in `app/api/verification/transactions/[id]/route.ts` ✅ COMPLETED
- [ ] **T044** POST /api/verification/upload endpoint in `app/api/verification/upload/route.ts`
- [ ] **T045** GET /api/verification/status endpoint in `app/api/verification/status/route.ts`
- [ ] **T046** GET /api/verification/history endpoint in `app/api/verification/history/route.ts`

### Admin Management Endpoints
- [ ] **T047** GET /api/admin/batches endpoint in `app/api/admin/batches/route.ts`
- [ ] **T048** POST /api/admin/batches endpoint in `app/api/admin/batches/route.ts`
- [ ] **T049** GET /api/admin/batches/[id] endpoint in `app/api/admin/batches/[id]/route.ts`
- [ ] **T050** PUT /api/admin/batches/[id] endpoint in `app/api/admin/batches/[id]/route.ts`
- [ ] **T051** POST /api/admin/batches/[id]/release endpoint in `app/api/admin/batches/[id]/release/route.ts`
- [ ] **T052** GET /api/admin/verification-results endpoint in `app/api/admin/verification-results/route.ts`
- [ ] **T053** GET /api/admin/verification-results/[id]/download endpoint in `app/api/admin/verification-results/[id]/download/route.ts`
- [ ] **T054** POST /api/admin/verification-results/[id]/process endpoint in `app/api/admin/verification-results/[id]/process/route.ts`

## Phase 3.5: Frontend Components

### Verification Dashboard Components
- [ ] **T055** [P] VerificationDashboard main page component in `app/(business)/dashboard/verification/page.tsx`
- [ ] **T056** [P] CountdownTimer component with real-time updates in `components/verification/countdown-timer.tsx`
- [ ] **T057** [P] BatchDownload component for CSV download in `components/verification/batch-download.tsx`
- [ ] **T058** [P] TransactionList component for verification interface in `components/verification/transaction-list.tsx`
- [ ] **T059** [P] TransactionCard component with fraud indicators in `components/verification/transaction-card.tsx`
- [ ] **T060** [P] VerificationUpload component for CSV upload in `components/verification/verification-upload.tsx`
- [ ] **T061** [P] ProgressTracker component for session status in `components/verification/progress-tracker.tsx`
- [ ] **T062** [P] FraudInsights component for AI recommendations in `components/verification/fraud-insights.tsx`

### Admin Dashboard Components
- [ ] **T063** [P] AdminVerificationDashboard in `app/admin/verification/page.tsx`
- [ ] **T064** [P] BatchCreationForm component in `components/admin/batch-creation-form.tsx`
- [ ] **T065** [P] BatchManagementTable component in `components/admin/batch-management-table.tsx`
- [ ] **T066** [P] VerificationResultsViewer component in `components/admin/verification-results-viewer.tsx`

## Phase 3.6: Integration & Polish

### Error Handling & Validation
- [ ] **T067** CSV format validation with detailed error messages in `lib/verification/validation/csv-validator.ts`
- [ ] **T068** API error handling middleware with audit logging in `lib/middleware/verification-error-handler.ts`
- [ ] **T069** File upload size and security validation in `lib/verification/validation/file-validator.ts`

### Performance & Monitoring
- [ ] **T070** [P] Database query optimization and connection pooling in `lib/supabase/performance-config.ts`
- [ ] **T071** [P] Real-time status updates with Server-Sent Events in `lib/verification/services/realtime-service.ts`
- [ ] **T072** [P] Rate limiting for API endpoints in `lib/middleware/rate-limiter.ts`

### Unit Tests
- [ ] **T073** [P] Unit tests for fraud detection algorithms in `tests/unit/fraud-detection.test.ts`
- [ ] **T074** [P] Unit tests for CSV processing validation in `tests/unit/csv-service.test.ts`
- [ ] **T075** [P] Unit tests for deadline calculation logic in `tests/unit/deadline-service.test.ts`
- [ ] **T076** [P] Unit tests for verification state transitions in `tests/unit/verification-service.test.ts`

### Documentation & Cleanup
- [ ] **T077** [P] Update API documentation with verification endpoints in `docs/api-verification.md`
- [ ] **T078** [P] Add verification system architecture documentation in `docs/verification-architecture.md`
- [ ] **T079** Execute quickstart validation workflow from `specs/003-7-1-verification/quickstart.md`
- [ ] **T080** Performance validation: <2s page load, <5s CSV processing, real-time updates
- [ ] **T081** Security audit: RLS policies, file access controls, audit logging verification

---

## Dependencies

**Critical Dependencies**:
- Database setup (T001-T008) blocks all other work
- All tests (T009-T028) must complete and FAIL before implementation (T029+)
- Models (T029-T033) block services (T034-T039)
- Services (T034-T039) block API endpoints (T040-T054)
- API endpoints (T040-T054) block frontend components (T055-T066)

**Parallel Execution Blocks**:
- T002-T007: Database migrations (all different files)
- T009-T028: All contract and integration tests (different files)
- T029-T033: Data models (different files)
- T034-T037: Independent services (different files)
- T055-T062: Frontend components (different files)
- T073-T076: Unit tests (different files)

## Parallel Example

### Contract Tests Phase (Execute Together)
```bash
# Launch all contract tests in parallel:
Task: "Contract test GET /api/verification/current in tests/contract/verification-current.test.ts"
Task: "Contract test POST /api/verification/download in tests/contract/verification-download.test.ts"
Task: "Contract test GET /api/verification/transactions in tests/contract/verification-transactions.test.ts"
Task: "Contract test PUT /api/verification/transactions/{id} in tests/contract/verification-transaction-update.test.ts"
Task: "Contract test POST /api/verification/upload in tests/contract/verification-upload.test.ts"
Task: "Contract test GET /api/verification/status in tests/contract/verification-status.test.ts"
Task: "Contract test GET /api/verification/history in tests/contract/verification-history.test.ts"
```

### Data Models Phase (Execute Together)
```bash
# Launch all model creation in parallel:
Task: "PaymentBatch model and validation schema in lib/verification/models/payment-batch.ts"
Task: "VerificationSession model and state management in lib/verification/models/verification-session.ts"
Task: "VerificationResult model and decision types in lib/verification/models/verification-result.ts"
Task: "FraudAssessment model and scoring types in lib/verification/models/fraud-assessment.ts"
Task: "VerificationAuditLog model and event tracking in lib/verification/models/audit-log.ts"
```

### Frontend Components Phase (Execute Together)
```bash
# Launch independent UI components in parallel:
Task: "CountdownTimer component with real-time updates in components/verification/countdown-timer.tsx"
Task: "BatchDownload component for CSV download in components/verification/batch-download.tsx"
Task: "TransactionList component for verification interface in components/verification/transaction-list.tsx"
Task: "VerificationUpload component for CSV upload in components/verification/verification-upload.tsx"
Task: "ProgressTracker component for session status in components/verification/progress-tracker.tsx"
```

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **TDD Critical**: All tests (T009-T028) must be written and FAIL before any implementation
- **Database First**: Complete all migrations (T001-T008) before starting tests
- **Security**: Verify RLS policies working with first API endpoint implementation
- **Performance**: Test real-time updates and CSV processing early for optimization
- **Audit**: Every verification action must generate audit log entries

## Task Generation Rules Applied

1. **From Contracts**: 15 contract tests (7 verification + 8 admin endpoints)
2. **From Data Model**: 5 entity models + supporting services
3. **From User Stories**: 5 integration tests covering complete workflows
4. **TDD Ordering**: All tests before any implementation code
5. **Parallel Optimization**: 25 tasks marked [P] for concurrent execution
6. **File Independence**: Each [P] task targets different files to avoid conflicts

## Validation Checklist ✅

- ✅ All contracts have corresponding tests (T009-T023)
- ✅ All entities have model tasks (T029-T033)
- ✅ All tests come before implementation (T009-T028 before T029+)
- ✅ Parallel tasks target different files ([P] verified)
- ✅ Each task specifies exact file path
- ✅ No [P] task modifies same file as another [P] task
- ✅ Dependencies clearly mapped for execution order

**Total Tasks**: 81 tasks covering complete payment verification system
**Parallel Tasks**: 25 tasks marked [P] for optimal execution speed
**Critical Path**: Database setup → Tests → Models → Services → APIs → UI → Polish