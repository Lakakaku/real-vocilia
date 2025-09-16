'use client';

import { CustomerEntryPage } from '@/components/customer/CustomerEntryPage';
import type { ValidateStoreCodeResponse } from '@/lib/types/database';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

/**
 * Customer landing page - Root page for vocilia.com
 *
 * This is where customers land after scanning QR codes.
 * They enter their 6-digit store code to access the feedback system.
 */
export default function CustomerLandingPage() {
  /**
   * Handle store code validation
   */
  const handleValidateCode = async (storeCode: string): Promise<ValidateStoreCodeResponse> => {
    try {
      const response = await fetch('/api/stores/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_code: storeCode
        })
      });

      const data: ValidateStoreCodeResponse = await response.json();

      // The API returns the appropriate response format
      return data;

    } catch (error) {
      console.error('Network error during validation:', error);

      // Return network error response
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection issue. Please check your internet and try again'
        }
      };
    }
  };

  return (
    <CustomerEntryPage
      onValidateCode={handleValidateCode}
      title="Welcome to Vocilia"
      description="Share your experience and earn cashback"
    />
  );
}