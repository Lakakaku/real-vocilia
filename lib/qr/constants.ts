// QR Code Constants and Configuration

export const QR_SIZES = {
  counter: {
    widthCm: 10,
    heightCm: 10,
    qrSizePx: 280,
    dpi: 300,
    paddingPx: 20,
    fontSizeCode: 14,
    fontSizeInstructions: 10,
  },
  wall: {
    widthCm: 21,
    heightCm: 21,
    qrSizePx: 600,
    dpi: 300,
    paddingPx: 30,
    fontSizeCode: 18,
    fontSizeInstructions: 12,
  },
  window: {
    widthCm: 30,
    heightCm: 30,
    qrSizePx: 900,
    dpi: 300,
    paddingPx: 40,
    fontSizeCode: 24,
    fontSizeInstructions: 14,
  },
} as const;

export const TEMPLATE_SPECS = {
  counter: {
    displayName: 'Counter Display',
    description: 'Small QR code for point-of-sale counters',
    useCase: 'Place near cash register for easy scanning',
    dimensions: {
      width: 10,
      height: 10,
      qrSize: 7,
    },
    printSpecs: {
      dpi: 300,
    },
  },
  wall: {
    displayName: 'Wall Poster',
    description: 'Medium QR code for wall mounting',
    useCase: 'Mount on walls or bulletin boards',
    dimensions: {
      width: 21,
      height: 21,
      qrSize: 15,
    },
    printSpecs: {
      dpi: 300,
    },
  },
  window: {
    displayName: 'Window Display',
    description: 'Large QR code for storefront windows',
    useCase: 'Display in storefront windows or entrance doors',
    dimensions: {
      width: 30,
      height: 30,
      qrSize: 22,
    },
    printSpecs: {
      dpi: 300,
    },
  },
} as const;

export const QR_CONFIG = {
  errorCorrectionLevel: 'H' as const, // High - 30% damage tolerance
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  logoSize: 0.25, // 25% of QR code size
  logoPadding: 2, // pixels
  logoBackground: '#FFFFFF',
};

export const TRANSLATIONS = {
  sv: {
    scan_prompt: 'Skanna f�r att ge feedback',
    cashback_info: 'F� upp till 15% cashback',
    step_1: '1. Skanna QR-koden med din mobil',
    step_2: '2. Ber�tta om din upplevelse',
    step_3: '3. F� cashback direkt via Swish',
    store_code_label: 'Kod',
    download_button: 'Ladda ner',
    select_size: 'V�lj storlek',
    select_format: 'V�lj format',
    generating: 'Genererar QR-kod...',
    downloading: 'Laddar ner...',
    error: 'Ett fel uppstod',
    success: 'QR-kod genererad!',
  },
  en: {
    scan_prompt: 'Scan to give feedback',
    cashback_info: 'Get up to 15% cashback',
    step_1: '1. Scan the QR code with your phone',
    step_2: '2. Share your experience',
    step_3: '3. Get cashback instantly via Swish',
    store_code_label: 'Code',
    download_button: 'Download',
    select_size: 'Select size',
    select_format: 'Select format',
    generating: 'Generating QR code...',
    downloading: 'Downloading...',
    error: 'An error occurred',
    success: 'QR code generated!',
  },
} as const;

export const FILE_FORMATS = {
  PDF: {
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  PNG: {
    mimeType: 'image/png',
    extension: '.png',
  },
  SVG: {
    mimeType: 'image/svg+xml',
    extension: '.svg',
  },
} as const;

export const RATE_LIMITS = {
  maxRequestsPerHour: 100,
  maxBulkStores: 50,
  cacheExpiryDays: 30,
};

export const VOCILIA_COLORS = {
  primary: '#0077BE',
  secondary: '#4A90E2',
  accent: '#7B68EE',
  text: '#333333',
  background: '#FFFFFF',
  border: '#E0E0E0',
} as const;

export const FEEDBACK_URL_BASE = 'https://vocilia.com/feedback/';
export const QR_REDIRECT_BASE = 'https://vocilia.com/qr/';

// Font configurations for PDF generation
export const FONTS = {
  primary: 'Helvetica',
  secondary: 'Courier',
  sizes: {
    title: 24,
    subtitle: 18,
    body: 12,
    small: 10,
    code: 14,
  },
} as const;