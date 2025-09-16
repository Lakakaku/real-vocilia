// QR Code Template Configurations

import { QRTemplate, QRTemplateConfig, VOCILIA_LOGO_SVG } from '../types/qr';
import { QR_SIZES, TEMPLATE_SPECS, TRANSLATIONS, VOCILIA_COLORS, FONTS } from './constants';
import { generateQRCode, generateStoreQRUrl } from './generator';

export class QRTemplateGenerator {
  /**
   * Generate QR code with template
   */
  static async generateWithTemplate(config: QRTemplateConfig): Promise<{
    dataUrl?: string;
    buffer?: Buffer;
    svgString?: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      template: string;
    };
  }> {
    const { template, store, format, languages = ['sv', 'en'] } = config;

    // Generate QR code URL
    const qrUrl = generateStoreQRUrl(store.store_code);

    // Get template specifications
    const specs = QR_SIZES[template.name];

    // Generate base QR code
    const qrDataUrl = await generateQRCode({
      url: qrUrl,
      size: specs.qrSizePx,
      includeLogo: store.qr_logo_enabled !== false,
    });

    // Generate template based on format
    switch (format) {
      case 'PNG':
        return this.generatePNGTemplate(qrDataUrl, template, store, languages);
      case 'SVG':
        return this.generateSVGTemplate(qrUrl, template, store, languages);
      case 'PDF':
        // PDF generation handled by pdf-generator.ts
        return {
          dataUrl: qrDataUrl,
          metadata: {
            width: specs.widthCm,
            height: specs.heightCm,
            format: 'PDF',
            template: template.name,
          },
        };
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate PNG template with instructions
   */
  private static async generatePNGTemplate(
    qrDataUrl: string,
    template: QRTemplate,
    store: any,
    languages: string[]
  ) {
    const specs = QR_SIZES[template.name];

    // Create canvas for full template
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Calculate canvas size (convert cm to pixels at 300 DPI)
    const widthPx = Math.round(specs.widthCm * 118.11); // 1 cm = 118.11 px at 300 DPI
    const heightPx = Math.round(specs.heightCm * 118.11);

    canvas.width = widthPx;
    canvas.height = heightPx;

    // White background
    ctx.fillStyle = VOCILIA_COLORS.background;
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Draw QR code
    const qrImage = new Image();
    await new Promise((resolve) => {
      qrImage.onload = resolve;
      qrImage.src = qrDataUrl;
    });

    const qrX = (widthPx - specs.qrSizePx) / 2;
    const qrY = specs.paddingPx * 2;
    ctx.drawImage(qrImage, qrX, qrY, specs.qrSizePx, specs.qrSizePx);

    // Draw store code below QR
    ctx.font = `${specs.fontSizeCode}px ${FONTS.secondary}`;
    ctx.fillStyle = VOCILIA_COLORS.text;
    ctx.textAlign = 'center';
    const codeY = qrY + specs.qrSizePx + specs.paddingPx;

    languages.forEach((lang, index) => {
      const label = TRANSLATIONS[lang as 'sv' | 'en'].store_code_label;
      const text = `${label}: ${store.store_code}`;
      ctx.fillText(text, widthPx / 2, codeY + (index * 20));
    });

    // Draw instructions
    const instructionY = codeY + 60;
    ctx.font = `bold ${specs.fontSizeInstructions + 2}px ${FONTS.primary}`;

    languages.forEach((lang, langIndex) => {
      const translations = TRANSLATIONS[lang as 'sv' | 'en'];
      const startY = instructionY + (langIndex * 120);

      // Title
      ctx.fillText(translations.scan_prompt, widthPx / 2, startY);

      // Cashback info
      ctx.font = `${specs.fontSizeInstructions}px ${FONTS.primary}`;
      ctx.fillText(translations.cashback_info, widthPx / 2, startY + 20);

      // Steps
      ctx.font = `${specs.fontSizeInstructions - 1}px ${FONTS.primary}`;
      ctx.textAlign = 'left';
      const stepsX = specs.paddingPx * 2;
      ctx.fillText(translations.step_1, stepsX, startY + 40);
      ctx.fillText(translations.step_2, stepsX, startY + 55);
      ctx.fillText(translations.step_3, stepsX, startY + 70);
      ctx.textAlign = 'center';
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      metadata: {
        width: specs.widthCm,
        height: specs.heightCm,
        format: 'PNG',
        template: template.name,
      },
    };
  }

  /**
   * Generate SVG template
   */
  private static async generateSVGTemplate(
    qrUrl: string,
    template: QRTemplate,
    store: any,
    languages: string[]
  ) {
    const specs = QR_SIZES[template.name];

    // Build SVG string
    const svg = `
      <svg width="${specs.widthCm * 37.795}" height="${specs.heightCm * 37.795}"
           xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 ${specs.widthCm * 37.795} ${specs.heightCm * 37.795}">

        <!-- White background -->
        <rect width="100%" height="100%" fill="${VOCILIA_COLORS.background}" />

        <!-- QR Code placeholder (would be embedded as base64 image) -->
        <rect x="${(specs.widthCm * 37.795 - specs.qrSizePx) / 2}"
              y="${specs.paddingPx}"
              width="${specs.qrSizePx}"
              height="${specs.qrSizePx}"
              fill="url(#qrPattern)" />

        <!-- Store code -->
        ${languages.map((lang, index) => {
          const label = TRANSLATIONS[lang as 'sv' | 'en'].store_code_label;
          return `<text x="${specs.widthCm * 37.795 / 2}"
                        y="${specs.paddingPx + specs.qrSizePx + 30 + (index * 20)}"
                        font-family="${FONTS.secondary}"
                        font-size="${specs.fontSizeCode}"
                        text-anchor="middle"
                        fill="${VOCILIA_COLORS.text}">
                    ${label}: ${store.store_code}
                  </text>`;
        }).join('')}

        <!-- Instructions -->
        ${languages.map((lang, langIndex) => {
          const translations = TRANSLATIONS[lang as 'sv' | 'en'];
          const startY = specs.paddingPx + specs.qrSizePx + 100 + (langIndex * 120);

          return `
            <text x="${specs.widthCm * 37.795 / 2}" y="${startY}"
                  font-family="${FONTS.primary}"
                  font-size="${specs.fontSizeInstructions + 2}"
                  font-weight="bold"
                  text-anchor="middle"
                  fill="${VOCILIA_COLORS.text}">
              ${translations.scan_prompt}
            </text>
            <text x="${specs.widthCm * 37.795 / 2}" y="${startY + 20}"
                  font-family="${FONTS.primary}"
                  font-size="${specs.fontSizeInstructions}"
                  text-anchor="middle"
                  fill="${VOCILIA_COLORS.text}">
              ${translations.cashback_info}
            </text>
            <text x="${specs.paddingPx * 2}" y="${startY + 40}"
                  font-family="${FONTS.primary}"
                  font-size="${specs.fontSizeInstructions - 1}"
                  fill="${VOCILIA_COLORS.text}">
              ${translations.step_1}
            </text>
            <text x="${specs.paddingPx * 2}" y="${startY + 55}"
                  font-family="${FONTS.primary}"
                  font-size="${specs.fontSizeInstructions - 1}"
                  fill="${VOCILIA_COLORS.text}">
              ${translations.step_2}
            </text>
            <text x="${specs.paddingPx * 2}" y="${startY + 70}"
                  font-family="${FONTS.primary}"
                  font-size="${specs.fontSizeInstructions - 1}"
                  fill="${VOCILIA_COLORS.text}">
              ${translations.step_3}
            </text>
          `;
        }).join('')}

        <!-- Vocilia Logo (if enabled) -->
        ${store.qr_logo_enabled !== false ? VOCILIA_LOGO_SVG : ''}
      </svg>
    `;

    return {
      svgString: svg,
      metadata: {
        width: specs.widthCm,
        height: specs.heightCm,
        format: 'SVG',
        template: template.name,
      },
    };
  }

  /**
   * Get template specifications
   */
  static getTemplateSpecs(templateName: 'counter' | 'wall' | 'window') {
    return {
      ...TEMPLATE_SPECS[templateName],
      ...QR_SIZES[templateName],
    };
  }

  /**
   * Validate template configuration
   */
  static validateTemplateConfig(config: QRTemplateConfig): boolean {
    const { template, store, format } = config;

    // Check required fields
    if (!template || !store || !format) {
      return false;
    }

    // Validate template name
    if (!['counter', 'wall', 'window'].includes(template.name)) {
      return false;
    }

    // Validate format
    if (!['PDF', 'PNG', 'SVG'].includes(format)) {
      return false;
    }

    // Validate store code
    if (!/^[A-Z0-9]{6}$/.test(store.store_code)) {
      return false;
    }

    return true;
  }

  /**
   * Get available templates from database
   */
  static async getAvailableTemplates(): Promise<QRTemplate[]> {
    // This would normally fetch from Supabase
    // For now, return static data
    return Object.entries(QR_SIZES).map(([name, specs]) => ({
      id: name,
      name: name as 'counter' | 'wall' | 'window',
      width_cm: specs.widthCm,
      height_cm: specs.heightCm,
      qr_size_px: specs.qrSizePx,
      dpi: specs.dpi,
      padding_px: specs.paddingPx,
      font_size_code: specs.fontSizeCode,
      font_size_instructions: specs.fontSizeInstructions,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
}

// Export utility functions
export const generateWithTemplate = QRTemplateGenerator.generateWithTemplate.bind(QRTemplateGenerator);
export const getTemplateSpecs = QRTemplateGenerator.getTemplateSpecs.bind(QRTemplateGenerator);
export const validateTemplateConfig = QRTemplateGenerator.validateTemplateConfig.bind(QRTemplateGenerator);
export const getAvailableTemplates = QRTemplateGenerator.getAvailableTemplates.bind(QRTemplateGenerator);