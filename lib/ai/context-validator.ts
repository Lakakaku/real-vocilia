/**
 * Context Validation Framework
 * Validates business context for completeness, consistency, and accuracy
 * against industry standards and fraud detection requirements
 */

import { createClient } from '@/lib/supabase/server'
import type { BusinessType } from '@/types/onboarding'

export interface ValidationRule {
  ruleId: string
  category: string
  field: string
  type: 'required' | 'format' | 'range' | 'consistency' | 'business_logic'
  validator: (value: any, context?: any) => boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  categoryScores: Map<string, number>
}

export interface ValidationError {
  field: string
  category: string
  message: string
  value: any
  rule: string
}

export interface ValidationWarning {
  field: string
  category: string
  message: string
  impact: 'low' | 'medium' | 'high'
}

export interface ValidationSuggestion {
  field: string
  suggestion: string
  priority: number // 1-10
  expectedImpact: string
}

export interface IndustryBenchmark {
  businessType: BusinessType
  category: string
  field: string
  minValue?: number
  maxValue?: number
  expectedFormat?: RegExp
  commonValues?: any[]
}

class ContextValidator {
  private validationRules: Map<BusinessType, ValidationRule[]>
  private industryBenchmarks: Map<string, IndustryBenchmark>

  constructor() {
    this.validationRules = this.initializeValidationRules()
    this.industryBenchmarks = this.initializeIndustryBenchmarks()
  }

  /**
   * Initialize validation rules for each business type
   */
  private initializeValidationRules(): Map<BusinessType, ValidationRule[]> {
    const rules = new Map<BusinessType, ValidationRule[]>()

    // Restaurant validation rules
    rules.set('restaurant', [
      {
        ruleId: 'rest_capacity_required',
        category: 'physical_layout',
        field: 'seating_capacity',
        type: 'required',
        validator: (value) => value != null && value > 0,
        message: 'Seating capacity is required for restaurants',
        severity: 'error'
      },
      {
        ruleId: 'rest_capacity_range',
        category: 'physical_layout',
        field: 'seating_capacity',
        type: 'range',
        validator: (value) => value >= 1 && value <= 1000,
        message: 'Seating capacity should be between 1 and 1000',
        severity: 'warning'
      },
      {
        ruleId: 'rest_hours_required',
        category: 'operational_details',
        field: 'operating_hours',
        type: 'required',
        validator: (value) => value != null && typeof value === 'object',
        message: 'Operating hours are required',
        severity: 'error'
      },
      {
        ruleId: 'rest_menu_required',
        category: 'menu_details',
        field: 'menu_categories',
        type: 'required',
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Menu categories are required for restaurants',
        severity: 'error'
      },
      {
        ruleId: 'rest_price_consistency',
        category: 'menu_details',
        field: 'price_ranges',
        type: 'consistency',
        validator: (value, context) => {
          if (!value || !context?.menu_details?.average_price) return true
          const avg = context.menu_details.average_price
          return value.min <= avg && value.max >= avg
        },
        message: 'Price ranges should be consistent with average price',
        severity: 'warning'
      }
    ])

    // Retail validation rules
    rules.set('retail', [
      {
        ruleId: 'retail_departments_required',
        category: 'store_layout',
        field: 'departments',
        type: 'required',
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Store departments are required',
        severity: 'error'
      },
      {
        ruleId: 'retail_checkout_required',
        category: 'store_layout',
        field: 'checkout_locations',
        type: 'required',
        validator: (value) => value != null && value > 0,
        message: 'Number of checkout locations is required',
        severity: 'error'
      },
      {
        ruleId: 'retail_inventory_categories',
        category: 'inventory',
        field: 'product_categories',
        type: 'required',
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Product categories are required',
        severity: 'error'
      }
    ])

    // Service validation rules (using 'other' for general service businesses)
    rules.set('other', [
      {
        ruleId: 'service_types_required',
        category: 'service_offerings',
        field: 'service_types',
        type: 'required',
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Service types are required',
        severity: 'error'
      },
      {
        ruleId: 'service_pricing_required',
        category: 'service_offerings',
        field: 'pricing_structure',
        type: 'required',
        validator: (value) => value != null,
        message: 'Pricing structure is required',
        severity: 'error'
      },
      {
        ruleId: 'service_appointment_consistency',
        category: 'client_management',
        field: 'appointment_system',
        type: 'consistency',
        validator: (value, context) => {
          if (!value || !context?.service_offerings?.appointment_based) return true
          return context.service_offerings.appointment_based === (value !== 'none')
        },
        message: 'Appointment system should match service type',
        severity: 'warning'
      }
    ])

    // Generic validation rules for all types
    const genericRules: ValidationRule[] = [
      {
        ruleId: 'gen_hours_format',
        category: 'operational_details',
        field: 'operating_hours',
        type: 'format',
        validator: (value) => {
          if (!value) return false
          // Check if hours object has valid day keys
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          return Object.keys(value).every(day => validDays.includes(day.toLowerCase()))
        },
        message: 'Operating hours must use valid day names',
        severity: 'error'
      },
      {
        ruleId: 'gen_phone_format',
        category: 'contact_info',
        field: 'phone_number',
        type: 'format',
        validator: (value) => {
          if (!value) return true // Optional field
          // Swedish phone number format
          return /^(\+46|0)[0-9]{8,9}$/.test(value.replace(/\s/g, ''))
        },
        message: 'Phone number must be in valid Swedish format',
        severity: 'warning'
      },
      {
        ruleId: 'gen_fraud_indicators',
        category: 'fraud_indicators',
        field: 'indicators',
        type: 'business_logic',
        validator: (value) => {
          if (!Array.isArray(value)) return false
          // Each indicator should have description and severity
          return value.every(indicator =>
            indicator.description && indicator.severity
          )
        },
        message: 'Fraud indicators must include description and severity',
        severity: 'warning'
      }
    ]

    // Add generic rules to all business types
    for (const [businessType, specificRules] of rules.entries()) {
      rules.set(businessType, [...specificRules, ...genericRules])
    }

    // Add generic rules for 'other' type
    rules.set('other', genericRules)

    return rules
  }

