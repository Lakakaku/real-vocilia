/**
 * Unit tests for CSV processing validation
 *
 * Tests CSV parsing, validation, transformation, and error handling
 * Covers Swish CSV format requirements and data integrity checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CSVProcessingService } from '@/lib/verification/services/csv-service'
import type { PaymentBatch, Transaction } from '@/types/verification'

describe('CSVProcessingService', () => {
  let csvService: CSVProcessingService

  beforeEach(() => {
    csvService = new CSVProcessingService()
  })

  describe('CSV Format Validation', () => {
    it('should validate correct Swish CSV format', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed
SW123456790,150.50,SEK,Another Business,+46701234568,Jane Smith,+46709876544,Service payment,2023-12-15T15:00:00Z,completed`

      const result = await csvService.validateFormat(validCSV)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.rowCount).toBe(2)
      expect(result.columnCount).toBe(10)
    })

    it('should reject CSV with missing required columns', async () => {
      const invalidCSV = `Reference,Amount,Currency,Recipient
SW123456789,250.00,SEK,Test Business AB`

      const result = await csvService.validateFormat(invalidCSV)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing required columns: RecipientNumber, Sender, SenderNumber, Message, Timestamp, Status')
    })

    it('should reject CSV with incorrect column order', async () => {
      const invalidCSV = `Amount,Reference,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
250.00,SW123456789,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed`

      const result = await csvService.validateFormat(invalidCSV)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Incorrect column order. Expected: Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status')
    })

    it('should handle empty CSV files', async () => {
      const emptyCSV = ''

      const result = await csvService.validateFormat(emptyCSV)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should handle CSV with only headers', async () => {
      const headerOnlyCSV = 'Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status'

      const result = await csvService.validateFormat(headerOnlyCSV)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CSV file contains no data rows')
    })
  })

  describe('Data Validation', () => {
    const validHeaders = 'Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status'

    it('should validate correct transaction data', async () => {
      const validRow = 'SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed'
      const csv = `${validHeaders}\n${validRow}`

      const result = await csvService.validateData(csv)

      expect(result.isValid).toBe(true)
      expect(result.validRows).toBe(1)
      expect(result.invalidRows).toHaveLength(0)
    })

    it('should detect invalid Swish reference format', async () => {
      const invalidRow = 'INVALID123,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed'
      const csv = `${validHeaders}\n${invalidRow}`

      const result = await csvService.validateData(csv)

      expect(result.isValid).toBe(false)
      expect(result.invalidRows).toHaveLength(1)
      expect(result.invalidRows[0].errors).toContain('Invalid Swish reference format')
    })

    it('should validate amount format and range', async () => {
      const invalidAmountRows = [
        'SW123456789,abc,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed', // Non-numeric
        'SW123456790,-50.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed', // Negative
        'SW123456791,0,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed', // Zero
        'SW123456792,150000.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed' // Too high
      ]

      for (const [index, row] of invalidAmountRows.entries()) {
        const csv = `${validHeaders}\n${row}`
        const result = await csvService.validateData(csv)

        expect(result.isValid).toBe(false)
        expect(result.invalidRows[0].errors.some(error =>
          error.includes('amount') || error.includes('Amount')
        )).toBe(true)
      }
    })

    it('should validate Swedish phone number format', async () => {
      const invalidPhoneRows = [
        'SW123456789,250.00,SEK,Test Business AB,123456789,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed', // Missing country code
        'SW123456790,250.00,SEK,Test Business AB,+46701234567,John Doe,+1234567890,Payment,2023-12-15T14:30:00Z,completed', // Wrong country code
        'SW123456791,250.00,SEK,Test Business AB,+4670123,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed' // Too short
      ]

      for (const row of invalidPhoneRows) {
        const csv = `${validHeaders}\n${row}`
        const result = await csvService.validateData(csv)

        expect(result.isValid).toBe(false)
        expect(result.invalidRows[0].errors.some(error =>
          error.includes('phone') || error.includes('number')
        )).toBe(true)
      }
    })

    it('should validate currency code', async () => {
      const invalidCurrencyRow = 'SW123456789,250.00,USD,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed'
      const csv = `${validHeaders}\n${invalidCurrencyRow}`

      const result = await csvService.validateData(csv)

      expect(result.isValid).toBe(false)
      expect(result.invalidRows[0].errors).toContain('Currency must be SEK')
    })

    it('should validate timestamp format', async () => {
      const invalidTimestampRows = [
        'SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15,completed', // Date only
        'SW123456790,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,invalid-date,completed', // Invalid format
        'SW123456791,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2025-12-15T14:30:00Z,completed' // Future date
      ]

      for (const row of invalidTimestampRows) {
        const csv = `${validHeaders}\n${row}`
        const result = await csvService.validateData(csv)

        expect(result.isValid).toBe(false)
        expect(result.invalidRows[0].errors.some(error =>
          error.includes('timestamp') || error.includes('date')
        )).toBe(true)
      }
    })

    it('should validate transaction status', async () => {
      const invalidStatusRow = 'SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,invalid'
      const csv = `${validHeaders}\n${invalidStatusRow}`

      const result = await csvService.validateData(csv)

      expect(result.isValid).toBe(false)
      expect(result.invalidRows[0].errors).toContain('Invalid status. Must be one of: completed, pending, failed')
    })
  })

  describe('CSV Parsing and Transformation', () => {
    it('should parse valid CSV into transaction objects', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed
SW123456790,150.50,SEK,Another Business,+46701234568,Jane Smith,+46709876544,Service payment,2023-12-15T15:00:00Z,completed`

      const transactions = await csvService.parseToTransactions(validCSV, 'batch_001')

      expect(transactions).toHaveLength(2)

      expect(transactions[0]).toMatchObject({
        batch_id: 'batch_001',
        swish_reference: 'SW123456789',
        amount: 250.00,
        currency: 'SEK',
        recipient_name: 'Test Business AB',
        recipient_number: '+46701234567',
        sender_name: 'John Doe',
        sender_number: '+46709876543',
        message: 'Payment for services',
        timestamp: '2023-12-15T14:30:00Z',
        status: 'completed',
        verification_status: 'pending'
      })

      expect(transactions[1].amount).toBe(150.50)
      expect(transactions[1].swish_reference).toBe('SW123456790')
    })

    it('should handle special characters in CSV data', async () => {
      const csvWithSpecialChars = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,"Business, Inc. & Co.",+46701234567,"John ""Johnny"" Doe",+46709876543,"Payment for ""special"" services",2023-12-15T14:30:00Z,completed`

      const transactions = await csvService.parseToTransactions(csvWithSpecialChars, 'batch_001')

      expect(transactions).toHaveLength(1)
      expect(transactions[0].recipient_name).toBe('Business, Inc. & Co.')
      expect(transactions[0].sender_name).toBe('John "Johnny" Doe')
      expect(transactions[0].message).toBe('Payment for "special" services')
    })

    it('should generate unique transaction IDs', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed
SW123456790,150.50,SEK,Another Business,+46701234568,Jane Smith,+46709876544,Payment,2023-12-15T15:00:00Z,completed`

      const transactions = await csvService.parseToTransactions(validCSV, 'batch_001')

      expect(transactions[0].id).toBeDefined()
      expect(transactions[1].id).toBeDefined()
      expect(transactions[0].id).not.toBe(transactions[1].id)
      expect(typeof transactions[0].id).toBe('string')
    })
  })

  describe('Batch Generation', () => {
    it('should generate payment batch from CSV', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed
SW123456790,150.50,SEK,Another Business,+46701234568,Jane Smith,+46709876544,Payment,2023-12-15T15:00:00Z,completed`

      const batch = await csvService.generateBatch(validCSV, 'business_001', 'user_001')

      expect(batch).toMatchObject({
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        transaction_count: 2,
        total_amount: 400.50,
        verification_deadline: expect.any(String),
        created_at: expect.any(String)
      })

      expect(batch.id).toBeDefined()
      expect(typeof batch.id).toBe('string')
    })

    it('should calculate verification deadline correctly', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed`

      const batch = await csvService.generateBatch(validCSV, 'business_001', 'user_001')

      const deadline = new Date(batch.verification_deadline)
      const now = new Date()
      const daysDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      expect(daysDiff).toBeCloseTo(7, 0) // 7 days deadline
    })

    it('should include metadata in batch', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed`

      const metadata = {
        original_filename: 'payments.csv',
        file_size: 1024,
        upload_source: 'web_interface'
      }

      const batch = await csvService.generateBatch(validCSV, 'business_001', 'user_001', metadata)

      expect(batch.metadata).toEqual(metadata)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle malformed CSV gracefully', async () => {
      const malformedCSV = `Reference,Amount,Currency
SW123456789,250.00
Invalid line without proper columns
SW123456790,150.50,SEK`

      const result = await csvService.validateFormat(malformedCSV)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should provide detailed error information', async () => {
      const invalidCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
INVALID,abc,USD,Test Business AB,123456789,John Doe,+1234567890,Payment,invalid-date,invalid-status`

      const result = await csvService.validateData(invalidCSV)

      expect(result.isValid).toBe(false)
      expect(result.invalidRows).toHaveLength(1)
      expect(result.invalidRows[0].rowNumber).toBe(2)
      expect(result.invalidRows[0].errors.length).toBeGreaterThan(3)
    })

    it('should handle extremely large CSV files', async () => {
      // Generate a large CSV with 1000 rows
      const headers = 'Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status'
      const rows = Array.from({ length: 1000 }, (_, i) =>
        `SW${String(i).padStart(9, '0')},250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed`
      )
      const largeCsv = [headers, ...rows].join('\n')

      const startTime = Date.now()
      const result = await csvService.validateFormat(largeCsv)
      const endTime = Date.now()

      expect(result.isValid).toBe(true)
      expect(result.rowCount).toBe(1000)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csvWithBOM = '\uFEFFReference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status\nSW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed'

      const result = await csvService.validateFormat(csvWithBOM)

      expect(result.isValid).toBe(true)
      expect(result.rowCount).toBe(1)
    })
  })

  describe('CSV Export', () => {
    it('should export transactions to CSV format', async () => {
      const transactions: Transaction[] = [
        {
          id: 'txn_001',
          batch_id: 'batch_001',
          swish_reference: 'SW123456789',
          amount: 250.00,
          currency: 'SEK',
          recipient_name: 'Test Business AB',
          recipient_number: '+46701234567',
          sender_name: 'John Doe',
          sender_number: '+46709876543',
          message: 'Payment for services',
          timestamp: '2023-12-15T14:30:00Z',
          status: 'completed',
          verification_status: 'approved',
          verified_at: '2023-12-16T10:00:00Z',
          verified_by: 'user_001',
          created_at: '2023-12-15T14:30:00Z',
          updated_at: '2023-12-16T10:00:00Z'
        }
      ]

      const csv = await csvService.exportToCSV(transactions)

      expect(csv).toContain('Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status,VerificationStatus,VerifiedAt,VerifiedBy')
      expect(csv).toContain('SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment for services,2023-12-15T14:30:00Z,completed,approved,2023-12-16T10:00:00Z,user_001')
    })

    it('should handle special characters in export', async () => {
      const transactions: Transaction[] = [
        {
          id: 'txn_001',
          batch_id: 'batch_001',
          swish_reference: 'SW123456789',
          amount: 250.00,
          currency: 'SEK',
          recipient_name: 'Business "Inc" & Co.',
          recipient_number: '+46701234567',
          sender_name: 'John, Doe',
          sender_number: '+46709876543',
          message: 'Payment for "special" services',
          timestamp: '2023-12-15T14:30:00Z',
          status: 'completed',
          verification_status: 'approved',
          created_at: '2023-12-15T14:30:00Z',
          updated_at: '2023-12-16T10:00:00Z'
        }
      ]

      const csv = await csvService.exportToCSV(transactions)

      expect(csv).toContain('"Business ""Inc"" & Co."')
      expect(csv).toContain('"John, Doe"')
      expect(csv).toContain('"Payment for ""special"" services"')
    })
  })

  describe('Performance Metrics', () => {
    it('should track processing performance', async () => {
      const validCSV = `Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status
SW123456789,250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed`

      const metrics = await csvService.getProcessingMetrics(validCSV)

      expect(metrics).toMatchObject({
        rowCount: 1,
        fileSize: expect.any(Number),
        processingTime: expect.any(Number),
        memoryUsage: expect.any(Number),
        validationErrors: 0
      })
    })

    it('should optimize memory usage for large files', async () => {
      // This test would verify that large files are processed in chunks
      // rather than loading everything into memory at once
      const largeCSV = 'Reference,Amount,Currency,Recipient,RecipientNumber,Sender,SenderNumber,Message,Timestamp,Status\n' +
        Array.from({ length: 10000 }, (_, i) =>
          `SW${String(i).padStart(9, '0')},250.00,SEK,Test Business AB,+46701234567,John Doe,+46709876543,Payment,2023-12-15T14:30:00Z,completed`
        ).join('\n')

      const initialMemory = process.memoryUsage().heapUsed
      await csvService.validateFormat(largeCSV)
      const finalMemory = process.memoryUsage().heapUsed

      // Memory increase should be reasonable for large file processing
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB increase
    })
  })
})