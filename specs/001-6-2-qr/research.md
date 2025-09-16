# Research Document: QR Code Generation & Download

**Feature**: QR Code Generation for Store Feedback Entry
**Date**: 2025-09-16
**Branch**: 001-6-2-qr

## Research Findings

### 1. QR Code Size Specifications

**Decision**: Three standard sizes optimized for different display contexts

**Counter Display (Small)**
- Physical size: 10cm x 10cm (3.9" x 3.9")
- QR module size: 280x280 pixels
- Use case: Point-of-sale counters, cash registers
- Rationale: Compact size for limited counter space while maintaining scannability from 30-50cm distance

**Wall Poster (Medium)**
- Physical size: 21cm x 21cm (A4 half-page, 8.3" x 8.3")
- QR module size: 600x600 pixels
- Use case: Wall-mounted displays, bulletin boards
- Rationale: Visible from 1-2 meters, fits standard A4 printing

**Window Display (Large)**
- Physical size: 30cm x 30cm (11.8" x 11.8")
- QR module size: 900x900 pixels
- Use case: Storefront windows, entrance doors
- Rationale: Scannable from 2-3 meters through glass

**Alternatives Considered**:
- Single universal size: Rejected due to varying use cases
- Custom sizing: Too complex for MVP, can be added later

### 2. Print Specifications

**Decision**: 300 DPI for all print formats

**Print Requirements**:
- Resolution: 300 DPI minimum for professional printing
- Color mode: CMYK for print, RGB for digital
- Bleed: 3mm on all sides for professional printing
- File formats: PDF (print-ready), PNG (digital), SVG (scalable)
- Error correction: Level H (30% damage tolerance)

**Rationale**: Industry standard for commercial printing, ensures crisp edges and reliable scanning even with wear

**Alternatives Considered**:
- 150 DPI: Too low for professional appearance
- 600 DPI: Unnecessary file size increase without visible benefit

### 3. Logo Integration

**Decision**: Centered logo with transparent background

**Implementation**:
- Logo placement: Center of QR code
- Logo size: Maximum 25% of QR code area
- Background: White circle with 2px padding
- Error correction: Level H to compensate for logo obstruction

**Vocilia Logo Specification**:
- SVG format provided in spec
- Gradient colors: #0077BE to #4A90E2 to #7B68EE
- White background circle for contrast

**Rationale**: Maintains brand identity while ensuring QR functionality

**Alternatives Considered**:
- Corner placement: Less professional appearance
- No logo: Missed branding opportunity

### 4. Bilingual Instructions

**Decision**: Swedish primary, English secondary

**Swedish Content**:
```
"Skanna för att ge feedback"
"Få upp till 15% cashback"
"1. Skanna QR-koden med din mobil"
"2. Berätta om din upplevelse"
"3. Få cashback direkt via Swish"
```

**English Content**:
```
"Scan to give feedback"
"Get up to 15% cashback"
"1. Scan the QR code with your phone"
"2. Share your experience"
"3. Get cashback instantly via Swish"
```

**Layout**: Side-by-side columns with flag icons

**Rationale**: Clear, action-oriented instructions that explain the value proposition

### 5. Store Code Display

**Decision**: Visible 6-digit code below QR

**Implementation**:
- Font: System mono-spaced (Courier New fallback)
- Size: 14pt for counter, 18pt for wall, 24pt for window
- Format: "Kod/Code: ABC123"
- Position: Centered below QR with 10px padding

**Rationale**: Fallback option if QR scanning fails, aids in troubleshooting

### 6. Update Policy

**Decision**: Versioned QR codes with redirect service

**Strategy**:
- QR codes point to: vocilia.com/qr/{store_code}
- Server redirects to: vocilia.com/feedback/{store_code}
- Allows URL structure changes without reprinting
- Store codes remain permanent once assigned
- Deleted stores show "This store is no longer active" message

**Rationale**: Future-proofs against URL changes, maintains functionality of printed materials

**Alternatives Considered**:
- Direct URLs: Would require reprinting on any URL change
- Dynamic QR codes: Too complex for MVP

### 7. Technology Selection

**Decision**: Client-side generation with server backup

**Libraries**:
- qrcode.js: Lightweight, well-maintained QR generation
- jsPDF: PDF generation with good browser support
- Canvas API: Native browser image manipulation
- file-saver: Cross-browser download support

**Architecture**:
- Generate QR codes client-side for instant feedback
- Cache generated codes in Supabase Storage
- Serve cached versions for repeat downloads
- Track downloads in database for analytics

**Rationale**: Reduces server load, provides instant user feedback, enables offline functionality after initial generation

### 8. Performance Considerations

**Decision**: Progressive enhancement with caching

**Implementation**:
- Initial generation: < 500ms client-side
- Subsequent access: < 100ms from cache
- Bulk download: Async generation with progress indicator
- Maximum 10 concurrent generations for bulk operations

**Caching Strategy**:
- Store generated files in Supabase Storage
- Cache key: {store_id}_{size}_{format}_{version}
- Invalidate on store details change
- 30-day retention for unused files

**Rationale**: Balances performance with storage costs

### 9. Accessibility

**Decision**: WCAG AA compliance

**Features**:
- Alt text for all QR codes
- Keyboard navigation for download buttons
- Screen reader announcements for generation progress
- High contrast mode support
- Text alternatives for all visual instructions

**Rationale**: Ensures business owners with disabilities can use the system

### 10. Security Considerations

**Decision**: Authenticated downloads only

**Implementation**:
- Require business authentication for QR generation
- Signed URLs for Supabase Storage (1-hour expiry)
- Rate limiting: 100 QR generations per hour per business
- Audit log for all downloads

**Rationale**: Prevents abuse while maintaining usability

## Summary of Decisions

1. **Sizes**: Three variants (counter 10cm, wall 21cm, window 30cm)
2. **Print**: 300 DPI, PDF/PNG/SVG formats
3. **Logo**: Centered with white background, 25% max size
4. **Languages**: Swedish/English side-by-side
5. **Store Code**: Visible below QR as fallback
6. **Updates**: Redirect service for future-proofing
7. **Tech Stack**: Client-side generation with qrcode.js, jsPDF
8. **Performance**: < 500ms generation, caching strategy
9. **Accessibility**: WCAG AA compliant
10. **Security**: Authenticated access, rate limiting

## Implementation Priority

1. **Phase 1 (Core)**: Basic QR generation with store codes
2. **Phase 2 (Enhancement)**: Size variants and templates
3. **Phase 3 (Polish)**: Logo integration, bilingual instructions
4. **Phase 4 (Optimization)**: Caching, bulk download
5. **Phase 5 (Analytics)**: Download tracking, usage reports

---
*Research completed. All NEEDS CLARIFICATION items from spec resolved.*