  /**
   * Initialize industry benchmarks
   */
  private initializeIndustryBenchmarks(): Map<string, IndustryBenchmark> {
    const benchmarks = new Map<string, IndustryBenchmark>()

    // Restaurant benchmarks
    benchmarks.set('restaurant_seating', {
      businessType: 'restaurant',
      category: 'physical_layout',
      field: 'seating_capacity',
      minValue: 10,
      maxValue: 500
    })

    benchmarks.set('restaurant_avg_transaction', {
      businessType: 'restaurant',
      category: 'operational_details',
      field: 'average_transaction',
      minValue: 50,
      maxValue: 500
    })

    // Retail benchmarks
    benchmarks.set('retail_avg_transaction', {
      businessType: 'retail',
      category: 'operational_details',
      field: 'average_transaction',
      minValue: 100,
      maxValue: 1000
    })

    benchmarks.set('retail_departments', {
      businessType: 'retail',
      category: 'store_layout',
      field: 'departments',
      commonValues: ['clothing', 'electronics', 'home', 'food', 'beauty', 'sports']
    })

    // Service benchmarks
    benchmarks.set('service_appointment_duration', {
      businessType: 'service',
      category: 'service_offerings',
      field: 'appointment_duration',
      minValue: 15,
      maxValue: 480 // 8 hours in minutes
    })

    return benchmarks
  }

  /**
   * Validate context against all rules
   */
  async validateContext(
    businessId: string,
    businessType: BusinessType,
    context: any
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []
    const categoryScores = new Map<string, number>()

    // Get validation rules for business type
    const rules = this.validationRules.get(businessType) || this.validationRules.get('other')!

    // Apply each validation rule
    for (const rule of rules) {
      const categoryData = context[rule.category] || {}
      const fieldValue = this.getNestedValue(categoryData, rule.field)

      const isValid = rule.validator(fieldValue, context)

      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push({
            field: rule.field,
            category: rule.category,
            message: rule.message,
            value: fieldValue,
            rule: rule.ruleId
          })
        } else if (rule.severity === 'warning') {
          warnings.push({
            field: rule.field,
            category: rule.category,
            message: rule.message,
            impact: this.assessImpact(rule)
          })
        }
      }

