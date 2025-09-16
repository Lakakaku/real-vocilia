// QR Code Generator Service

import QRCode from 'qrcode';
import { QRGenerationOptions, VOCILIA_LOGO_SVG } from '../types/qr';
import { QR_CONFIG, FEEDBACK_URL_BASE } from './constants';

export class QRGenerator {
  /**
   * Generate a QR code data URL with optional logo
   */
  static async generateQRCode(options: QRGenerationOptions): Promise<string> {
    const {
      url,
      size,
      errorCorrectionLevel = QR_CONFIG.errorCorrectionLevel,
      margin = QR_CONFIG.margin,
      color = QR_CONFIG.color,
      includeLogo = true,
    } = options;

    // Generate base QR code
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel,
      margin,
      color,
      width: size,
      type: 'image/png',
    });

    if (!includeLogo) {
      return qrDataUrl;
    }

    // Add logo to QR code
    return this.addLogoToQR(qrDataUrl, size);
  }

  /**
   * Generate QR code as Buffer for server-side processing
   */
  static async generateQRBuffer(options: QRGenerationOptions): Promise<Buffer> {
    const {
      url,
      size,
      errorCorrectionLevel = QR_CONFIG.errorCorrectionLevel,
      margin = QR_CONFIG.margin,
      color = QR_CONFIG.color,
    } = options;

    return QRCode.toBuffer(url, {
      errorCorrectionLevel,
      margin,
      color,
      width: size,
      type: 'png',
    });
  }

  /**
   * Generate QR code as SVG string
   */
  static async generateQRSVG(options: QRGenerationOptions): Promise<string> {
    const {
      url,
      size,
      errorCorrectionLevel = QR_CONFIG.errorCorrectionLevel,
      margin = QR_CONFIG.margin,
      color = QR_CONFIG.color,
    } = options;

    return QRCode.toString(url, {
      errorCorrectionLevel,
      margin,
      color,
      width: size,
      type: 'svg',
    });
  }

  /**
   * Add Vocilia logo to QR code (client-side)
   */
  private static async addLogoToQR(qrDataUrl: string, qrSize: number): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(qrDataUrl);
        return;
      }

      canvas.width = qrSize;
      canvas.height = qrSize;

      const qrImage = new Image();
      qrImage.onload = () => {
        // Draw QR code
        ctx.drawImage(qrImage, 0, 0, qrSize, qrSize);

        // Calculate logo size and position
        const logoSize = qrSize * QR_CONFIG.logoSize;
        const logoX = (qrSize - logoSize) / 2;
        const logoY = (qrSize - logoSize) / 2;

        // Draw white background circle for logo
        ctx.fillStyle = QR_CONFIG.logoBackground;
        ctx.beginPath();
        ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + QR_CONFIG.logoPadding, 0, 2 * Math.PI);
        ctx.fill();

        // Draw logo (convert SVG to image)
        const logoImage = new Image();
        logoImage.onload = () => {
          ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
          resolve(canvas.toDataURL('image/png'));
        };

        // Convert SVG to data URL
        const svgBlob = new Blob([VOCILIA_LOGO_SVG], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        logoImage.src = svgUrl;
      };

      qrImage.src = qrDataUrl;
    });
  }

  /**
   * Generate QR code URL for a store
   */
  static generateStoreQRUrl(storeCode: string): string {
    return `${FEEDBACK_URL_BASE}${storeCode}`;
  }

  /**
   * Calculate file size estimate
   */
  static estimateFileSize(format: 'PDF' | 'PNG' | 'SVG', qrSize: number): number {
    // Rough estimates in KB
    const estimates = {
      PDF: Math.round((qrSize * qrSize * 0.001) + 100), // Base PDF overhead
      PNG: Math.round(qrSize * qrSize * 0.0003),
      SVG: Math.round(qrSize * 0.1 + 10),
    };

    return estimates[format];
  }

  /**
   * Validate store code format
   */
  static isValidStoreCode(code: string): boolean {
    // 6 alphanumeric characters
    return /^[A-Z0-9]{6}$/.test(code);
  }

  /**
   * Generate cache key for QR code
   */
  static generateCacheKey(storeId: string, templateName: string, format: string, version: number): string {
    return `qr_${storeId}_${templateName}_${format}_v${version}`;
  }

  /**
   * Calculate checksum for file validation
   */
  static async calculateChecksum(data: Buffer | string): Promise<string> {
    const crypto = typeof window === 'undefined' ? require('crypto') : window.crypto;

    if (typeof window === 'undefined') {
      // Server-side
      return crypto.createHash('sha256').update(data).digest('hex');
    } else {
      // Client-side
      const encoder = new TextEncoder();
      const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }
}

// Export utility functions for direct use
export const generateQRCode = QRGenerator.generateQRCode.bind(QRGenerator);
export const generateQRBuffer = QRGenerator.generateQRBuffer.bind(QRGenerator);
export const generateQRSVG = QRGenerator.generateQRSVG.bind(QRGenerator);
export const generateStoreQRUrl = QRGenerator.generateStoreQRUrl.bind(QRGenerator);
export const estimateFileSize = QRGenerator.estimateFileSize.bind(QRGenerator);
export const isValidStoreCode = QRGenerator.isValidStoreCode.bind(QRGenerator);
export const generateCacheKey = QRGenerator.generateCacheKey.bind(QRGenerator);
export const calculateChecksum = QRGenerator.calculateChecksum.bind(QRGenerator);