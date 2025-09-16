'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeStoreCode } from '@/lib/validation/sanitize-input';
import {
  validateStoreCodeFormat,
  getProgressiveValidationMessage,
  isPotentiallyValidStoreCode
} from '@/lib/validation/validation-logic';

export interface StoreCodeInputProps {
  /** Callback when a valid store code is submitted */
  onSubmit: (storeCode: string) => void;
  /** Whether the input is currently disabled (e.g., during submission) */
  disabled?: boolean;
  /** Whether to show validation errors immediately or only after blur */
  immediateValidation?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to focus the input on mount */
  autoFocus?: boolean;
}

export function StoreCodeInput({
  onSubmit,
  disabled = false,
  immediateValidation = false,
  placeholder = 'Enter 6-digit code',
  className,
  autoFocus = true
}: StoreCodeInputProps) {
  const [value, setValue] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on mount for mobile accessibility
  React.useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const validateInput = React.useCallback((inputValue: string) => {
    if (inputValue.length === 0) {
      return null; // No error for empty input
    }

    // Use progressive validation for better UX
    const progressiveMessage = getProgressiveValidationMessage(inputValue);
    return progressiveMessage;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Sanitize input to only allow digits
    const sanitized = sanitizeStoreCode(rawValue);

    // Limit to 6 digits for better UX
    const limitedValue = sanitized.slice(0, 6);

    setValue(limitedValue);

    // Validate if immediate validation is enabled or if input was touched
    if (immediateValidation || touched) {
      const validationError = validateInput(limitedValue);
      setError(validationError);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const validationError = validateInput(value);
    setError(validationError);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter if valid
    if (e.key === 'Enter' && value.length === 6 && validateStoreCodeFormat(value)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!validateStoreCodeFormat(value) || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(value);
    } catch (error) {
      // Error handling will be done by parent component
      console.error('Store code submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = value.length === 6 && validateStoreCodeFormat(value);
  const showError = touched && error && !isSubmitting;
  const buttonDisabled = disabled || isSubmitting || !isValid;

  // Character indicators for mobile UX
  const renderCharacterIndicators = () => {
    const indicators = [];
    for (let i = 0; i < 6; i++) {
      const hasDigit = i < value.length;
      indicators.push(
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-full border-2 transition-colors',
            hasDigit
              ? 'bg-primary border-primary'
              : 'bg-transparent border-muted-foreground/30'
          )}
        />
      );
    }
    return indicators;
  };

  return (
    <div className={cn('w-full max-w-sm space-y-4', className)}>
      {/* Input with styling optimized for mobile */}
      <div className="space-y-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className={cn(
            'text-center text-2xl font-mono tracking-widest h-14',
            'text-xl sm:text-2xl', // Responsive text size
            showError && 'border-destructive focus-visible:ring-destructive',
            isValid && !showError && 'border-green-500 focus-visible:ring-green-500'
          )}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {/* Character indicators */}
        <div className="flex justify-center space-x-2">
          {renderCharacterIndicators()}
        </div>

        {/* Error message */}
        {showError && (
          <p className="text-sm text-destructive text-center px-2">
            {error}
          </p>
        )}

        {/* Success indicator */}
        {isValid && !showError && (
          <p className="text-sm text-green-600 text-center">
            Ready to submit
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={buttonDisabled}
        className="w-full h-12 text-base font-medium"
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Validating...</span>
          </div>
        ) : (
          'Enter Store'
        )}
      </Button>

      {/* Input helper text */}
      <p className="text-xs text-muted-foreground text-center">
        Enter the 6-digit code from your receipt or the store display
      </p>
    </div>
  );
}

export default StoreCodeInput;