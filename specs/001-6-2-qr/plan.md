# Implementation Plan: QR Code Generation & Download

**Branch**: `001-6-2-qr` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-6-2-qr/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Utilizing existing Supabase, Next.js, TypeScript stack
   → Structure Decision: Web application (Option 2)
3. Fill the Constitution Check section based on the content of the constitution document
   ✓ No specific constitutional constraints (template constitution)
4. Evaluate Constitution Check section below
   ✓ No violations detected
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   ✓ Research completed on QR generation, sizes, print specs
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✓ Design artifacts generated
7. Re-evaluate Constitution Check section
   ✓ No new violations
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   ✓ Task approach defined
9. STOP - Ready for /tasks command
```

## Summary
Generate unique QR codes for each store location that link to the Vocilia feedback system (vocilia.com/feedback/{store_code}), with multiple size variants for different display locations, bilingual instructions, and professional print-ready formats. The solution will utilize existing Supabase infrastructure for data storage and Next.js for the UI.

## Technical Context
**Language/Version**: TypeScript 5.5.3 / Node.js 20+
**Primary Dependencies**: Next.js 14.2.5, Supabase 2.39.3, React 18.3.1
**Storage**: Supabase PostgreSQL (existing stores table) + Supabase Storage for generated files
**Testing**: Jest/Vitest with React Testing Library
**Target Platform**: Web application (business.vocilia.com)
**Project Type**: web - frontend + backend integrated
**Performance Goals**: <2s QR generation, <500ms download initiation
**Constraints**: Must work offline after initial generation, print quality at 300 DPI
**Scale/Scope**: Support 100+ stores per business, bulk download capabilities

**Additional Libraries Needed**:
- qrcode (npm package) - for QR code generation
- jsPDF - for PDF generation
- Sharp or Canvas - for image manipulation and size variants
- file-saver - for client-side downloads

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since no specific constitution was defined (template only), using general best practices:
- ✓ Single responsibility: QR generation is isolated feature
- ✓ Uses existing infrastructure (Supabase)
- ✓ Follows existing patterns (Next.js app structure)
- ✓ No unnecessary complexity

## Project Structure

### Documentation (this feature)
```
specs/001-6-2-qr/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (existing structure)
app/
├── business/
│   └── stores/
│       ├── qr-codes/       # New QR code generation pages
│       │   └── page.tsx    # QR download center
│       └── [storeId]/
│           └── qr/         # Individual store QR management
│               └── page.tsx

components/
├── stores/
│   ├── qr-generator/       # QR generation components
│   │   ├── QRCodeDisplay.tsx
│   │   ├── QRCodeSizeSelector.tsx
│   │   ├── QRCodeDownloader.tsx
│   │   └── QRCodeBulkDownload.tsx
│   └── qr-templates/       # QR code templates with instructions
│       ├── CounterTemplate.tsx
│       ├── WallTemplate.tsx
│       └── WindowTemplate.tsx

lib/
├── qr/                      # QR generation utilities
│   ├── generator.ts        # Core QR generation logic
│   ├── templates.ts        # Template configurations
│   ├── pdf-generator.ts   # PDF export functionality
│   └── constants.ts       # Sizes, colors, text content

api/
└── stores/
    └── qr/                 # API endpoints for QR operations
        ├── generate/
        │   └── route.ts    # Generate QR for specific store
        └── bulk-download/
            └── route.ts    # Bulk download all QR codes
```

**Structure Decision**: Option 2 (Web application) - utilizing existing Next.js structure

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - QR code size specifications for counter/wall/window
   - Print specifications and DPI requirements
   - Bilingual instruction content
   - Vocilia logo integration in QR codes
   - Update policy for changed store codes

2. **Generate and dispatch research agents**:
   ```
   Task: Research standard QR code sizes for retail displays
   Task: Research print-ready specifications for QR codes
   Task: Research QR code generation best practices with logos
   Task: Research internationalization approaches for Swedish/English
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: QR sizes, print specs, logo placement
   - Rationale: Industry standards and usability
   - Alternatives considered: Different size options

**Output**: research.md with all clarifications resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - QR Code Configuration entity
   - Generated QR Asset entity
   - Download History entity
   - Store entity (existing, enhanced)

2. **Generate API contracts** from functional requirements:
   - POST /api/stores/qr/generate - Generate QR for store
   - GET /api/stores/qr/download - Download specific QR variant
   - POST /api/stores/qr/bulk-download - Download all QR codes
   - GET /api/stores/qr/history - Get download history

3. **Generate contract tests** from contracts:
   - Test QR generation with valid store code
   - Test multiple format generation (PDF, PNG, SVG)
   - Test bulk download for multi-store businesses
   - Test download tracking

4. **Extract test scenarios** from user stories:
   - Generate QR for single store
   - Download different size variants
   - Bulk download for multiple stores
   - Verify QR code scannability
   - Check bilingual instructions

5. **Update CLAUDE.md incrementally**:
   - Add QR generation tech stack
   - Update recent changes
   - Keep concise

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Install and configure QR generation libraries [P]
- Create database migration for QR tracking [P]
- Build QR generator service with logo integration
- Create size variant templates (counter/wall/window)
- Implement bilingual instruction components [P]
- Build QR download center UI
- Add bulk download functionality
- Implement download history tracking
- Create print-ready PDF generation
- Add QR code caching for performance [P]

**Ordering Strategy**:
- Database setup first
- Core generation logic before UI
- Templates before download functionality
- Testing throughout (TDD approach)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations detected - using existing patterns and infrastructure*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on existing Vocilia project structure - See CLAUDE.md for project context*