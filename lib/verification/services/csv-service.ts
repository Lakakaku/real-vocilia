/**
 * CSV Processing Service for Batch Generation and Parsing
 *
 * Handles CSV file upload, validation, parsing, and generation for
 * payment verification workflows with comprehensive error handling.
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

// CSV row interfaces
export interface TransactionCSVRow {
  transaction_id: string
  customer_feedback_id: string
  transaction_date: string
  amount_sek: number
  phone_last4: string
  store_code: string
  quality_score: number
  reward_percentage: number
  reward_amount_sek: number
}

export interface VerificationResultCSVRow {
  transaction_id: string
  verified: boolean
  verification_decision: 'approved' | 'rejected' | 'pending'
  rejection_reason?: string
  business_notes?: string
  verification_time_seconds?: number
  reviewer_id?: string
}

export interface CSVValidationError {
  row: number
  field: string
  value: any
  message: string
  severity: 'error' | 'warning'
}

export interface CSVValidationResult {
  valid: boolean
  total_rows: number
  valid_rows: number
  invalid_rows: number
  errors: CSVValidationError[]
  warnings: CSVValidationError[]
  data?: any[]
  summary: {
    duplicate_transaction_ids: string[]
    amount_anomalies: Array<{ row: number; amount: number; reason: string }>
    date_range: { earliest: string; latest: string } | null
    total_amount: number
    average_amount: number
  }
}

// CSV parsing configuration
export interface CSVParseOptions {
  delimiter?: string
  quote?: string
  escape?: string
  skipEmptyLines?: boolean
  skipLinesWithError?: boolean
  maxRows?: number
  encoding?: 'utf8' | 'latin1'
}

// CSV generation options
export interface CSVGenerateOptions {
  delimiter?: string
  quote?: string
  includeHeader?: boolean
  dateFormat?: 'iso' | 'european' | 'us'
  numberFormat?: 'decimal' | 'comma'
}

// Validation schemas
const TransactionCSVRowSchema = z.object({
  transaction_id: z.string()
    .min(1, 'Transaction ID cannot be empty')
    .max(50, 'Transaction ID too long')
    .regex(/^[A-Z0-9-]+$/, 'Transaction ID must contain only uppercase letters, numbers, and hyphens'),
  customer_feedback_id: z.string()
    .min(1, 'Customer feedback ID cannot be empty')
    .max(50, 'Customer feedback ID too long'),
  transaction_date: z.string()
    .datetime('Invalid transaction date format (ISO 8601 required)'),
  amount_sek: z.number()
    .min(0.01, 'Amount must be at least 0.01 SEK')
    .max(100000, 'Amount cannot exceed 100,000 SEK')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  phone_last4: z.string()
    .regex(/^\*\*\d{2}$/, 'Phone last 4 must be in format **XX'),
  store_code: z.string()
    .length(6, 'Store code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Store code must contain only uppercase letters and numbers'),
  quality_score: z.number()
    .int('Quality score must be an integer')
    .min(0, 'Quality score cannot be negative')
    .max(100, 'Quality score cannot exceed 100'),
  reward_percentage: z.number()
    .min(0, 'Reward percentage cannot be negative')
    .max(15, 'Reward percentage cannot exceed 15%')
    .multipleOf(0.01, 'Reward percentage must have at most 2 decimal places'),
  reward_amount_sek: z.number()
    .min(0, 'Reward amount cannot be negative')
    .max(15000, 'Reward amount cannot exceed 15,000 SEK')
    .multipleOf(0.01, 'Reward amount must have at most 2 decimal places'),
})

const VerificationResultCSVRowSchema = z.object({
  transaction_id: z.string()
    .min(1, 'Transaction ID cannot be empty')
    .max(50, 'Transaction ID too long'),
  verified: z.boolean('Verified must be true or false'),
  verification_decision: z.enum(['approved', 'rejected', 'pending'], {
    errorMap: () => ({ message: 'Decision must be approved, rejected, or pending' })
  }),
  rejection_reason: z.enum([
    'amount_mismatch',
    'customer_dispute',
    'invalid_transaction',
    'duplicate_transaction',
    'missing_documentation',
    'quality_threshold_not_met',
    'fraud_suspected',
    'technical_error',
    'policy_violation',
    'other'
  ]).optional(),
  business_notes: z.string()
    .max(1000, 'Business notes cannot exceed 1000 characters')
    .optional(),
  verification_time_seconds: z.number()
    .int('Verification time must be an integer')
    .min(1, 'Verification time must be at least 1 second')
    .max(7200, 'Verification time cannot exceed 2 hours')
    .optional(),
  reviewer_id: z.string()
    .uuid('Invalid reviewer ID format')
    .optional(),
})

export class CSVProcessingService {
  private supabase = createClient()

  /**
   * Parses and validates transaction CSV data
   */
  async parseTransactionCSV(
    csvContent: string,
    options: CSVParseOptions = {}
  ): Promise<CSVValidationResult> {
    const parseOptions = {
      delimiter: ',',
      quote: '"',
      skipEmptyLines: true,
      maxRows: 10000,
      encoding: 'utf8' as const,
      ...options,
    }

    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length === 0) {
        return this.createValidationResult(false, 0, [], 'CSV file is empty')
      }

      // Parse header
      const headerLine = lines[0]
      const headers = this.parseCSVLine(headerLine, parseOptions.delimiter, parseOptions.quote)

      const expectedHeaders = [
        'transaction_id',
        'customer_feedback_id',
        'transaction_date',
        'amount_sek',
        'phone_last4',
        'store_code',
        'quality_score',
        'reward_percentage',
        'reward_amount_sek'
      ]

      // Validate headers
      const headerValidation = this.validateHeaders(headers, expectedHeaders)
      if (!headerValidation.valid) {
        return this.createValidationResult(false, 0, [], 'Invalid CSV headers', headerValidation.errors)
      }

      // Parse data rows
      const dataLines = lines.slice(1).slice(0, parseOptions.maxRows || 10000)
      const validationResult = await this.validateTransactionRows(dataLines, headers, parseOptions)

      return validationResult

    } catch (error) {
      return this.createValidationResult(false, 0, [], `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parses and validates verification result CSV data
   */
  async parseVerificationResultCSV(
    csvContent: string,
    options: CSVParseOptions = {}
  ): Promise<CSVValidationResult> {
    const parseOptions = {
      delimiter: ',',
      quote: '"',
      skipEmptyLines: true,
      maxRows: 10000,
      encoding: 'utf8' as const,
      ...options,
    }

    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length === 0) {
        return this.createValidationResult(false, 0, [], 'CSV file is empty')
      }

      const headerLine = lines[0]
      const headers = this.parseCSVLine(headerLine, parseOptions.delimiter, parseOptions.quote)

      const expectedHeaders = [
        'transaction_id',
        'verified',
        'verification_decision',
        'rejection_reason',
        'business_notes',
        'verification_time_seconds',
        'reviewer_id'
      ]

      const headerValidation = this.validateHeaders(headers, expectedHeaders.slice(0, 3)) // First 3 are required
      if (!headerValidation.valid) {
        return this.createValidationResult(false, 0, [], 'Invalid CSV headers', headerValidation.errors)
      }

      const dataLines = lines.slice(1).slice(0, parseOptions.maxRows || 10000)
      const validationResult = await this.validateVerificationResultRows(dataLines, headers, parseOptions)

      return validationResult

    } catch (error) {
      return this.createValidationResult(false, 0, [], `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generates CSV content from transaction data
   */
  generateTransactionCSV(
    transactions: TransactionCSVRow[],
    options: CSVGenerateOptions = {}
  ): string {
    const genOptions = {
      delimiter: ',',
      quote: '"',
      includeHeader: true,
      dateFormat: 'iso' as const,
      numberFormat: 'decimal' as const,
      ...options,
    }

    const headers = [
      'transaction_id',
      'customer_feedback_id',
      'transaction_date',
      'amount_sek',
      'phone_last4',
      'store_code',
      'quality_score',
      'reward_percentage',
      'reward_amount_sek'
    ]

    let csvContent = ''

    if (genOptions.includeHeader) {
      csvContent += this.formatCSVLine(headers, genOptions.delimiter, genOptions.quote) + '\n'
    }

    transactions.forEach(transaction => {
      const row = [
        transaction.transaction_id,
        transaction.customer_feedback_id,
        this.formatDate(transaction.transaction_date, genOptions.dateFormat),
        this.formatNumber(transaction.amount_sek, genOptions.numberFormat),
        transaction.phone_last4,
        transaction.store_code,
        transaction.quality_score.toString(),
        this.formatNumber(transaction.reward_percentage, genOptions.numberFormat),
        this.formatNumber(transaction.reward_amount_sek, genOptions.numberFormat),
      ]

      csvContent += this.formatCSVLine(row, genOptions.delimiter, genOptions.quote) + '\n'
    })

    return csvContent.trim()
  }

  /**
   * Generates CSV content from verification results
   */
  generateVerificationResultCSV(
    results: VerificationResultCSVRow[],
    options: CSVGenerateOptions = {}
  ): string {
    const genOptions = {
      delimiter: ',',
      quote: '"',
      includeHeader: true,
      ...options,
    }

    const headers = [
      'transaction_id',
      'verified',
      'verification_decision',
      'rejection_reason',
      'business_notes',
      'verification_time_seconds',
      'reviewer_id'
    ]

    let csvContent = ''

    if (genOptions.includeHeader) {
      csvContent += this.formatCSVLine(headers, genOptions.delimiter, genOptions.quote) + '\n'
    }

    results.forEach(result => {
      const row = [
        result.transaction_id,
        result.verified.toString(),
        result.verification_decision,
        result.rejection_reason || '',
        result.business_notes || '',
        result.verification_time_seconds?.toString() || '',
        result.reviewer_id || '',
      ]

      csvContent += this.formatCSVLine(row, genOptions.delimiter, genOptions.quote) + '\n'
    })

    return csvContent.trim()
  }

  /**
   * Validates business-specific rules for transactions
   */
  async validateBusinessRules(
    transactions: TransactionCSVRow[],
    businessId: string
  ): Promise<{
    valid: boolean
    errors: CSVValidationError[]
    warnings: CSVValidationError[]
  }> {
    const errors: CSVValidationError[] = []
    const warnings: CSVValidationError[] = []

    // Get business's store codes
    const { data: storeCodes } = await this.supabase
      .from('businesses')
      .select('store_codes')
      .eq('id', businessId)
      .single()

    const validStoreCodes = storeCodes?.store_codes || []

    transactions.forEach((transaction, index) => {
      const rowNumber = index + 2 // +2 for header and 0-based index

      // Validate store code ownership
      if (!validStoreCodes.includes(transaction.store_code)) {
        errors.push({
          row: rowNumber,
          field: 'store_code',
          value: transaction.store_code,
          message: `Store code ${transaction.store_code} is not owned by this business`,
          severity: 'error',
        })
      }

      // Validate reward calculation
      const expectedReward = (transaction.amount_sek * transaction.reward_percentage) / 100
      const tolerance = 0.01
      if (Math.abs(transaction.reward_amount_sek - expectedReward) > tolerance) {
        warnings.push({
          row: rowNumber,
          field: 'reward_amount_sek',
          value: transaction.reward_amount_sek,
          message: `Reward amount ${transaction.reward_amount_sek} doesn't match calculated amount ${expectedReward.toFixed(2)}`,
          severity: 'warning',
        })
      }

      // Validate transaction date (not in future)
      const transactionDate = new Date(transaction.transaction_date)
      const now = new Date()
      if (transactionDate > now) {
        warnings.push({
          row: rowNumber,
          field: 'transaction_date',
          value: transaction.transaction_date,
          message: 'Transaction date is in the future',
          severity: 'warning',
        })
      }

      // Validate date not too old (more than 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      if (transactionDate < sixMonthsAgo) {
        warnings.push({
          row: rowNumber,
          field: 'transaction_date',
          value: transaction.transaction_date,
          message: 'Transaction date is more than 6 months old',
          severity: 'warning',
        })
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Detects duplicate transactions across multiple uploads
   */
  async detectDuplicateTransactions(
    transactions: TransactionCSVRow[],
    businessId: string
  ): Promise<{
    duplicates: Array<{
      transaction_id: string
      existing_batch_id?: string
      duplicate_rows: number[]
    }>
    warnings: CSVValidationError[]
  }> {
    const warnings: CSVValidationError[] = []
    const duplicates: any[] = []

    // Check for duplicates within the current CSV
    const transactionIds = new Map<string, number[]>()
    transactions.forEach((transaction, index) => {
      if (!transactionIds.has(transaction.transaction_id)) {
        transactionIds.set(transaction.transaction_id, [])
      }
      transactionIds.get(transaction.transaction_id)!.push(index + 2) // +2 for header and 0-based index
    })

    transactionIds.forEach((rows, transactionId) => {
      if (rows.length > 1) {
        duplicates.push({
          transaction_id: transactionId,
          duplicate_rows: rows,
        })

        rows.forEach(row => {
          warnings.push({
            row,
            field: 'transaction_id',
            value: transactionId,
            message: `Duplicate transaction ID ${transactionId} found in rows ${rows.join(', ')}`,
            severity: 'warning',
          })
        })
      }
    })

    // Check for duplicates in existing batches
    if (transactions.length > 0) {
      const transactionIdList = transactions.map(t => t.transaction_id)
      const { data: existingTransactions } = await this.supabase
        .from('verification_results')
        .select('transaction_id, verification_sessions!inner(payment_batches!inner(id, business_id))')
        .in('transaction_id', transactionIdList)
        .eq('verification_sessions.payment_batches.business_id', businessId)

      existingTransactions?.forEach(existing => {
        const duplicateRows = transactions
          .map((t, index) => t.transaction_id === existing.transaction_id ? index + 2 : -1)
          .filter(row => row !== -1)

        if (duplicateRows.length > 0) {
          duplicates.push({
            transaction_id: existing.transaction_id,
            existing_batch_id: (existing as any).verification_sessions.payment_batches.id,
            duplicate_rows: duplicateRows,
          })

          duplicateRows.forEach(row => {
            warnings.push({
              row,
              field: 'transaction_id',
              value: existing.transaction_id,
              message: `Transaction ID ${existing.transaction_id} already exists in a previous batch`,
              severity: 'warning',
            })
          })
        }
      })
    }

    return { duplicates, warnings }
  }

  // Private helper methods

  private parseCSVLine(line: string, delimiter: string, quote: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === quote) {
        if (inQuotes && nextChar === quote) {
          // Escaped quote
          current += quote
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === delimiter && !inQuotes) {
        // Field delimiter
        result.push(current.trim())
        current = ''
        i++
      } else {
        // Regular character
        current += char
        i++
      }
    }

    // Add the last field
    result.push(current.trim())

    return result
  }

  private formatCSVLine(fields: string[], delimiter: string, quote: string): string {
    return fields.map(field => {
      const fieldStr = String(field)
      if (fieldStr.includes(delimiter) || fieldStr.includes(quote) || fieldStr.includes('\n')) {
        // Escape quotes and wrap in quotes
        const escaped = fieldStr.replace(new RegExp(quote, 'g'), quote + quote)
        return quote + escaped + quote
      }
      return fieldStr
    }).join(delimiter)
  }

  private validateHeaders(headers: string[], expected: string[]): {
    valid: boolean
    errors: CSVValidationError[]
  } {
    const errors: CSVValidationError[] = []

    expected.forEach((expectedHeader, index) => {
      if (!headers.includes(expectedHeader)) {
        errors.push({
          row: 1,
          field: 'header',
          value: headers.join(','),
          message: `Missing required header: ${expectedHeader}`,
          severity: 'error',
        })
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private async validateTransactionRows(
    lines: string[],
    headers: string[],
    options: CSVParseOptions
  ): Promise<CSVValidationResult> {
    const validData: TransactionCSVRow[] = []
    const errors: CSVValidationError[] = []
    const warnings: CSVValidationError[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line && options.skipEmptyLines) continue

      const rowNumber = i + 2 // +2 for header and 0-based index
      const fields = this.parseCSVLine(line, options.delimiter || ',', options.quote || '"')

      if (fields.length !== headers.length) {
        errors.push({
          row: rowNumber,
          field: 'row',
          value: line,
          message: `Expected ${headers.length} fields, got ${fields.length}`,
          severity: 'error',
        })
        continue
      }

      // Create row object
      const rowData: any = {}
      headers.forEach((header, index) => {
        rowData[header] = fields[index]
      })

      // Convert numeric fields
      try {
        rowData.amount_sek = parseFloat(rowData.amount_sek)
        rowData.quality_score = parseInt(rowData.quality_score)
        rowData.reward_percentage = parseFloat(rowData.reward_percentage)
        rowData.reward_amount_sek = parseFloat(rowData.reward_amount_sek)
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: 'numeric_conversion',
          value: line,
          message: 'Failed to convert numeric fields',
          severity: 'error',
        })
        continue
      }

      // Validate row schema
      const validation = TransactionCSVRowSchema.safeParse(rowData)
      if (!validation.success) {
        validation.error.errors.forEach(error => {
          errors.push({
            row: rowNumber,
            field: error.path.join('.'),
            value: error.input,
            message: error.message,
            severity: 'error',
          })
        })
      } else {
        validData.push(validation.data)
      }
    }

    // Calculate summary statistics
    const transactionIds = validData.map(t => t.transaction_id)
    const duplicateIds = transactionIds.filter((id, index) => transactionIds.indexOf(id) !== index)
    const amounts = validData.map(t => t.amount_sek)
    const dates = validData.map(t => t.transaction_date).sort()

    return {
      valid: errors.length === 0,
      total_rows: lines.length,
      valid_rows: validData.length,
      invalid_rows: lines.length - validData.length,
      errors,
      warnings,
      data: validData,
      summary: {
        duplicate_transaction_ids: [...new Set(duplicateIds)],
        amount_anomalies: this.detectAmountAnomalies(validData),
        date_range: dates.length > 0 ? { earliest: dates[0], latest: dates[dates.length - 1] } : null,
        total_amount: amounts.reduce((sum, amount) => sum + amount, 0),
        average_amount: amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0,
      },
    }
  }

  private async validateVerificationResultRows(
    lines: string[],
    headers: string[],
    options: CSVParseOptions
  ): Promise<CSVValidationResult> {
    const validData: VerificationResultCSVRow[] = []
    const errors: CSVValidationError[] = []
    const warnings: CSVValidationError[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line && options.skipEmptyLines) continue

      const rowNumber = i + 2
      const fields = this.parseCSVLine(line, options.delimiter || ',', options.quote || '"')

      if (fields.length !== headers.length) {
        errors.push({
          row: rowNumber,
          field: 'row',
          value: line,
          message: `Expected ${headers.length} fields, got ${fields.length}`,
          severity: 'error',
        })
        continue
      }

      const rowData: any = {}
      headers.forEach((header, index) => {
        const value = fields[index].trim()
        if (header === 'verified') {
          rowData[header] = value.toLowerCase() === 'true'
        } else if (header === 'verification_time_seconds') {
          rowData[header] = value ? parseInt(value) : undefined
        } else {
          rowData[header] = value || undefined
        }
      })

      const validation = VerificationResultCSVRowSchema.safeParse(rowData)
      if (!validation.success) {
        validation.error.errors.forEach(error => {
          errors.push({
            row: rowNumber,
            field: error.path.join('.'),
            value: error.input,
            message: error.message,
            severity: 'error',
          })
        })
      } else {
        validData.push(validation.data)
      }
    }

    return {
      valid: errors.length === 0,
      total_rows: lines.length,
      valid_rows: validData.length,
      invalid_rows: lines.length - validData.length,
      errors,
      warnings,
      data: validData,
      summary: {
        duplicate_transaction_ids: [],
        amount_anomalies: [],
        date_range: null,
        total_amount: 0,
        average_amount: 0,
      },
    }
  }

  private detectAmountAnomalies(transactions: TransactionCSVRow[]): Array<{
    row: number
    amount: number
    reason: string
  }> {
    const anomalies: any[] = []
    const amounts = transactions.map(t => t.amount_sek)
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const threshold = average * 5 // 5x average is considered anomalous

    transactions.forEach((transaction, index) => {
      if (transaction.amount_sek > threshold) {
        anomalies.push({
          row: index + 2,
          amount: transaction.amount_sek,
          reason: `Amount ${transaction.amount_sek} is ${(transaction.amount_sek / average).toFixed(1)}x the average`,
        })
      }
    })

    return anomalies
  }

  private formatDate(dateString: string, format: 'iso' | 'european' | 'us'): string {
    const date = new Date(dateString)

    switch (format) {
      case 'european':
        return date.toLocaleDateString('en-GB')
      case 'us':
        return date.toLocaleDateString('en-US')
      default:
        return date.toISOString()
    }
  }

  private formatNumber(num: number, format: 'decimal' | 'comma'): string {
    if (format === 'comma') {
      return num.toLocaleString('de-DE') // German locale uses comma as decimal separator
    }
    return num.toString()
  }

  private createValidationResult(
    valid: boolean,
    totalRows: number,
    data: any[],
    errorMessage?: string,
    existingErrors: CSVValidationError[] = []
  ): CSVValidationResult {
    const errors = errorMessage
      ? [{ row: 0, field: 'file', value: '', message: errorMessage, severity: 'error' as const }, ...existingErrors]
      : existingErrors

    return {
      valid,
      total_rows: totalRows,
      valid_rows: data.length,
      invalid_rows: totalRows - data.length,
      errors,
      warnings: [],
      data: data.length > 0 ? data : undefined,
      summary: {
        duplicate_transaction_ids: [],
        amount_anomalies: [],
        date_range: null,
        total_amount: 0,
        average_amount: 0,
      },
    }
  }
}

// Export service instance for API routes
export const csvService = new CSVProcessingService()