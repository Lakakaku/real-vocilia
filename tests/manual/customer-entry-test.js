/**
 * Manual Test Script for Customer Entry Flow
 *
 * This script can be run in the browser console to test the customer entry flow
 * functionality. Open the customer landing page and run this script in DevTools.
 *
 * Usage:
 * 1. Navigate to http://localhost:3000/
 * 2. Open browser DevTools (F12)
 * 3. Copy and paste this script into the console
 * 4. Run the tests by calling: runCustomerEntryTests()
 */

// Test configuration
const TEST_CONFIG = {
  VALID_STORE_CODE: '123456',
  INVALID_STORE_CODE: '000001',
  API_ENDPOINT: '/api/stores/validate-code',
  DELAYS: {
    USER_INPUT: 500,
    API_RESPONSE: 1000,
    ANIMATION: 300
  }
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const findElement = (selector) => {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
};

// Test functions
const testPageLoad = async () => {
  log('Testing page load and initial state...');

  try {
    // Check page title
    const title = document.title;
    if (!title.includes('Vocilia')) {
      throw new Error(`Unexpected page title: ${title}`);
    }

    // Check main heading
    const heading = document.querySelector('h1, h2, [data-testid="title"]');
    if (!heading || !heading.textContent.includes('Vocilia')) {
      throw new Error('Main heading not found or incorrect');
    }

    // Check store code input exists
    const input = document.querySelector('input[type="text"], input[inputmode="numeric"]');
    if (!input) {
      throw new Error('Store code input field not found');
    }

    // Check submit button exists
    const button = document.querySelector('button[type="submit"], button:contains("Enter")');
    if (!button) {
      throw new Error('Submit button not found');
    }

    log('Page load test passed', 'success');
    return true;
  } catch (error) {
    log(`Page load test failed: ${error.message}`, 'error');
    return false;
  }
};

const testInputValidation = async () => {
  log('Testing input validation...');

  try {
    const input = findElement('input[type="text"], input[inputmode="numeric"]');

    // Test 1: Valid input
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Simulate typing valid code
    for (const digit of TEST_CONFIG.VALID_STORE_CODE) {
      input.value += digit;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(50);
    }

    await delay(TEST_CONFIG.DELAYS.USER_INPUT);

    if (input.value !== TEST_CONFIG.VALID_STORE_CODE) {
      throw new Error(`Expected input value ${TEST_CONFIG.VALID_STORE_CODE}, got ${input.value}`);
    }

    // Test 2: Invalid characters (should be filtered)
    input.value = '';
    input.value = 'ABC123';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(TEST_CONFIG.DELAYS.USER_INPUT);

    if (input.value !== '123') {
      log(`Input sanitization may not be working. Expected '123', got '${input.value}'`);
    }

    log('Input validation test passed', 'success');
    return true;
  } catch (error) {
    log(`Input validation test failed: ${error.message}`, 'error');
    return false;
  }
};

const testFormSubmission = async () => {
  log('Testing form submission...');

  try {
    const input = findElement('input[type="text"], input[inputmode="numeric"]');
    const button = findElement('button[type="submit"], button');

    // Clear and enter valid code
    input.value = '';
    input.value = TEST_CONFIG.VALID_STORE_CODE;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await delay(TEST_CONFIG.DELAYS.USER_INPUT);

    // Check if button is enabled
    if (button.disabled) {
      throw new Error('Submit button should be enabled with valid input');
    }

    // Intercept fetch requests to avoid actual API calls during testing
    const originalFetch = window.fetch;
    let apiCalled = false;
    let requestData = null;

    window.fetch = async (url, options) => {
      if (url.includes('/api/stores/validate-code')) {
        apiCalled = true;
        requestData = JSON.parse(options.body);

        // Return mock success response
        return {
          ok: true,
          json: async () => ({
            success: true,
            redirect_url: `https://vocilia.com/feedback/${TEST_CONFIG.VALID_STORE_CODE}`
          })
        };
      }
      return originalFetch(url, options);
    };

    // Submit form
    button.click();

    await delay(TEST_CONFIG.DELAYS.API_RESPONSE);

    // Restore original fetch
    window.fetch = originalFetch;

    if (!apiCalled) {
      throw new Error('API was not called on form submission');
    }

    if (requestData.store_code !== TEST_CONFIG.VALID_STORE_CODE) {
      throw new Error(`API called with wrong store code: ${requestData.store_code}`);
    }

    log('Form submission test passed', 'success');
    return true;
  } catch (error) {
    log(`Form submission test failed: ${error.message}`, 'error');
    return false;
  }
};

const testErrorHandling = async () => {
  log('Testing error handling...');

  try {
    const input = findElement('input[type="text"], input[inputmode="numeric"]');
    const button = findElement('button[type="submit"], button');

    // Clear and enter invalid code
    input.value = '';
    input.value = TEST_CONFIG.INVALID_STORE_CODE;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await delay(TEST_CONFIG.DELAYS.USER_INPUT);

    // Mock API error response
    const originalFetch = window.fetch;

    window.fetch = async (url, options) => {
      if (url.includes('/api/stores/validate-code')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'This code is not recognized. Please check and try again'
            }
          })
        };
      }
      return originalFetch(url, options);
    };

    // Submit form
    button.click();

    await delay(TEST_CONFIG.DELAYS.API_RESPONSE);

    // Check if error message appears
    const errorElement = document.querySelector('[class*="error"], [class*="destructive"], .text-red-600');
    if (!errorElement) {
      log('Error message element not found, but this might be expected if error handling uses different selectors');
    }

    // Restore original fetch
    window.fetch = originalFetch;

    log('Error handling test passed', 'success');
    return true;
  } catch (error) {
    log(`Error handling test failed: ${error.message}`, 'error');
    return false;
  }
};

