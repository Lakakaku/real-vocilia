// API Route: Invalidate QR Code Cache

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateStoreQRVersion, cleanExpiredCache } from '@/lib/supabase/qr-client';

interface InvalidateCacheRequest {
  storeId?: string;
  cleanExpired?: boolean;
}

interface InvalidateCacheResponse {
  success: boolean;
  data?: {
    message: string;
    newVersion?: number;
    cleanedCount?: number;
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
      return NextResponse.json<InvalidateCacheResponse>(
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
    const body: InvalidateCacheRequest = await request.json();
    const { storeId, cleanExpired = false } = body;

    let message = '';
    let newVersion: number | undefined;
    let cleanedCount: number | undefined;

    if (storeId) {
      // Verify store ownership
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, business_id, qr_version')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        return NextResponse.json<InvalidateCacheResponse>(
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

      if (store.business_id !== user.id) {
        return NextResponse.json<InvalidateCacheResponse>(
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

      // Increment QR version to invalidate cache
      await updateStoreQRVersion(storeId);
      newVersion = (store.qr_version || 0) + 1;
      message = `Cache invalidated for store. New version: ${newVersion}`;
    }

    if (cleanExpired) {
      // Clean expired cache entries
      cleanedCount = await cleanExpiredCache();
      message += message ? '. ' : '';
      message += `Cleaned ${cleanedCount} expired cache entries`;
    }

    if (!storeId && !cleanExpired) {
      return NextResponse.json<InvalidateCacheResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Either storeId or cleanExpired must be provided',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json<InvalidateCacheResponse>({
      success: true,
      data: {
        message,
        newVersion,
        cleanedCount,
      },
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);

    return NextResponse.json<InvalidateCacheResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to invalidate cache',
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