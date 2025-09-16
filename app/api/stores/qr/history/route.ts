// API Route: Get QR Code Download History

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDownloadHistory } from '@/lib/supabase/qr-client';
import { QRDownloadHistory } from '@/lib/types/qr';

interface HistoryResponse {
  success: boolean;
  data?: {
    downloads: QRDownloadHistory[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
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
      return NextResponse.json<HistoryResponse>(
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json<HistoryResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Invalid pagination parameters',
          },
        },
        { status: 400 }
      );
    }

    // Get download history
    const { downloads, total } = await getDownloadHistory(user.id, {
      storeId,
      startDate,
      endDate,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json<HistoryResponse>({
      success: true,
      data: {
        downloads,
        total,
        page,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('History fetch error:', error);

    return NextResponse.json<HistoryResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch download history',
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