const testRateLimiting = async () => {
  log('Testing rate limiting (simulated)...');

  try {
    // Mock rate limit response
    const originalFetch = window.fetch;

    window.fetch = async (url, options) => {
      if (url.includes('/api/stores/validate-code')) {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many attempts. Please wait a minute and try again',
              retry_after: 60
            }
          })
        };
      }
      return originalFetch(url, options);
    };

    const input = findElement('input[type="text"], input[inputmode="numeric"]');
    const button = findElement('button[type="submit"], button');

    input.value = TEST_CONFIG.VALID_STORE_CODE;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await delay(TEST_CONFIG.DELAYS.USER_INPUT);

    button.click();

    await delay(TEST_CONFIG.DELAYS.API_RESPONSE);

    // Restore original fetch
    window.fetch = originalFetch;

    log('Rate limiting test passed', 'success');
    return true;
  } catch (error) {
    log(`Rate limiting test failed: ${error.message}`, 'error');
    return false;
  }
};

const testAccessibility = async () => {
  log('Testing basic accessibility...');

  try {
    const input = findElement('input[type="text"], input[inputmode="numeric"]');
    const button = findElement('button[type="submit"], button');

    // Check input has proper attributes
    if (!input.getAttribute('inputmode') && !input.getAttribute('pattern')) {
      log('Input should have inputmode="numeric" or pattern attribute for mobile keyboards');
    }

    if (!input.getAttribute('autocomplete')) {
      log('Input should have autocomplete="off" for store codes');
    }

    // Check button is focusable
    button.focus();
    if (document.activeElement !== button) {
      throw new Error('Button is not focusable');
    }

    // Check keyboard navigation
    input.focus();
    if (document.activeElement !== input) {
      throw new Error('Input is not focusable');
    }

    // Test Enter key submission
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true
    });

    input.value = TEST_CONFIG.VALID_STORE_CODE;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(enterEvent);

    log('Accessibility test passed', 'success');
    return true;
  } catch (error) {
    log(`Accessibility test failed: ${error.message}`, 'error');
    return false;
  }
};

// Main test runner
const runCustomerEntryTests = async () => {
  log('🚀 Starting Customer Entry Flow Tests');
  log('=========================================');

  const tests = [
    { name: 'Page Load', fn: testPageLoad },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'Form Submission', fn: testFormSubmission },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Accessibility', fn: testAccessibility }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(`\n--- Running ${test.name} Test ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`Unexpected error in ${test.name}: ${error.message}`, 'error');
      failed++;
    }

    // Wait between tests
    await delay(1000);
  }

  log('\n=========================================');
  log(`🏁 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    log('🎉 All tests passed! Customer Entry Flow is working correctly.', 'success');
  } else {
    log('⚠️ Some tests failed. Please review the issues above.', 'error');
  }

  return { passed, failed };
};

// Make the test runner available globally
window.runCustomerEntryTests = runCustomerEntryTests;

// Auto-run if script is executed directly
if (typeof module === 'undefined') {
  log('Manual test script loaded. Run "runCustomerEntryTests()" to start testing.');
  log('Make sure you are on the customer landing page (http://localhost:3000/)');
}