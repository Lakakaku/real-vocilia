# Tasks: QR Code Generation & Download

**Input**: Design documents from `/specs/001-6-2-qr/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: TypeScript, Next.js 14.2.5, Supabase, React
   ✓ Libraries: qrcode, jspdf, file-saver
   ✓ Structure: Web application (existing Next.js structure)
2. Load optional design documents:
   ✓ data-model.md: 5 entities (stores enhanced, 4 new tables)
   ✓ contracts/qr-api.yaml: 6 endpoints
   ✓ research.md: QR specs, sizes, print requirements
3. Generate tasks by category:
   ✓ Setup: dependencies, migration
   ✓ Tests: API contracts, integration scenarios
   ✓ Core: models, services, components
   ✓ Integration: Supabase, storage
   ✓ Polish: performance, documentation
4. Apply task rules:
   ✓ Different files marked [P]
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T032)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✓ All contracts have tests
   ✓ All entities have models
   ✓ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: Using existing Next.js structure
- `app/` for pages, `components/` for React components
- `lib/` for utilities, `app/api/` for API routes

## Phase 3.1: Setup
- [ ] T001 Install QR generation dependencies: npm install qrcode jspdf file-saver @types/qrcode
- [ ] T002 Create database migration file lib/supabase/migrations/003_qr_code_support.sql
- [ ] T003 [P] Create QR library structure: lib/qr/{generator.ts,templates.ts,pdf-generator.ts,constants.ts}
- [ ] T004 [P] Create component directories: components/stores/qr-generator/ and components/stores/qr-templates/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test POST /api/stores/qr/generate in tests/api/qr/test_generate.ts
- [ ] T006 [P] Contract test GET /api/stores/qr/download in tests/api/qr/test_download.ts
- [ ] T007 [P] Contract test POST /api/stores/qr/bulk-download in tests/api/qr/test_bulk_download.ts
- [ ] T008 [P] Contract test GET /api/stores/qr/history in tests/api/qr/test_history.ts
- [ ] T009 [P] Contract test GET /api/stores/qr/bulk-status in tests/api/qr/test_bulk_status.ts
- [ ] T010 [P] Contract test GET /api/stores/qr/templates in tests/api/qr/test_templates.ts
- [ ] T011 [P] Integration test: Generate QR for single store in tests/integration/test_single_store_qr.ts
- [ ] T012 [P] Integration test: Download different size variants in tests/integration/test_size_variants.ts
- [ ] T013 [P] Integration test: Bulk download multiple stores in tests/integration/test_bulk_download.ts
- [ ] T014 [P] Integration test: Verify bilingual instructions in tests/integration/test_bilingual.ts
- [ ] T015 [P] Integration test: Check QR scannability in tests/integration/test_qr_scanning.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
### Database & Models
- [ ] T016 Apply database migration to Supabase (run migration 003_qr_code_support.sql)
- [ ] T017 [P] Create QR types in lib/types/qr.ts (QRTemplate, QRCache, QRDownloadHistory, QRTranslation)
- [ ] T018 [P] Create Supabase client functions in lib/supabase/qr-client.ts

### QR Generation Core
- [ ] T019 [P] Implement QR generator service in lib/qr/generator.ts with logo integration
- [ ] T020 [P] Implement template configurations in lib/qr/templates.ts (counter/wall/window)
- [ ] T021 [P] Implement PDF generator in lib/qr/pdf-generator.ts with print specs
- [ ] T022 [P] Define constants in lib/qr/constants.ts (sizes, colors, translations)

### API Endpoints
- [ ] T023 Implement POST /api/stores/qr/generate/route.ts endpoint
- [ ] T024 Implement GET /api/stores/qr/download/route.ts endpoint
- [ ] T025 Implement POST /api/stores/qr/bulk-download/route.ts endpoint
- [ ] T026 Implement GET /api/stores/qr/history/route.ts endpoint
- [ ] T027 Implement GET /api/stores/qr/bulk-status/[jobId]/route.ts endpoint
- [ ] T028 Implement GET /api/stores/qr/templates/route.ts endpoint

### React Components
- [ ] T029 [P] Create QRCodeDisplay component in components/stores/qr-generator/QRCodeDisplay.tsx
- [ ] T030 [P] Create QRCodeSizeSelector in components/stores/qr-generator/QRCodeSizeSelector.tsx
- [ ] T031 [P] Create QRCodeDownloader in components/stores/qr-generator/QRCodeDownloader.tsx
- [ ] T032 [P] Create QRCodeBulkDownload in components/stores/qr-generator/QRCodeBulkDownload.tsx
- [ ] T033 [P] Create CounterTemplate in components/stores/qr-templates/CounterTemplate.tsx
- [ ] T034 [P] Create WallTemplate in components/stores/qr-templates/WallTemplate.tsx
- [ ] T035 [P] Create WindowTemplate in components/stores/qr-templates/WindowTemplate.tsx

### Pages
- [ ] T036 Create QR download center page in app/business/stores/qr-codes/page.tsx
- [ ] T037 Create individual store QR page in app/business/stores/[storeId]/qr/page.tsx

## Phase 3.4: Integration
- [ ] T038 Integrate QR cache with Supabase Storage
- [ ] T039 Implement download history tracking with audit logging
- [ ] T040 Add rate limiting middleware (100 requests/hour)
- [ ] T041 Configure CORS for QR endpoints
- [ ] T042 Add authentication checks for business users

## Phase 3.5: Polish
- [ ] T043 [P] Add loading states and error handling to all components
- [ ] T044 [P] Optimize QR generation performance (<500ms target)
- [ ] T045 [P] Add unit tests for QR generator in tests/unit/test_qr_generator.ts
- [ ] T046 [P] Add unit tests for PDF generator in tests/unit/test_pdf_generator.ts
- [ ] T047 [P] Test print quality at 300 DPI
- [ ] T048 [P] Verify accessibility (WCAG AA compliance)
- [ ] T049 [P] Update CLAUDE.md with QR generation details
- [ ] T050 Run quickstart.md validation scenarios

## Dependencies
- T001-T002 must complete before any implementation
- T005-T015 (tests) must complete and fail before T016-T037 (implementation)
- T016 (migration) blocks T017-T018 (database operations)
- T019-T022 (core libs) before T023-T028 (API endpoints)
- T029-T035 (components) can run parallel with API work
- T036-T037 depend on components being ready
- T038-T042 (integration) after core implementation
- T043-T050 (polish) after everything else

## Parallel Example
```bash
# Phase 3.2: Launch all test tasks together (T005-T015):
Task: "Contract test POST /api/stores/qr/generate in tests/api/qr/test_generate.ts"
Task: "Contract test GET /api/stores/qr/download in tests/api/qr/test_download.ts"
Task: "Contract test POST /api/stores/qr/bulk-download in tests/api/qr/test_bulk_download.ts"
Task: "Contract test GET /api/stores/qr/history in tests/api/qr/test_history.ts"
Task: "Contract test GET /api/stores/qr/bulk-status in tests/api/qr/test_bulk_status.ts"
Task: "Contract test GET /api/stores/qr/templates in tests/api/qr/test_templates.ts"
Task: "Integration test single store QR generation"
Task: "Integration test size variants"
Task: "Integration test bulk download"
Task: "Integration test bilingual support"
Task: "Integration test QR scannability"

