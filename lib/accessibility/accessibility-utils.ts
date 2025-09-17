/**
 * Comprehensive accessibility utilities for verification dashboard
 *
 * Features:
 * - WCAG 2.1 AA compliance utilities
 * - Screen reader support
 * - Keyboard navigation helpers
 * - Color contrast validation
 * - Accessible form components
 * - Focus management
 * - ARIA attribute helpers
 * - Accessibility testing utilities
 */

import { RefObject, useEffect, useRef, useState, useCallback } from 'react'

// WCAG 2.1 AA contrast ratios
export const CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3,
  NON_TEXT: 3
} as const

// Common ARIA roles for verification interface
export const ARIA_ROLES = {
  MAIN: 'main',
  NAVIGATION: 'navigation',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  COMPLEMENTARY: 'complementary',
  REGION: 'region',
  ARTICLE: 'article',
  SECTION: 'section',
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  STATUS: 'status',
  LOG: 'log',
  PROGRESSBAR: 'progressbar',
  TABLIST: 'tablist',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TEXTBOX: 'textbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  COLUMNHEADER: 'columnheader',
  ROWHEADER: 'rowheader'
} as const

// Keyboard navigation keys
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const

/**
 * Calculate color contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1)
  const luminance2 = getRelativeLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background)
  const requiredRatio = isLargeText ? CONTRAST_RATIOS.LARGE_TEXT : CONTRAST_RATIOS.NORMAL_TEXT
  return ratio >= requiredRatio
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color)
  if (!rgb) return 0

  const [r, g, b] = rgb.map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : null
}

/**
 * Generate accessible ARIA attributes for verification components
 */
export function generateAriaAttributes(
  type: 'verification-session' | 'transaction-item' | 'batch-summary' | 'fraud-alert',
  data: Record<string, any>
): Record<string, string> {
  const baseAttributes = {
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }

  switch (type) {
    case 'verification-session':
      return {
        ...baseAttributes,
        'role': ARIA_ROLES.REGION,
        'aria-label': `Verification session ${data.sessionId}`,
        'aria-describedby': `session-${data.sessionId}-description`,
        'aria-expanded': data.isExpanded ? 'true' : 'false'
      }

    case 'transaction-item':
      return {
        ...baseAttributes,
        'role': ARIA_ROLES.GRIDCELL,
        'aria-label': `Transaction ${data.transactionId} - Amount: ${data.amount} - Status: ${data.status}`,
        'aria-describedby': `transaction-${data.transactionId}-details`,
        'aria-selected': data.isSelected ? 'true' : 'false',
        'tabindex': data.isSelected ? '0' : '-1'
      }

    case 'batch-summary':
      return {
        ...baseAttributes,
        'role': ARIA_ROLES.REGION,
        'aria-label': `Batch summary for ${data.businessName}`,
        'aria-describedby': `batch-${data.batchId}-summary`,
        'aria-current': data.isCurrent ? 'true' : 'false'
      }

    case 'fraud-alert':
      return {
        'role': ARIA_ROLES.ALERT,
        'aria-live': 'assertive',
        'aria-atomic': 'true',
        'aria-label': `Fraud alert: ${data.alertType}`,
        'aria-describedby': `alert-${data.alertId}-details`
      }

    default:
      return baseAttributes
  }
}

/**
 * Create accessible keyboard navigation handler
 */
export function createKeyboardNavigationHandler(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
    activateOnFocus?: boolean
    onActivate?: (index: number, item: HTMLElement) => void
  } = {}
) {
  const { orientation = 'vertical', wrap = true, activateOnFocus = false, onActivate } = options

  return (event: KeyboardEvent, currentIndex: number): number | null => {
    const isHorizontal = orientation === 'horizontal'
    const nextKey = isHorizontal ? KEYS.ARROW_RIGHT : KEYS.ARROW_DOWN
    const prevKey = isHorizontal ? KEYS.ARROW_LEFT : KEYS.ARROW_UP

    let newIndex: number | null = null

    switch (event.key) {
      case nextKey:
        event.preventDefault()
        newIndex = currentIndex + 1
        if (newIndex >= items.length) {
          newIndex = wrap ? 0 : items.length - 1
        }
        break

      case prevKey:
        event.preventDefault()
        newIndex = currentIndex - 1
        if (newIndex < 0) {
          newIndex = wrap ? items.length - 1 : 0
        }
        break

      case KEYS.HOME:
        event.preventDefault()
        newIndex = 0
        break

      case KEYS.END:
        event.preventDefault()
        newIndex = items.length - 1
        break

      case KEYS.ENTER:
      case KEYS.SPACE:
        if (activateOnFocus && onActivate) {
          event.preventDefault()
          onActivate(currentIndex, items[currentIndex])
        }
        break
    }

    if (newIndex !== null && newIndex !== currentIndex) {
      items[newIndex]?.focus()
      if (activateOnFocus && onActivate) {
        onActivate(newIndex, items[newIndex])
      }
      return newIndex
    }

    return null
  }
}

