// API Route: Bulk Download QR Codes for Multiple Stores

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import {
  getBusinessStores,
  getTemplateByName,
  ensureStorageBucket,
  uploadFile,
  getSignedUrl,
  logDownload
} from '@/lib/supabase/qr-client';
import { generateBulkPDF } from '@/lib/qr/pdf-generator';
import { generateWithTemplate } from '@/lib/qr/templates';
import { FILE_FORMATS } from '@/lib/qr/constants';
import JSZip from 'jszip';

interface BulkDownloadRequest {
  businessId: string;
  template: 'counter' | 'wall' | 'window';
  format: 'PDF' | 'PNG' | 'SVG' | 'ZIP';
}

interface BulkDownloadResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    expiresAt: string;
    fileCount: number;
    totalSize: number;
    jobId?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<BulkDownloadResponse>(
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
    const body: BulkDownloadRequest = await request.json();
    const { businessId, template, format } = body;

    // Validate input
    if (!businessId || !template || !format) {
      return NextResponse.json<BulkDownloadResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    // Verify business ownership
    if (businessId !== user.id) {
      return NextResponse.json<BulkDownloadResponse>(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this business',
          },
        },
        { status: 403 }
      );
    }

    // Get all stores for the business
    const stores = await getBusinessStores(businessId);

    if (stores.length === 0) {
      return NextResponse.json<BulkDownloadResponse>(
        {
          success: false,
          error: {
            code: 'NO_STORES',
            message: 'No stores found for this business',
          },
        },
        { status: 404 }
      );
    }

    // Get template
    const templateData = await getTemplateByName(template);
    if (!templateData) {
      return NextResponse.json<BulkDownloadResponse>(
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

    // Ensure storage bucket exists
    await ensureStorageBucket();

    let fileData: Blob;
    let fileName: string;
    let mimeType: string;

    if (format === 'PDF') {
      // Generate single PDF with all QR codes
      fileData = await generateBulkPDF(stores, template);
      fileName = `bulk_qr_${template}_${Date.now()}.pdf`;
      mimeType = FILE_FORMATS.PDF.mimeType;
    } else if (format === 'ZIP') {
      // Generate individual files and ZIP them
      const zip = new JSZip();

      for (const store of stores) {
        const result = await generateWithTemplate({
          template: templateData,
          store,
          format: 'PNG',
          languages: ['sv', 'en'],
        });

        if (result.dataUrl) {
          const response = await fetch(result.dataUrl);
          const blob = await response.blob();
          zip.file(`${store.store_code}_${template}.png`, blob);
        }
      }

      fileData = await zip.generateAsync({ type: 'blob' });
      fileName = `bulk_qr_${template}_${Date.now()}.zip`;
      mimeType = 'application/zip';
    } else {
      // For PNG/SVG, generate a ZIP file with individual files
      const zip = new JSZip();

      for (const store of stores) {
        const result = await generateWithTemplate({
          template: templateData,
          store,
          format,
          languages: ['sv', 'en'],
        });

        if (format === 'PNG' && result.dataUrl) {
          const response = await fetch(result.dataUrl);
          const blob = await response.blob();
          zip.file(`${store.store_code}_${template}.png`, blob);
        } else if (format === 'SVG' && result.svgString) {
          zip.file(`${store.store_code}_${template}.svg`, result.svgString);
        }
      }

      fileData = await zip.generateAsync({ type: 'blob' });
      fileName = `bulk_qr_${format.toLowerCase()}_${template}_${Date.now()}.zip`;
      mimeType = 'application/zip';
    }

    // Calculate file size
    const fileSizeKb = Math.round(fileData.size / 1024);

    // Upload to storage
    const filePath = `${businessId}/bulk/${fileName}`;
    await uploadFile(filePath, fileData, mimeType);

    // Get signed URL
    const signedUrl = await getSignedUrl(filePath, 3600);

    // Log download for each store
    const jobId = `bulk_${Date.now()}`;
    for (const store of stores) {
      await logDownload({
        store_id: store.id,
        business_id: businessId,
        template_id: templateData.id,
        format,
        file_url: signedUrl,
        file_size_kb: Math.round(fileSizeKb / stores.length),
        downloaded_by: user.id,
        qr_version: store.qr_version || 1,
        ip_address: request.headers.get('x-forwarded-for') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
      });
    }

    return NextResponse.json<BulkDownloadResponse>({
      success: true,
      data: {
        downloadUrl: signedUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        fileCount: stores.length,
        totalSize: fileSizeKb,
        jobId,
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);

    return NextResponse.json<BulkDownloadResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate bulk download',
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