import { NextRequest, NextResponse } from 'next/server';
import { getStoreByCode } from '@/lib/stores/service';
import {
  validateStoreCodeFormat
} from '@/lib/validation/validation-logic';
import { sanitizeStoreCode } from '@/lib/validation/sanitize-input';
import {
  formatValidationResponse,
  createRateLimitError,
  createNetworkError,
  createSuccessResponse
} from '@/lib/utils/error-messages';
import {
  extractIPAddress,
  checkRateLimit,
  RATE_LIMIT_CONFIGS,
  getRateLimitHeaders
} from '@/lib/utils/rate-limiting';
import { createClient } from '@/lib/supabase/server';
import type { ValidateStoreCodeResponse } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

/**
 * Log validation attempt to database
 */
async function logValidationAttempt(
  storeCode: string,
  success: boolean,
  errorType?: string,
  ipAddress?: string
) {
  try {
    const supabase = await createClient();

    await supabase
      .from('store_code_validations')
      .insert({
        store_code: storeCode,
        success,
        error_type: errorType,
        ip_address: ipAddress,
        attempted_at: new Date().toISOString()
      });
  } catch (error) {
    // Log to console but don't fail the request
    console.error('Failed to log validation attempt:', error);
  }
}

/**
 * POST /api/stores/validate-code - Validate store code and return redirect URL
 */
export async function POST(request: NextRequest): Promise<NextResponse<ValidateStoreCodeResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    const { store_code } = body;

    // Check rate limiting
    const clientIP = extractIPAddress(request.headers);
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIGS.STORE_CODE_VALIDATION);

    if (!rateLimitResult.allowed) {
      await logValidationAttempt(store_code || '', false, 'RATE_LIMITED', clientIP);

      const response = NextResponse.json(
        createRateLimitError(rateLimitResult.retryAfter),
        { status: 429 }
      );

      // Add rate limit headers
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIGS.STORE_CODE_VALIDATION);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // Validate request body
    if (!store_code || typeof store_code !== 'string') {
      await logValidationAttempt('', false, 'INVALID_FORMAT', clientIP);
      return NextResponse.json(
        formatValidationResponse(false, undefined, 'INVALID_FORMAT'),
        { status: 400 }
      );
    }

    // Sanitize and validate format
    const sanitizedCode = sanitizeStoreCode(store_code);

    if (!validateStoreCodeFormat(sanitizedCode)) {
      await logValidationAttempt(sanitizedCode, false, 'INVALID_FORMAT', clientIP);
      return NextResponse.json(
        formatValidationResponse(false, undefined, 'INVALID_FORMAT'),
        { status: 400 }
      );
    }

    // Check if store exists and is active
    const storeInfo = await getStoreByCode(sanitizedCode);

    if (!storeInfo) {
      await logValidationAttempt(sanitizedCode, false, 'NOT_FOUND', clientIP);
      return NextResponse.json(
        formatValidationResponse(false, undefined, 'NOT_FOUND'),
        { status: 404 }
      );
    }

    if (!storeInfo.is_active) {
      await logValidationAttempt(sanitizedCode, false, 'NOT_FOUND', clientIP);
      return NextResponse.json(
        formatValidationResponse(false, undefined, 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Success! Create redirect URL
    const redirectUrl = `https://vocilia.com/feedback/${sanitizedCode}`;

    // Log successful validation
    await logValidationAttempt(sanitizedCode, true, undefined, clientIP);

    return NextResponse.json(
      createSuccessResponse(sanitizedCode),
      { status: 200 }
    );

  } catch (error) {
    console.error('Store code validation error:', error);

    // Log error attempt
    try {
      const body = await request.clone().json();
      const clientIP = extractIPAddress(request.headers);
      await logValidationAttempt(body?.store_code || '', false, 'NETWORK_ERROR', clientIP);
    } catch {
      // Ignore JSON parsing errors for logging
    }

    return NextResponse.json(
      createNetworkError(),
      { status: 500 }
    );
  }
}

/**
 * GET /api/stores/validate-code - Not supported, return method not allowed
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate store codes.' },
    { status: 405 }
  );
}

/**
 * OPTIONS /api/stores/validate-code - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}