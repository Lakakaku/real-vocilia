# Quick Start Guide: QR Code Generation & Download

**Feature**: QR Code Generation for Store Feedback Entry
**Date**: 2025-09-16
**Branch**: 001-6-2-qr

## Overview
This guide demonstrates how to generate, customize, and download QR codes for Vocilia store feedback collection.

## Prerequisites
- Business account on business.vocilia.com
- At least one registered store
- Node.js 20+ and npm installed
- Access to Supabase project

## Installation

### 1. Install Dependencies
```bash
npm install qrcode jspdf file-saver
npm install --save-dev @types/qrcode
```

### 2. Environment Setup
```env
NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 3. Run Database Migration
```bash
# Apply migration to add QR code tables
npx supabase migration apply 003_qr_code_support.sql
```

## Basic Usage

### Generate a Simple QR Code
```typescript
import { generateQRCode } from '@/lib/qr/generator';

// Generate QR for a store
const store = {
  id: 'store-uuid',
  store_code: 'ABC123',
  name: 'Downtown Store'
};

const qrDataUrl = await generateQRCode({
  url: `https://vocilia.com/feedback/${store.store_code}`,
  size: 280,
  includeLogo: true
});

// Display in React component
<img src={qrDataUrl} alt={`QR Code for ${store.name}`} />
```

### Generate with Template
```typescript
import { generateWithTemplate } from '@/lib/qr/templates';

// Generate wall poster with bilingual instructions
const wallPoster = await generateWithTemplate({
  store,
  template: 'wall',
  format: 'PDF',
  languages: ['sv', 'en']
});

// Download the file
wallPoster.download(`${store.name}-qr-wall.pdf`);
```

## Test Scenarios

### Scenario 1: Single Store QR Generation
```typescript
// Test: Business owner generates QR for their store
describe('Single Store QR Generation', () => {
  it('should generate QR code with correct URL', async () => {
    const result = await api.post('/stores/qr/generate', {
      storeId: 'test-store-id',
      templateName: 'counter',
      format: 'PNG'
    });

    expect(result.data.downloadUrl).toBeDefined();
    expect(result.data.qrVersion).toBe(1);

    // Verify QR content
    const qrContent = await scanQRCode(result.data.downloadUrl);
    expect(qrContent).toBe('https://vocilia.com/feedback/ABC123');
  });
});
```

### Scenario 2: Multiple Size Variants
```typescript
// Test: Download different sizes for various locations
describe('Size Variants', () => {
  const sizes = ['counter', 'wall', 'window'];

  sizes.forEach(size => {
    it(`should generate ${size} variant correctly`, async () => {
      const result = await generateWithTemplate({
        store,
        template: size,
        format: 'PDF'
      });

      const specs = getTemplateSpecs(size);
      expect(result.width).toBe(specs.widthCm);
      expect(result.dpi).toBe(300);
    });
  });
});
```

### Scenario 3: Bulk Download
```typescript
// Test: Multi-store business downloads all QR codes
describe('Bulk QR Download', () => {
  it('should generate QR codes for all stores', async () => {
    const job = await api.post('/stores/qr/bulk-download', {
      businessId: 'business-uuid',
      template: 'wall',
      format: 'PDF'
    });

    expect(job.data.jobId).toBeDefined();
    expect(job.data.totalStores).toBeGreaterThan(0);

    // Poll for completion
    const status = await waitForCompletion(job.data.jobId);
    expect(status.status).toBe('completed');
    expect(status.downloadUrl).toBeDefined();
  });
});
```

### Scenario 4: Bilingual Instructions
```typescript
// Test: QR includes Swedish and English instructions
describe('Bilingual Support', () => {
  it('should include both language instructions', async () => {
    const qr = await generateWithTemplate({
      store,
      template: 'wall',
      format: 'PDF',
      languages: ['sv', 'en']
    });

    const content = await extractPDFText(qr);

    // Swedish
    expect(content).toContain('Skanna för att ge feedback');
    expect(content).toContain('Få upp till 15% cashback');

    // English
    expect(content).toContain('Scan to give feedback');
    expect(content).toContain('Get up to 15% cashback');
  });
});
```

### Scenario 5: Download History
```typescript
// Test: Track who downloaded QR codes and when
describe('Download Tracking', () => {
  it('should log download history', async () => {
    // Download a QR code
    await api.get('/stores/qr/download/store-id', {
      params: { template: 'wall', format: 'PDF' }
    });

    // Check history
    const history = await api.get('/stores/qr/history');
    const lastDownload = history.data.downloads[0];

    expect(lastDownload.storeId).toBe('store-id');
    expect(lastDownload.template).toBe('wall');
    expect(lastDownload.format).toBe('PDF');
    expect(new Date(lastDownload.downloadedAt)).toBeInstanceOf(Date);
  });
});
```

## UI Components Usage

### QR Download Center
```tsx
import { QRDownloadCenter } from '@/components/stores/qr-generator/QRDownloadCenter';

