// API Route: Preview QR Code

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStore, getTemplateByName } from '@/lib/supabase/qr-client';
import { generateWithTemplate } from '@/lib/qr/templates';

interface PreviewRequest {
  storeId: string;
  templateName: 'counter' | 'wall' | 'window';
  includeLogo?: boolean;
  language?: 'sv' | 'en';
}

interface PreviewResponse {
  success: boolean;
  data?: {
    dataUrl: string;
    svgString?: string;
    storeCode: string;
    storeName: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<PreviewResponse>(
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
    const body: PreviewRequest = await request.json();
    const { storeId, templateName, includeLogo = true, language = 'sv' } = body;

    // Validate input
    if (!storeId || !templateName) {
      return NextResponse.json<PreviewResponse>(
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

    // Get store details
    const store = await getStore(storeId);
    if (!store) {
      return NextResponse.json<PreviewResponse>(
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
      return NextResponse.json<PreviewResponse>(
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
      return NextResponse.json<PreviewResponse>(
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

    // Update store for logo preference
    store.qr_logo_enabled = includeLogo;

    // Generate preview
    const result = await generateWithTemplate({
      template,
      store,
      format: 'PNG',
      languages: [language],
    });

    if (!result.dataUrl) {
      throw new Error('Failed to generate preview');
    }

    // Also generate SVG for scalability
    const svgResult = await generateWithTemplate({
      template,
      store,
      format: 'SVG',
      languages: [language],
    });

    return NextResponse.json<PreviewResponse>({
      success: true,
      data: {
        dataUrl: result.dataUrl,
        svgString: svgResult.svgString,
        storeCode: store.store_code,
        storeName: store.name,
      },
    });
  } catch (error) {
    console.error('Preview generation error:', error);

    return NextResponse.json<PreviewResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate preview',
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