/**
 * Hook for managing focus within a component
 */
export function useFocusManagement(
  containerRef: RefObject<HTMLElement>,
  options: {
    autoFocus?: boolean
    restoreFocus?: boolean
    trapFocus?: boolean
  } = {}
) {
  const { autoFocus = false, restoreFocus = false, trapFocus = false } = options
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Store previous focus for restoration
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }

    // Auto focus first focusable element
    if (autoFocus) {
      const firstFocusable = getFocusableElements(container)[0]
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }

    // Setup focus trap
    if (trapFocus) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === KEYS.TAB) {
          handleFocusTrap(event, container)
        }
      }

      container.addEventListener('keydown', handleKeyDown)

      return () => {
        container.removeEventListener('keydown', handleKeyDown)

        // Restore focus when unmounting
        if (restoreFocus && previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }

    return () => {
      // Restore focus when unmounting
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [autoFocus, restoreFocus, trapFocus])

  return {
    focusFirst: () => {
      const container = containerRef.current
      if (!container) return

      const firstFocusable = getFocusableElements(container)[0]
      if (firstFocusable) {
        firstFocusable.focus()
      }
    },
    focusLast: () => {
      const container = containerRef.current
      if (!container) return

      const focusableElements = getFocusableElements(container)
      const lastFocusable = focusableElements[focusableElements.length - 1]
      if (lastFocusable) {
        lastFocusable.focus()
      }
    }
  }
}

/**
 * Hook for managing keyboard navigation in lists/grids
 */
export function useKeyboardNavigation(
  itemsRef: RefObject<HTMLElement[]>,
  options: {
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
    activateOnFocus?: boolean
    onActivate?: (index: number, item: HTMLElement) => void
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const items = itemsRef.current
    if (!items || items.length === 0) return

    const handler = createKeyboardNavigationHandler(items, options)
    const newIndex = handler(event, currentIndex)

    if (newIndex !== null) {
      setCurrentIndex(newIndex)
    }
  }, [currentIndex, itemsRef, options])

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown
  }
}

/**
 * Hook for accessible announcements to screen readers
 */
export function useScreenReaderAnnouncements() {
  const [announcement, setAnnouncement] = useState('')
  const announcementRef = useRef<HTMLDivElement | null>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message)

    // Clear announcement after a short delay to ensure it's announced again if needed
    setTimeout(() => {
      setAnnouncement('')
    }, 1000)
  }, [])

  const AnnouncementRegion = useCallback(() => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  ), [announcement])

  return {
    announce,
    AnnouncementRegion
  }
}

/**
 * Hook for accessible form validation
 */
export function useAccessibleFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((fieldName: string, value: any, validator: (value: any) => string | null) => {
    const error = validator(value)

    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }))

    return !error
  }, [])

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }))
  }, [])

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName]

    return {
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': hasError ? `${fieldName}-error` : undefined,
      onBlur: () => markFieldTouched(fieldName)
    }
  }, [errors, touched, markFieldTouched])

  const getErrorProps = useCallback((fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName]

    return {
      id: `${fieldName}-error`,
      role: 'alert',
      'aria-live': 'polite',
      style: { display: hasError ? 'block' : 'none' }
    }
  }, [errors, touched])

  return {
    errors,
    touched,
    validateField,
    markFieldTouched,
    getFieldProps,
    getErrorProps,
    hasErrors: Object.values(errors).some(error => error),
    clearErrors: () => {
      setErrors({})
      setTouched({})
    }
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ')

  const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]

  return elements.filter(element => {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/**
 * Handle focus trap for modal/dialog components
 */
function handleFocusTrap(event: KeyboardEvent, container: HTMLElement) {
  const focusableElements = getFocusableElements(container)

  if (focusableElements.length === 0) {
    event.preventDefault()
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

/**
 * Accessible button component with proper ARIA attributes
 */
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaPressed,
  className = '',
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaPressed?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  }
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  }

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Skip link component for keyboard navigation
 */
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      {children}
    </a>
  )
}

/**
 * Visually hidden component for screen reader only content
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

/**
 * Accessible progress indicator
 */
export function AccessibleProgress({
  value,
  max = 100,
  label,
  description,
  className = ''
}: {
  value: number
  max?: number
  label: string
  description?: string
  className?: string
}) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-sm text-gray-500">
          {percentage}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        aria-describedby={description ? `${label}-description` : undefined}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {description && (
        <p id={`${label}-description`} className="text-sm text-gray-600 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}