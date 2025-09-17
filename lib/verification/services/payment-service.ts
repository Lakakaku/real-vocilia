/**
 * Payment Service
 *
 * Handles payment file generation for verified transactions in various formats
 * (Swish CSV, SEPA XML, JSON). Manages payment processing and file creation.
 */

import { createClient } from '@/lib/supabase/server'

export interface PaymentFileRequest {
  session_id: string
  business_id: string
  approved_transactions: any[]
  format: 'swish_csv' | 'sepa_xml' | 'json'
  include_rejected?: boolean
}

export interface PaymentFileResult {
  file_path: string
  file_name: string
  file_size: number
  format: string
  transaction_count: number
  total_amount: number
  created_at: string
}

class PaymentService {
  private supabase = createClient()

  /**
   * Generate payment file for approved transactions
   */
  async generatePaymentFile(request: PaymentFileRequest): Promise<PaymentFileResult> {
    const { session_id, business_id, approved_transactions, format, include_rejected = false } = request

    // Calculate totals
    let totalAmount = 0
    let transactionCount = 0

    const transactions = include_rejected
      ? approved_transactions
      : approved_transactions.filter(t => t.is_approved)

    transactions.forEach(transaction => {
      totalAmount += parseFloat(transaction.amount || '0')
      transactionCount++
    })

    // Generate file content based on format
    let fileContent = ''
    let fileName = ''
    let mimeType = ''

    switch (format) {
      case 'swish_csv':
        fileContent = this.generateSwishCSV(transactions)
        fileName = `swish_payments_${session_id}_${Date.now()}.csv`
        mimeType = 'text/csv'
        break

      case 'sepa_xml':
        fileContent = this.generateSepaXML(transactions, business_id)
        fileName = `sepa_payments_${session_id}_${Date.now()}.xml`
        mimeType = 'application/xml'
        break

      case 'json':
        fileContent = JSON.stringify({
          session_id,
          business_id,
          transactions,
          summary: {
            total_amount: totalAmount,
            transaction_count: transactionCount,
            generated_at: new Date().toISOString()
          }
        }, null, 2)
        fileName = `payments_${session_id}_${Date.now()}.json`
        mimeType = 'application/json'
        break

      default:
        throw new Error(`Unsupported payment file format: ${format}`)
    }

    // Store file (this is a simplified implementation)
    // In a real implementation, you would upload to Supabase Storage or another service
    const filePath = `/tmp/${fileName}`

    return {
      file_path: filePath,
      file_name: fileName,
      file_size: fileContent.length,
      format,
      transaction_count: transactionCount,
      total_amount: totalAmount,
      created_at: new Date().toISOString()
    }
  }

  /**
   * Generate Swish CSV format
   */
  private generateSwishCSV(transactions: any[]): string {
    const headers = [
      'Mottagarnummer',
      'Belopp',
      'Meddelande',
      'Referens'
    ]

    const rows = transactions.map(transaction => [
      transaction.recipient_phone || '',
      transaction.amount || '0',
      transaction.message || `Payment for transaction ${transaction.id}`,
      transaction.reference || transaction.id
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  /**
   * Generate SEPA XML format (simplified)
   */
  private generateSepaXML(transactions: any[], businessId: string): string {
    const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0)
    const transactionCount = transactions.length

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PAYMENT-${Date.now()}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${transactionCount}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>Vocilia Business ${businessId}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${Date.now()}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${transactionCount}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      ${transactions.map((transaction, index) => `
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>TXN-${transaction.id}</InstrId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="SEK">${parseFloat(transaction.amount || '0').toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>Customer ${transaction.recipient_name || transaction.id}</Nm>
        </Cdtr>
        <RmtInf>
          <Ustrd>${transaction.message || `Payment for transaction ${transaction.id}`}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
  }
}

// Export singleton instance
export const paymentService = new PaymentService()