// In your dashboard page
export default function StoresPage() {
  return (
    <div>
      <h1>QR Code Download Center</h1>
      <QRDownloadCenter businessId={user.businessId} />
    </div>
  );
}
```

### Individual Store QR Management
```tsx
import { QRCodeDisplay } from '@/components/stores/qr-generator/QRCodeDisplay';
import { QRCodeSizeSelector } from '@/components/stores/qr-generator/QRCodeSizeSelector';
import { QRCodeDownloader } from '@/components/stores/qr-generator/QRCodeDownloader';

export default function StoreQRPage({ storeId }) {
  const [selectedSize, setSelectedSize] = useState('wall');
  const [selectedFormat, setSelectedFormat] = useState('PDF');

  return (
    <div>
      <QRCodeDisplay storeId={storeId} size={selectedSize} />
      <QRCodeSizeSelector
        value={selectedSize}
        onChange={setSelectedSize}
      />
      <QRCodeDownloader
        storeId={storeId}
        template={selectedSize}
        format={selectedFormat}
      />
    </div>
  );
}
```

## Validation Checklist

### Functionality Tests
- [ ] QR code generates with correct URL
- [ ] Store code displays below QR
- [ ] All three size variants work
- [ ] PDF, PNG, and SVG formats generate
- [ ] Logo appears in center of QR
- [ ] Swedish instructions display correctly
- [ ] English instructions display correctly
- [ ] Bulk download creates ZIP file
- [ ] Download history tracks correctly
- [ ] Cache serves repeated requests

### Performance Tests
- [ ] Single QR generates in < 500ms
- [ ] Bulk download (10 stores) < 5 seconds
- [ ] Cached QR serves in < 100ms
- [ ] PDF size < 500KB
- [ ] PNG size < 200KB

### Print Quality Tests
- [ ] Counter QR scannable at 30cm
- [ ] Wall QR scannable at 1-2m
- [ ] Window QR scannable at 2-3m
- [ ] Black & white print works
- [ ] 300 DPI resolution verified

### Security Tests
- [ ] Requires authentication
- [ ] Only shows business's own stores
- [ ] Rate limiting enforced (100/hour)
- [ ] Download URLs expire after 1 hour
- [ ] Audit log captures downloads

## Common Issues & Solutions

### Issue: QR Code Not Scanning
```typescript
// Solution: Increase error correction level
const qr = await generateQRCode({
  url: feedbackUrl,
  errorCorrectionLevel: 'H', // 30% damage tolerance
  margin: 4 // Increase white border
});
```

### Issue: Logo Blocks QR Code
```typescript
// Solution: Reduce logo size
const MAX_LOGO_SIZE = 0.2; // 20% of QR code area
const logoSize = Math.min(qrSize * MAX_LOGO_SIZE, 60);
```

### Issue: Slow Bulk Generation
```typescript
// Solution: Use parallel processing
const generateInParallel = async (stores) => {
  const batchSize = 5;
  const batches = chunk(stores, batchSize);

  for (const batch of batches) {
    await Promise.all(
      batch.map(store => generateQRCode(store))
    );
  }
};
```

## Production Deployment

### 1. Build Command
```bash
npm run build
```

### 2. Environment Variables (Vercel)
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 3. Deploy
```bash
git push origin 001-6-2-qr
# Create PR and merge to main
# Auto-deploys to Vercel
```

### 4. Post-Deployment Tests
```bash
# Test QR generation on production
curl -X POST https://business.vocilia.com/api/stores/qr/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "test-store", "templateName": "wall", "format": "PDF"}'
```

## Monitoring

### Key Metrics
- QR generation success rate
- Average generation time
- Cache hit rate
- Download frequency by template
- Error rates by endpoint

### Alerts
- Generation time > 2 seconds
- Error rate > 5%
- Storage usage > 80%
- Rate limit violations

## Support

For issues or questions:
- Technical: Check `/specs/001-6-2-qr/` documentation
- Business: Contact product team
- Urgent: Check error logs in Supabase dashboard

---
*Quick start guide complete. Ready for implementation.*