# Phase 3.3: Launch parallel component tasks (T029-T035):
Task: "Create QRCodeDisplay component"
Task: "Create QRCodeSizeSelector component"
Task: "Create QRCodeDownloader component"
Task: "Create QRCodeBulkDownload component"
Task: "Create CounterTemplate component"
Task: "Create WallTemplate component"
Task: "Create WindowTemplate component"

# Phase 3.3: Launch parallel core library tasks (T019-T022):
Task: "Implement QR generator service with logo"
Task: "Implement template configurations"
Task: "Implement PDF generator"
Task: "Define constants and translations"
```

## Notes
- All test files must be created and must fail before implementation begins
- Commit after each task completion
- Use existing Supabase client from lib/supabase/client.ts
- Follow existing Next.js patterns in the codebase
- Ensure all QR codes include the Vocilia logo as specified
- Test with actual store data from production database
- Verify QR codes scan correctly on mobile devices

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All 6 API contracts have corresponding test tasks
- [x] All 5 entities have model/type tasks
- [x] All tests (T005-T015) come before implementation (T016+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Database migration is applied before database operations
- [x] Components can be developed in parallel with API

---
*Total Tasks: 50 | Setup: 4 | Tests: 11 | Core: 22 | Integration: 5 | Polish: 8*
*Estimated Duration: 3-4 days with parallel execution*