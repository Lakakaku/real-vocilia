// QR Code Generation Types

export interface QRTemplate {
  id: string;
  name: 'counter' | 'wall' | 'window';
  width_cm: number;
  height_cm: number;
  qr_size_px: number;
  dpi: number;
  padding_px: number;
  font_size_code: number;
  font_size_instructions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QRCache {
  id: string;
  store_id: string;
  template_id: string;
  format: 'PDF' | 'PNG' | 'SVG';
  qr_version: number;
  file_path: string;
  file_url: string;
  file_size_kb: number;
  checksum: string;
  generated_at: string;
  accessed_at: string;
  access_count: number;
  expires_at: string;
}

export interface QRDownloadHistory {
  id: string;
  store_id: string;
  business_id: string;
  template_id: string;
  format: 'PDF' | 'PNG' | 'SVG' | 'ZIP';
  file_url?: string;
  file_size_kb?: number;
  downloaded_by?: string;
  downloaded_at: string;
  ip_address?: string;
  user_agent?: string;
  qr_version: number;
  created_at: string;
}

export interface QRTranslation {
  id: string;
  language_code: 'sv' | 'en';
  key: string;
  value: string;
  context: 'instruction' | 'ui' | 'email';
  created_at: string;
  updated_at: string;
}

export interface QRGenerationOptions {
  url: string;
  size: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  includeLogo?: boolean;
  logoPath?: string;
}

export interface QRTemplateConfig {
  template: QRTemplate;
  store: {
    id: string;
    store_code: string;
    name: string;
    qr_version?: number;
    qr_logo_enabled?: boolean;
  };
  format: 'PDF' | 'PNG' | 'SVG';
  languages?: ('sv' | 'en')[];
  translations?: QRTranslation[];
}

export interface QRGenerateRequest {
  storeId: string;
  templateName: 'counter' | 'wall' | 'window';
  format: 'PDF' | 'PNG' | 'SVG';
  includeLogo?: boolean;
}

export interface QRGenerateResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    expiresAt: string;
    fileSize: number;
    cached: boolean;
    qrVersion: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface QRBulkDownloadRequest {
  businessId: string;
  storeIds?: string[];
  template?: 'counter' | 'wall' | 'window';
  format?: 'PDF' | 'PNG' | 'SVG';
}

export interface QRBulkDownloadResponse {
  success: boolean;
  data?: {
    jobId: string;
    totalStores: number;
    estimatedTime: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface QRBulkStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  completedStores: number;
  totalStores: number;
  downloadUrl?: string;
  error?: string;
}

export interface QRDownloadParams {
  storeId: string;
  template: 'counter' | 'wall' | 'window';
  format: 'PDF' | 'PNG' | 'SVG';
}

export interface QRHistoryParams {
  storeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface QRHistoryResponse {
  success: boolean;
  data?: {
    downloads: Array<{
      id: string;
      storeId: string;
      storeName: string;
      template: string;
      format: string;
      downloadedAt: string;
      downloadedBy?: string;
      fileSize?: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Helper type for template specifications
export interface TemplateSpecs {
  counter: {
    displayName: string;
    description: string;
    useCase: string;
  };
  wall: {
    displayName: string;
    description: string;
    useCase: string;
  };
  window: {
    displayName: string;
    description: string;
    useCase: string;
  };
}

// Vocilia logo as SVG string for embedding
export const VOCILIA_LOGO_SVG = `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0077BE;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B68EE;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="100" y="35"
        text-anchor="middle"
        font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        font-size="32"
        font-weight="600"
        font-style="italic"
        fill="url(#waveGradient)">
    Vocilia
  </text>
</svg>`;