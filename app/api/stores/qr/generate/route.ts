// API Route: Generate QR Code for Store

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getStore,
  getTemplateByName,
  getCachedQR,
  saveToCache,
  uploadFile,
  getSignedUrl,
  logDownload,
  ensureStorageBucket
} from '@/lib/supabase/qr-client';
import { generateWithTemplate } from '@/lib/qr/templates';
import { generatePDF } from '@/lib/qr/pdf-generator';
import { calculateChecksum, generateCacheKey } from '@/lib/qr/generator';
import { QRGenerateRequest, QRGenerateResponse } from '@/lib/types/qr';
import { FILE_FORMATS } from '@/lib/qr/constants';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: QRGenerateRequest = await request.json();
    const { storeId, templateName, format, includeLogo = true } = body;

    // Validate input
    if (!storeId || !templateName || !format) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields',
            details: { storeId, templateName, format },
          },
        },
        { status: 400 }
      );
    }

    // Validate format
    if (!['PDF', 'PNG', 'SVG'].includes(format)) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be PDF, PNG, or SVG',
          },
        },
        { status: 400 }
      );
    }

    // Get store details
    const store = await getStore(storeId);
    if (!store) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'STORE_NOT_FOUND',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify store belongs to user's business
    if (store.business_id !== user.id) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this store',
          },
        },
        { status: 403 }
      );
    }

    // Get template
    const template = await getTemplateByName(templateName);
    if (!template) {
      return NextResponse.json<QRGenerateResponse>(
        {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        },
        { status: 404 }
      );
    }

    // Check cache
    const qrVersion = store.qr_version || 1;
    const cached = await getCachedQR(storeId, template.id, format, qrVersion);

    if (cached && cached.file_url) {
      // Return cached version
      const signedUrl = await getSignedUrl(cached.file_path, 3600);

      // Log download
      await logDownload({
        store_id: storeId,
        business_id: user.id,
        template_id: template.id,
        format,
        file_url: signedUrl,
        file_size_kb: cached.file_size_kb,
        downloaded_by: user.id,
        qr_version: qrVersion,
        ip_address: request.headers.get('x-forwarded-for') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json<QRGenerateResponse>({
        success: true,
        data: {
          downloadUrl: signedUrl,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          fileSize: cached.file_size_kb,
          cached: true,
          qrVersion,
        },
      });
    }

    // Generate new QR code
    await ensureStorageBucket();

    // Update store for logo preference
    store.qr_logo_enabled = includeLogo;

    let fileData: Blob | Buffer;
    let mimeType: string;

    if (format === 'PDF') {
      // Generate PDF
      fileData = await generatePDF({
        template,
        store,
        format: 'PDF',
        languages: ['sv', 'en'],
      });
      mimeType = FILE_FORMATS.PDF.mimeType;
    } else {
      // Generate PNG or SVG
      const result = await generateWithTemplate({
        template,
        store,
        format,
        languages: ['sv', 'en'],
      });

      if (format === 'PNG' && result.dataUrl) {
        // Convert data URL to blob
        const response = await fetch(result.dataUrl);
        fileData = await response.blob();
        mimeType = FILE_FORMATS.PNG.mimeType;
      } else if (format === 'SVG' && result.svgString) {
        fileData = new Blob([result.svgString], { type: FILE_FORMATS.SVG.mimeType });
        mimeType = FILE_FORMATS.SVG.mimeType;
      } else {
        throw new Error('Failed to generate QR code');
      }
    }

    // Calculate file size
    const fileSizeKb = Math.round(fileData.size / 1024);

    // Calculate checksum
    const arrayBuffer = await fileData.arrayBuffer();
    const checksum = await calculateChecksum(Buffer.from(arrayBuffer));

    // Upload to Supabase Storage
    const fileName = `${store.store_code}_${templateName}_${format.toLowerCase()}_v${qrVersion}${FILE_FORMATS[format].extension}`;
    const filePath = `${user.id}/${storeId}/${fileName}`;

    const publicUrl = await uploadFile(filePath, fileData, mimeType);

    // Save to cache
    await saveToCache({
      store_id: storeId,
      template_id: template.id,
      format,
      qr_version: qrVersion,
      file_path: filePath,
      file_url: publicUrl,
      file_size_kb: fileSizeKb,
      checksum,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Get signed URL for download
    const signedUrl = await getSignedUrl(filePath, 3600);

    // Log download
    await logDownload({
      store_id: storeId,
      business_id: user.id,
      template_id: template.id,
      format,
      file_url: signedUrl,
      file_size_kb: fileSizeKb,
      downloaded_by: user.id,
      qr_version: qrVersion,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json<QRGenerateResponse>({
      success: true,
      data: {
        downloadUrl: signedUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        fileSize: fileSizeKb,
        cached: false,
        qrVersion,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);

    return NextResponse.json<QRGenerateResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate QR code',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}