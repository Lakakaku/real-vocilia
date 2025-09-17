/**
 * Contract Test: CSV Processing Utilities
 *
 * Tests the CSV parsing and validation utilities used for
 * batch upload and download operations.
 *
 * This test MUST FAIL initially (TDD approach) until the utilities are implemented.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseCSVContent,
  validateTransactionCSV,
  generateVerificationResultsCSV,
  CSVValidationError
} from '../../lib/utils/csv-processing'
import { mockData } from '../setup'

describe('CSV Processing Utilities', () => {
  describe('parseCSVContent', () => {
    it('should parse valid CSV content correctly', () => {
      const csvContent = mockData.csvContent.valid

      const result = parseCSVContent(csvContent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        transaction_id: 'VCL-001',
        customer_feedback_id: 'fb_001',
        transaction_date: '2024-01-08T14:30:00Z',
        amount_sek: 250.00,
        phone_last4: '**34',
        store_code: 'ABC123',
        quality_score: 85,
        reward_percentage: 5,
        reward_amount_sek: 12.50,
      })
    })

    it('should handle CSV with missing headers', () => {
      const invalidCSV = 'invalid,csv,format\nmissing,required,columns'

      const result = parseCSVContent(invalidCSV)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(CSVValidationError)
      expect(result.error.message).toContain('Missing required headers')
      expect(result.error.details.missingHeaders).toContain('transaction_id')
    })

    it('should handle empty CSV content', () => {
      const result = parseCSVContent('')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(CSVValidationError)
      expect(result.error.message).toBe('CSV content is empty')
    })

    it('should handle CSV with extra columns', () => {
      const csvWithExtra = `transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek,extra_column
VCL-001,fb_001,2024-01-08T14:30:00Z,250.00,**34,ABC123,85,5,12.50,extra_value`

      const result = parseCSVContent(csvWithExtra)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      // Extra columns should be ignored
      expect(result.data[0]).not.toHaveProperty('extra_column')
    })

    it('should handle CSV with quoted values', () => {
      const csvWithQuotes = `transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek
"VCL-001","fb_001","2024-01-08T14:30:00Z",250.00,"**34","ABC123",85,5,12.50`

      const result = parseCSVContent(csvWithQuotes)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].transaction_id).toBe('VCL-001')
    })

    it('should handle large CSV files efficiently', () => {
      // Generate a large CSV with 1000 rows
      const headers = 'transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek'
      const rows = Array.from({ length: 1000 }, (_, i) =>
        `VCL-${String(i + 1).padStart(3, '0')},fb_${i + 1},2024-01-08T14:30:00Z,250.00,**34,ABC123,85,5,12.50`
      )
      const largeCsv = [headers, ...rows].join('\n')

      const startTime = Date.now()
      const result = parseCSVContent(largeCsv)
      const processingTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
      expect(processingTime).toBeLessThan(1000) // Should parse under 1 second
    })
  })

  describe('validateTransactionCSV', () => {
    it('should validate transaction data correctly', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: 250.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(true)
      expect(result.validRows).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid transaction IDs', () => {
      const transactionData = [
        {
          transaction_id: 'INVALID-FORMAT',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: 250.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.validRows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'transaction_id',
        value: 'INVALID-FORMAT',
        message: 'Transaction ID must follow VCL-XXX format',
      })
    })

    it('should detect negative amounts', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: -100.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'amount_sek',
        value: -100.00,
        message: 'Amount must be greater than 0',
      })
    })

    it('should detect invalid dates', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: 'invalid-date',
          amount_sek: 250.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'transaction_date',
        value: 'invalid-date',
        message: 'Invalid date format. Expected ISO 8601',
      })
    })

    it('should detect invalid quality scores', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: 250.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 150, // Invalid: over 100
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'quality_score',
        value: 150,
        message: 'Quality score must be between 0 and 100',
      })
    })

    it('should detect duplicate transaction IDs', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: 250.00,
          phone_last4: '**34',
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
        {
          transaction_id: 'VCL-001', // Duplicate
          customer_feedback_id: 'fb_002',
          transaction_date: '2024-01-08T15:30:00Z',
          amount_sek: 150.00,
          phone_last4: '**67',
          store_code: 'ABC123',
          quality_score: 92,
          reward_percentage: 6,
          reward_amount_sek: 9.00,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        row: 2,
        field: 'transaction_id',
        value: 'VCL-001',
        message: 'Duplicate transaction ID found',
      })
    })

    it('should validate phone number format', () => {
      const transactionData = [
        {
          transaction_id: 'VCL-001',
          customer_feedback_id: 'fb_001',
          transaction_date: '2024-01-08T14:30:00Z',
          amount_sek: 250.00,
          phone_last4: 'ABCD', // Invalid: not **XX format
          store_code: 'ABC123',
          quality_score: 85,
          reward_percentage: 5,
          reward_amount_sek: 12.50,
        },
      ]

      const result = validateTransactionCSV(transactionData)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'phone_last4',
        value: 'ABCD',
        message: 'Phone last 4 must be in format **XX',
      })
    })
  })

  describe('generateVerificationResultsCSV', () => {
    it('should generate CSV from verification results', () => {
      const verificationResults = [
        {
          transaction_id: 'VCL-001',
          verified: true,
          verification_decision: 'approved',
          rejection_reason: null,
          business_notes: 'Verified transaction',
        },
        {
          transaction_id: 'VCL-002',
          verified: false,
          verification_decision: 'rejected',
          rejection_reason: 'amount_mismatch',
          business_notes: 'Amount does not match POS',
        },
      ]

      const csvContent = generateVerificationResultsCSV(verificationResults)

      expect(csvContent).toContain('transaction_id,verified,verification_decision,rejection_reason,business_notes')
      expect(csvContent).toContain('VCL-001,true,approved,,Verified transaction')
      expect(csvContent).toContain('VCL-002,false,rejected,amount_mismatch,Amount does not match POS')
    })

    it('should handle empty verification results', () => {
      const csvContent = generateVerificationResultsCSV([])

      expect(csvContent).toBe('transaction_id,verified,verification_decision,rejection_reason,business_notes\n')
    })

    it('should escape CSV special characters', () => {
      const verificationResults = [
        {
          transaction_id: 'VCL-001',
          verified: true,
          verification_decision: 'approved',
          rejection_reason: null,
          business_notes: 'Notes with "quotes" and, commas',
        },
      ]

      const csvContent = generateVerificationResultsCSV(verificationResults)

      expect(csvContent).toContain('"Notes with ""quotes"" and, commas"')
    })

    it('should handle null and undefined values', () => {
      const verificationResults = [
        {
          transaction_id: 'VCL-001',
          verified: true,
          verification_decision: 'approved',
          rejection_reason: null,
          business_notes: undefined,
        },
      ]

      const csvContent = generateVerificationResultsCSV(verificationResults)

      expect(csvContent).toContain('VCL-001,true,approved,,')
    })

    it('should maintain consistent column order', () => {
      const verificationResults = [
        {
          business_notes: 'Note 1',
          transaction_id: 'VCL-001',
          rejection_reason: null,
          verified: true,
          verification_decision: 'approved',
        },
      ]

      const csvContent = generateVerificationResultsCSV(verificationResults)
      const lines = csvContent.split('\n')
      const headers = lines[0]

      expect(headers).toBe('transaction_id,verified,verification_decision,rejection_reason,business_notes')
    })
  })

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const error = new CSVValidationError('Test error message', [
        { row: 1, field: 'amount', value: 'invalid', message: 'Not a number' }
      ])

      expect(error.message).toBe('Test error message')
      expect(error.details).toHaveLength(1)
      expect(error.details[0].row).toBe(1)
      expect(error.details[0].field).toBe('amount')
    })

    it('should handle malformed CSV gracefully', () => {
      const malformedCSV = 'header1,header2\nvalue1\nvalue2,value3,value4'

      const result = parseCSVContent(malformedCSV)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(CSVValidationError)
      expect(result.error.message).toContain('Inconsistent number of columns')
    })
  })
})