      // Update category score
      this.updateCategoryScore(categoryScores, rule.category, isValid)
    }

    // Check against industry benchmarks
    const benchmarkResults = await this.validateAgainstBenchmarks(
      businessType,
      context
    )
    warnings.push(...benchmarkResults.warnings)
    suggestions.push(...benchmarkResults.suggestions)

    // Check consistency across categories
    const consistencyResults = this.checkCrossFieldConsistency(context, businessType)
    warnings.push(...consistencyResults.warnings)

    // Generate improvement suggestions
    const improvementSuggestions = await this.generateSuggestions(
      context,
      businessType,
      errors,
      warnings
    )
    suggestions.push(...improvementSuggestions)

    // Calculate overall score
    const score = this.calculateValidationScore(errors, warnings, categoryScores)

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions,
      categoryScores
    }
  }

  /**
   * Real-time validation for a single field
   */
  validateField(
    field: string,
    value: any,
    businessType: BusinessType,
    context?: any
  ): {
    isValid: boolean
    error?: string
    warning?: string
  } {
    const rules = this.validationRules.get(businessType) || []

    for (const rule of rules) {
      if (rule.field === field) {
        const isValid = rule.validator(value, context)

        if (!isValid) {
          if (rule.severity === 'error') {
            return { isValid: false, error: rule.message }
          } else if (rule.severity === 'warning') {
            return { isValid: true, warning: rule.message }
          }
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate against industry benchmarks
   */
  private async validateAgainstBenchmarks(
    businessType: BusinessType,
    context: any
  ): Promise<{
    warnings: ValidationWarning[]
    suggestions: ValidationSuggestion[]
  }> {
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    for (const [key, benchmark] of this.industryBenchmarks.entries()) {
      if (benchmark.businessType !== businessType) continue

      const categoryData = context[benchmark.category] || {}
      const fieldValue = this.getNestedValue(categoryData, benchmark.field)

      if (fieldValue == null) continue

      // Check against min/max values
      if (benchmark.minValue != null && fieldValue < benchmark.minValue) {
        warnings.push({
          field: benchmark.field,
          category: benchmark.category,
          message: `${benchmark.field} is below industry average (${benchmark.minValue})`,
          impact: 'medium'
        })
      }

      if (benchmark.maxValue != null && fieldValue > benchmark.maxValue) {
        warnings.push({
          field: benchmark.field,
          category: benchmark.category,
          message: `${benchmark.field} is above industry average (${benchmark.maxValue})`,
          impact: 'low'
        })
      }

      // Check against common values
      if (benchmark.commonValues && Array.isArray(fieldValue)) {
        const uncommon = fieldValue.filter(v =>
          !benchmark.commonValues!.includes(v)
        )

        if (uncommon.length > 0) {
          suggestions.push({
            field: benchmark.field,
            suggestion: `Consider standard categories: ${benchmark.commonValues.join(', ')}`,
            priority: 3,
            expectedImpact: 'Better fraud detection accuracy'
          })
        }
      }
    }

    return { warnings, suggestions }
  }

  /**
   * Check cross-field consistency
   */
  private checkCrossFieldConsistency(
    context: any,
    businessType: BusinessType
  ): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = []

    // Check operating hours vs peak hours consistency
    if (context.operational_details?.operating_hours && context.operational_details?.peak_hours) {
      const peakHours = context.operational_details.peak_hours

      // Validate peak hours are within operating hours
      for (const peakPeriod of peakHours || []) {
        // Add validation logic here
      }
    }

    // Check staff count vs capacity (for restaurants)
    if (businessType === 'restaurant') {
      const capacity = context.physical_layout?.seating_capacity
      const staffCount = context.staff_info?.total_staff

      if (capacity && staffCount) {
        const ratio = capacity / staffCount

        if (ratio > 20) {
          warnings.push({
            field: 'staff_info.total_staff',
            category: 'staff_info',
            message: 'Staff count seems low for seating capacity',
            impact: 'medium'
          })
        }
      }
    }

    // Check transaction amount vs business type
    if (context.operational_details?.average_transaction) {
      const avgTransaction = context.operational_details.average_transaction
      const expectedRange = this.getExpectedTransactionRange(businessType)

      if (avgTransaction < expectedRange.min || avgTransaction > expectedRange.max) {
        warnings.push({
          field: 'operational_details.average_transaction',
          category: 'operational_details',
          message: `Average transaction outside typical range for ${businessType}`,
          impact: 'low'
        })
      }
    }

    return { warnings }
  }

  /**
   * Generate improvement suggestions
   */
  private async generateSuggestions(
    context: any,
    businessType: BusinessType,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = []

    // Suggest fixes for errors first
    for (const error of errors) {
      suggestions.push({
        field: error.field,
        suggestion: `Fix: ${error.message}`,
        priority: 10,
        expectedImpact: 'Required for context validation'
      })
    }

    // Suggest improvements for warnings
    for (const warning of warnings) {
      if (warning.impact === 'high') {
        suggestions.push({
          field: warning.field,
          suggestion: `Improve: ${warning.message}`,
          priority: 7,
          expectedImpact: 'Significant improvement in fraud detection'
        })
      }
    }

    // Suggest missing important fields
    const importantFields = this.getImportantFields(businessType)
    for (const field of importantFields) {
      const [category, fieldName] = field.split('.')
      const categoryData = context[category] || {}
      const value = this.getNestedValue(categoryData, fieldName)

      if (!value) {
        suggestions.push({
          field: fieldName,
          suggestion: `Add ${fieldName.replace(/_/g, ' ')} to improve accuracy`,
          priority: 5,
          expectedImpact: 'Better context completeness'
        })
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority)

    return suggestions.slice(0, 10) // Return top 10 suggestions
  }

  /**
   * Calculate validation score
   */
  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    categoryScores: Map<string, number>
  ): number {
    // Start with 100 and deduct points
    let score = 100

    // Deduct for errors (10 points each)
    score -= errors.length * 10

    // Deduct for warnings based on impact
    for (const warning of warnings) {
      if (warning.impact === 'high') score -= 5
      else if (warning.impact === 'medium') score -= 3
      else score -= 1
    }

    // Factor in category scores
    if (categoryScores.size > 0) {
      const avgCategoryScore = Array.from(categoryScores.values())
        .reduce((a, b) => a + b, 0) / categoryScores.size

      score = (score * 0.7) + (avgCategoryScore * 0.3)
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.')
    let current = obj

    for (const part of parts) {
      if (current == null) return null
      current = current[part]
    }

    return current
  }

  /**
   * Update category score
   */
  private updateCategoryScore(
    scores: Map<string, number>,
    category: string,
    isValid: boolean
  ): void {
    const current = scores.get(category) || { valid: 0, total: 0 }
    const valid = isValid ? current.valid + 1 : current.valid
    const total = current.total + 1

    scores.set(category, (valid / total) * 100)
  }

  /**
   * Assess impact of validation issue
   */
  private assessImpact(rule: ValidationRule): 'low' | 'medium' | 'high' {
    if (rule.type === 'required') return 'high'
    if (rule.type === 'consistency') return 'medium'
    if (rule.type === 'format') return 'low'
    return 'low'
  }

  /**
   * Get expected transaction range for business type
   */
  private getExpectedTransactionRange(businessType: BusinessType): {
    min: number
    max: number
  } {
    const ranges: Record<BusinessType, { min: number; max: number }> = {
      restaurant: { min: 50, max: 500 },
      retail: { min: 100, max: 1000 },
      service: { min: 200, max: 2000 },
      other: { min: 50, max: 1000 }
    }

    return ranges[businessType] || ranges.other
  }

  /**
   * Get important fields for business type
   */
  private getImportantFields(businessType: BusinessType): string[] {
    const fields: Record<BusinessType, string[]> = {
      restaurant: [
        'physical_layout.seating_capacity',
        'menu_details.menu_categories',
        'operational_details.peak_hours',
        'staff_info.total_staff',
        'fraud_indicators.indicators'
      ],
      retail: [
        'store_layout.departments',
        'inventory.product_categories',
        'operational_details.peak_shopping_times',
        'fraud_indicators.indicators'
      ],
      service: [
        'service_offerings.service_types',
        'service_offerings.pricing_structure',
        'client_management.appointment_system',
        'fraud_indicators.indicators'
      ],
      other: [
        'operational_details.operating_hours',
        'operational_details.average_transaction',
        'fraud_indicators.indicators'
      ]
    }

    return fields[businessType] || fields.other
  }

  /**
   * Validate fraud indicators
   */
  validateFraudIndicators(indicators: any[]): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    if (!Array.isArray(indicators) || indicators.length === 0) {
      issues.push('No fraud indicators defined')
      return { isValid: false, issues }
    }

    for (const indicator of indicators) {
      if (!indicator.description) {
        issues.push('Fraud indicator missing description')
      }

      if (!indicator.severity || !['low', 'medium', 'high', 'critical'].includes(indicator.severity)) {
        issues.push('Fraud indicator has invalid severity level')
      }

      if (!indicator.pattern && !indicator.condition) {
        issues.push('Fraud indicator missing detection pattern or condition')
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}

// Export singleton instance
export const contextValidator = new ContextValidator()

// Export types and class
export default ContextValidator