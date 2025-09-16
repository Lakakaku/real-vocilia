// API Route: Get Available QR Code Templates

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTemplates } from '@/lib/supabase/qr-client';
import { QRTemplate } from '@/lib/types/qr';

interface TemplatesResponse {
  success: boolean;
  data?: {
    templates: QRTemplate[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<TemplatesResponse>(
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

    // Get templates
    const templates = await getTemplates();

    return NextResponse.json<TemplatesResponse>({
      success: true,
      data: {
        templates,
      },
    });
  } catch (error) {
    console.error('Templates fetch error:', error);

    return NextResponse.json<TemplatesResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch templates',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}