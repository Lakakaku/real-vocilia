// PDF Generator for QR Codes

import jsPDF from 'jspdf';
import { QRTemplateConfig } from '../types/qr';
import { QR_SIZES, TRANSLATIONS, VOCILIA_COLORS, FONTS } from './constants';
import { generateQRCode, generateStoreQRUrl } from './generator';

export class PDFGenerator {
  /**
   * Generate PDF with QR code and instructions
   */
  static async generatePDF(config: QRTemplateConfig): Promise<Blob> {
    const { template, store, languages = ['sv', 'en'] } = config;
    const specs = QR_SIZES[template.name];

    // Create PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: [specs.widthCm, specs.heightCm],
    });

    // Set document properties
    pdf.setProperties({
      title: `QR Code - ${store.name}`,
      subject: `Vocilia Feedback QR Code`,
      author: 'Vocilia',
      keywords: `qr,feedback,${store.store_code}`,
      creator: 'Vocilia QR Generator',
    });

    // Generate QR code
    const qrUrl = generateStoreQRUrl(store.store_code);
    const qrDataUrl = await generateQRCode({
      url: qrUrl,
      size: specs.qrSizePx,
      includeLogo: store.qr_logo_enabled !== false,
    });

    // Add white background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, specs.widthCm, specs.heightCm, 'F');

    // Add QR code to PDF
    const qrSizeCm = specs.qrSizePx / 118.11; // Convert pixels to cm at 300 DPI
    const qrX = (specs.widthCm - qrSizeCm) / 2;
    const qrY = 1; // 1cm from top

    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSizeCm, qrSizeCm);

    // Add store code below QR
    const codeY = qrY + qrSizeCm + 0.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(specs.fontSizeCode);
    pdf.setTextColor(51, 51, 51); // Dark gray

    languages.forEach((lang, index) => {
      const label = TRANSLATIONS[lang as 'sv' | 'en'].store_code_label;
      const text = `${label}: ${store.store_code}`;
      pdf.text(text, specs.widthCm / 2, codeY + (index * 0.5), {
        align: 'center',
      });
    });

    // Add instructions
    const instructionY = codeY + 1.5;

    languages.forEach((lang, langIndex) => {
      const translations = TRANSLATIONS[lang as 'sv' | 'en'];
      const startY = instructionY + (langIndex * 3);

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(specs.fontSizeInstructions + 2);
      pdf.text(translations.scan_prompt, specs.widthCm / 2, startY, {
        align: 'center',
      });

      // Cashback info
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(specs.fontSizeInstructions);
      pdf.text(translations.cashback_info, specs.widthCm / 2, startY + 0.5, {
        align: 'center',
      });

      // Steps
      pdf.setFontSize(specs.fontSizeInstructions - 1);
      const stepsX = 1;
      pdf.text(translations.step_1, stepsX, startY + 1);
      pdf.text(translations.step_2, stepsX, startY + 1.4);
      pdf.text(translations.step_3, stepsX, startY + 1.8);

      // Add separator between languages
      if (langIndex === 0 && languages.length > 1) {
        pdf.setDrawColor(224, 224, 224); // Light gray
        pdf.line(1, startY + 2.2, specs.widthCm - 1, startY + 2.2);
      }
    });

    // Add footer with Vocilia branding
    const footerY = specs.heightCm - 0.5;
    pdf.setFontSize(8);
    pdf.setTextColor(119, 136, 238); // Vocilia accent color
    pdf.text('vocilia.com', specs.widthCm / 2, footerY, {
      align: 'center',
    });

    // Generate blob
    return pdf.output('blob');
  }

  /**
   * Generate bulk PDF with multiple QR codes
   */
  static async generateBulkPDF(stores: any[], templateName: 'counter' | 'wall' | 'window'): Promise<Blob> {
    const specs = QR_SIZES[templateName];

    // Create PDF document (A4 size for bulk)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Calculate how many QR codes fit on one page
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const qrSizeMm = specs.widthCm * 10; // Convert cm to mm
    const spacing = 5;

    const cols = Math.floor((pageWidth - 2 * margin) / (qrSizeMm + spacing));
    const rows = Math.floor((pageHeight - 2 * margin) / (qrSizeMm + spacing));
    const qrPerPage = cols * rows;

    // Process each store
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const pageIndex = Math.floor(i / qrPerPage);
      const positionOnPage = i % qrPerPage;
      const row = Math.floor(positionOnPage / cols);
      const col = positionOnPage % cols;

      // Add new page if needed
      if (positionOnPage === 0 && i > 0) {
        pdf.addPage();
      }

      // Calculate position
      const x = margin + col * (qrSizeMm + spacing);
      const y = margin + row * (qrSizeMm + spacing);

      // Generate QR code
      const qrUrl = generateStoreQRUrl(store.store_code);
      const qrDataUrl = await generateQRCode({
        url: qrUrl,
        size: 200, // Fixed size for bulk
        includeLogo: true,
      });

      // Add QR code
      const qrDisplaySize = Math.min(qrSizeMm - 10, 40); // Max 40mm for bulk
      pdf.addImage(qrDataUrl, 'PNG', x + 5, y + 5, qrDisplaySize, qrDisplaySize);

      // Add store name and code
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(store.name, x + qrSizeMm / 2, y + qrDisplaySize + 10, {
        align: 'center',
        maxWidth: qrSizeMm - 2,
      });

      pdf.setFont('helvetica', 'bold');
      pdf.text(store.store_code, x + qrSizeMm / 2, y + qrDisplaySize + 15, {
        align: 'center',
      });
    }

    return pdf.output('blob');
  }

  /**
   * Generate PDF download link
   */
  static generateDownloadLink(blob: Blob, filename: string): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Calculate PDF file size estimate
   */
  static estimatePDFSize(templateName: 'counter' | 'wall' | 'window', storeCount: number = 1): number {
    const specs = QR_SIZES[templateName];
    const baseSize = 50; // Base PDF overhead in KB
    const qrSize = specs.qrSizePx * specs.qrSizePx * 0.0001; // QR code size estimate
    const textSize = 10; // Text and instructions

    return Math.round(baseSize + (qrSize + textSize) * storeCount);
  }

  /**
   * Add watermark to PDF
   */
  static addWatermark(pdf: jsPDF, text: string): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(50);
    pdf.setFont('helvetica', 'bold');

    // Save the current graphics state
    pdf.saveGraphicsState();

    // Rotate and add watermark
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    pdf.text(text, centerX, centerY, {
      align: 'center',
      angle: 45,
    });

    // Restore graphics state
    pdf.restoreGraphicsState();
  }

  /**
   * Add page numbers to PDF
   */
  static addPageNumbers(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  }
}

// Export utility functions
export const generatePDF = PDFGenerator.generatePDF.bind(PDFGenerator);
export const generateBulkPDF = PDFGenerator.generateBulkPDF.bind(PDFGenerator);
export const generateDownloadLink = PDFGenerator.generateDownloadLink.bind(PDFGenerator);
export const estimatePDFSize = PDFGenerator.estimatePDFSize.bind(PDFGenerator);