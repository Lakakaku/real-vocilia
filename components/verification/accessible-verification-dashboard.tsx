/**
 * Accessible verification dashboard with WCAG 2.1 AA compliance
 *
 * Features:
 * - Keyboard navigation throughout the interface
 * - Screen reader optimized announcements
 * - High contrast color support
 * - Focus management and trap
 * - Accessible data tables and forms
 * - ARIA live regions for real-time updates
 * - Skip links for efficient navigation
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AccessibleButton,
  SkipLink,
  VisuallyHidden,
  AccessibleProgress,
  useFocusManagement,
  useKeyboardNavigation,
  useScreenReaderAnnouncements,
  useAccessibleFormValidation,
  generateAriaAttributes,
  ARIA_ROLES,
  KEYS
} from '@/lib/accessibility/accessibility-utils'
import { useVerificationSocket } from '@/hooks/use-verification-socket'
import { useErrorHandling } from '@/hooks/use-error-handling'

interface AccessibleVerificationDashboardProps {
  sessionId: string
  batchId: string
  businessId: string
  initialData?: any
}

export function AccessibleVerificationDashboard({
  sessionId,
  batchId,
  businessId,
  initialData
}: AccessibleVerificationDashboardProps) {
  // State management
  const [transactions, setTransactions] = useState<any[]>(initialData?.transactions || [])
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'summary'>('list')

  // Refs for accessibility
  const dashboardRef = useRef<HTMLDivElement>(null)
  const transactionListRef = useRef<HTMLElement>(null)
  const detailsPanelRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLElement>(null)

  // Accessibility hooks
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncements()
  const { handleError } = useErrorHandling({ showToasts: true })
  const { errors, getFieldProps, getErrorProps, validateField } = useAccessibleFormValidation()

  // WebSocket connection for real-time updates
  const {
    isConnected,
    subscribe,
    sendActivity,
    onTransactionVerified,
    onSessionProgress
  } = useVerificationSocket({
    sessionId,
    batchId,
    businessId,
    enablePresence: true
  })

  // Focus management for the dashboard
  useFocusManagement(dashboardRef, {
    autoFocus: true,
    restoreFocus: true
  })

  // Keyboard navigation for transaction list
  const transactionRefs = useRef<HTMLElement[]>([])
  const { currentIndex, handleKeyDown: handleTransactionKeyDown } = useKeyboardNavigation(
    { current: transactionRefs.current },
    {
      orientation: 'vertical',
      wrap: true,
      activateOnFocus: true,
      onActivate: (index, element) => {
        const transaction = transactions[index]
        if (transaction) {
          selectTransaction(transaction)
          announce(`Selected transaction ${transaction.id} for verification`)
        }
      }
    }
  )

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected) return

    const unsubscribeTransactionVerified = onTransactionVerified((data) => {
      setTransactions(prev => prev.map(t =>
        t.id === data.transaction_id
          ? { ...t, verification_status: data.status, verified_at: data.verified_at }
          : t
      ))

      announce(`Transaction ${data.transaction_id} has been ${data.status}`)
    })

    const unsubscribeProgress = onSessionProgress((data) => {
      setVerificationProgress(data.progress_percentage)
      announce(`Verification progress: ${data.progress_percentage}% complete`)
    })

    return () => {
      unsubscribeTransactionVerified()
      unsubscribeProgress()
    }
  }, [isConnected, onTransactionVerified, onSessionProgress, announce])

  // Transaction selection handler
  const selectTransaction = useCallback((transaction: any) => {
    setSelectedTransaction(transaction)
    setCurrentView('detail')

    // Announce transaction details to screen reader
    const amount = new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(transaction.amount)

    announce(
      `Viewing transaction ${transaction.id}. Amount: ${amount}. ` +
      `Date: ${new Date(transaction.created_at).toLocaleDateString()}. ` +
      `Status: ${transaction.verification_status || 'pending'}`
    )

    // Send activity update
    sendActivity('verifying', transaction.id)
  }, [announce, sendActivity])

  // Verification action handler
  const handleVerifyTransaction = useCallback(async (
    transactionId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      setIsVerifying(true)
      announce(`Processing ${decision} decision for transaction ${transactionId}`)

      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      // Update local state
      setTransactions(prev => prev.map(t =>
        t.id === transactionId
          ? { ...t, verification_status: decision, verified_at: new Date().toISOString() }
          : t
      ))

      announce(`Transaction ${transactionId} has been ${decision}`)

      // Move to next transaction if available
      const currentTransactionIndex = transactions.findIndex(t => t.id === transactionId)
      const nextTransaction = transactions[currentTransactionIndex + 1]

      if (nextTransaction) {
        selectTransaction(nextTransaction)
      } else {
        setCurrentView('summary')
        announce('All transactions have been verified. Showing verification summary.')
      }

    } catch (error) {
      handleError(error, { transactionId, decision }, 'Failed to verify transaction')
    } finally {
      setIsVerifying(false)
    }
  }, [transactions, announce, handleError, selectTransaction])

  // Keyboard event handlers
  const handleDashboardKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case KEYS.ESCAPE:
        if (currentView === 'detail') {
          setCurrentView('list')
          setSelectedTransaction(null)
          announce('Returned to transaction list')
        }
        break

      case 'v':
        if (event.ctrlKey && selectedTransaction) {
          // Ctrl+V for quick approve
          event.preventDefault()
          handleVerifyTransaction(selectedTransaction.id, 'approved', 'Quick approval')
        }
        break

      case 'r':
        if (event.ctrlKey && selectedTransaction) {
          // Ctrl+R for quick reject
          event.preventDefault()
          handleVerifyTransaction(selectedTransaction.id, 'rejected', 'Quick rejection')
        }
        break
    }
  }, [currentView, selectedTransaction, announce, handleVerifyTransaction])

  // Setup keyboard listeners
  useEffect(() => {
    const dashboard = dashboardRef.current
    if (!dashboard) return

    dashboard.addEventListener('keydown', handleDashboardKeyDown)
    return () => dashboard.removeEventListener('keydown', handleDashboardKeyDown)
  }, [handleDashboardKeyDown])

  // Calculate verification statistics
  const verifiedCount = transactions.filter(t => t.verification_status !== 'pending').length
  const approvedCount = transactions.filter(t => t.verification_status === 'approved').length
  const rejectedCount = transactions.filter(t => t.verification_status === 'rejected').length
  const totalCount = transactions.length

  return (
    <div
      ref={dashboardRef}
      className="min-h-screen bg-white focus:outline-none"
      tabIndex={-1}
      role={ARIA_ROLES.MAIN}
      aria-label="Verification Dashboard"
    >
      {/* Skip Links */}
      <SkipLink href="#transaction-list">Skip to transaction list</SkipLink>
      <SkipLink href="#verification-progress">Skip to verification progress</SkipLink>
      <SkipLink href="#transaction-details">Skip to transaction details</SkipLink>

      {/* Screen Reader Announcements */}
      <AnnouncementRegion />

      {/* Dashboard Header */}
      <header className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verification Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Session {sessionId} - {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>

          {/* Connection Status */}
          <div
            role={ARIA_ROLES.STATUS}
            aria-live="polite"
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Verification Progress */}
        <div id="verification-progress" className="mt-4">
          <AccessibleProgress
            value={verifiedCount}
            max={totalCount}
            label="Verification Progress"
            description={`${verifiedCount} of ${totalCount} transactions verified`}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-2xl font-bold text-gray-600">{totalCount - verifiedCount}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100vh-200px)]">
        {/* Transaction List */}
        <section
          id="transaction-list"
          ref={transactionListRef}
          className="w-1/2 border-r border-gray-200 overflow-y-auto"
          role={ARIA_ROLES.REGION}
          aria-label="Transaction List"
        >
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transactions ({totalCount})
            </h2>

            {/* Keyboard Instructions */}
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
              <h3 className="font-medium text-blue-900 mb-1">Keyboard Shortcuts</h3>
              <ul className="text-blue-800 space-y-1">
                <li>↑/↓ Arrow keys: Navigate transactions</li>
                <li>Enter/Space: Select transaction</li>
                <li>Ctrl+V: Quick approve</li>
                <li>Ctrl+R: Quick reject</li>
                <li>Escape: Return to list</li>
              </ul>
            </div>

            {/* Transaction Grid */}
            <div
              role={ARIA_ROLES.GRID}
              aria-label="Transaction List"
              aria-rowcount={transactions.length}
              className="space-y-2"
              onKeyDown={(e) => handleTransactionKeyDown(e.nativeEvent)}
            >
              {transactions.map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={selectedTransaction?.id === transaction.id}
                  isCurrentFocus={index === currentIndex}
                  onSelect={() => selectTransaction(transaction)}
                  ref={(el) => {
                    if (el) transactionRefs.current[index] = el
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Transaction Details */}
        <section
          id="transaction-details"
          ref={detailsPanelRef}
          className="w-1/2 overflow-y-auto"
          role={ARIA_ROLES.REGION}
          aria-label="Transaction Details"
        >
          {currentView === 'detail' && selectedTransaction ? (
            <TransactionDetails
              transaction={selectedTransaction}
              onVerify={handleVerifyTransaction}
              isVerifying={isVerifying}
            />
          ) : currentView === 'summary' ? (
            <VerificationSummary
              totalTransactions={totalCount}
              verifiedTransactions={verifiedCount}
              approvedTransactions={approvedCount}
              rejectedTransactions={rejectedCount}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">
              <h2 className="text-xl font-medium mb-2">Select a Transaction</h2>
              <p>Choose a transaction from the list to view details and begin verification</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// Transaction Item Component
const TransactionItem = React.forwardRef<HTMLDivElement, {
  transaction: any
  isSelected: boolean
  isCurrentFocus: boolean
  onSelect: () => void
}>(({ transaction, isSelected, isCurrentFocus, onSelect }, ref) => {
  const ariaAttributes = generateAriaAttributes('transaction-item', {
    transactionId: transaction.id,
    amount: transaction.amount,
    status: transaction.verification_status || 'pending',
    isSelected
  })

  const amount = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK'
  }).format(transaction.amount)

  return (
    <div
      ref={ref}
      className={`p-4 border rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected
          ? 'bg-blue-50 border-blue-200'
          : isCurrentFocus
          ? 'bg-gray-50 border-gray-300'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === KEYS.ENTER || e.key === KEYS.SPACE) {
          e.preventDefault()
          onSelect()
        }
      }}
      {...ariaAttributes}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">
            {transaction.id}
          </div>
          <div className="text-sm text-gray-600">
            {new Date(transaction.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">
            {amount}
          </div>
          <Badge
            variant={
              transaction.verification_status === 'approved'
                ? 'default'
                : transaction.verification_status === 'rejected'
                ? 'destructive'
                : 'secondary'
            }
          >
            {transaction.verification_status || 'pending'}
          </Badge>
        </div>
      </div>

      {/* Hidden description for screen readers */}
      <VisuallyHidden>
        <div id={`transaction-${transaction.id}-details`}>
          Transaction details: Amount {amount},
          Date {new Date(transaction.created_at).toLocaleDateString()},
          Status {transaction.verification_status || 'pending'}
        </div>
      </VisuallyHidden>
    </div>
  )
})

TransactionItem.displayName = 'TransactionItem'

// Transaction Details Component
function TransactionDetails({
  transaction,
  onVerify,
  isVerifying
}: {
  transaction: any
  onVerify: (id: string, decision: 'approved' | 'rejected', reason?: string) => Promise<void>
  isVerifying: boolean
}) {
  const [reason, setReason] = useState('')
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])

  const amount = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK'
  }).format(transaction.amount)

  const fraudFlags = [
    'Unusual amount',
    'Off-hours transaction',
    'New merchant',
    'Multiple attempts',
    'Geographic anomaly'
  ]

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Transaction ID</Label>
              <div className="font-mono text-sm">{transaction.id}</div>
            </div>
            <div>
              <Label>Amount</Label>
              <div className="text-lg font-bold">{amount}</div>
            </div>
            <div>
              <Label>Date</Label>
              <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <Label>Merchant</Label>
              <div>{transaction.merchant_name || 'N/A'}</div>
            </div>
          </div>

          {/* Verification Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="verification-reason">Verification Notes</Label>
              <textarea
                id="verification-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Add notes about this verification decision..."
                aria-describedby="reason-help"
              />
              <div id="reason-help" className="text-sm text-gray-600 mt-1">
                Optional notes that will be saved with the verification decision
              </div>
            </div>

            {/* Fraud Flags */}
            <div>
              <Label>Fraud Indicators</Label>
              <div className="space-y-2 mt-2">
                {fraudFlags.map((flag) => (
                  <div key={flag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`flag-${flag}`}
                      checked={selectedFlags.includes(flag)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFlags(prev => [...prev, flag])
                        } else {
                          setSelectedFlags(prev => prev.filter(f => f !== flag))
                        }
                      }}
                    />
                    <Label htmlFor={`flag-${flag}`} className="text-sm">
                      {flag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <AccessibleButton
                variant="primary"
                onClick={() => onVerify(transaction.id, 'approved', reason)}
                disabled={isVerifying}
                ariaLabel={`Approve transaction ${transaction.id}`}
                className="flex-1"
              >
                {isVerifying ? 'Processing...' : 'Approve'}
              </AccessibleButton>

              <AccessibleButton
                variant="danger"
                onClick={() => onVerify(transaction.id, 'rejected', reason)}
                disabled={isVerifying}
                ariaLabel={`Reject transaction ${transaction.id}`}
                className="flex-1"
              >
                {isVerifying ? 'Processing...' : 'Reject'}
              </AccessibleButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Verification Summary Component
function VerificationSummary({
  totalTransactions,
  verifiedTransactions,
  approvedTransactions,
  rejectedTransactions
}: {
  totalTransactions: number
  verifiedTransactions: number
  approvedTransactions: number
  rejectedTransactions: number
}) {
  const completionRate = totalTransactions > 0 ? (verifiedTransactions / totalTransactions) * 100 : 0

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Verification Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {Math.round(completionRate)}%
            </div>
            <div className="text-lg text-gray-600">
              Verification Complete
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {approvedTransactions}
              </div>
              <div className="text-sm text-green-800">Approved</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {rejectedTransactions}
              </div>
              <div className="text-sm text-red-800">Rejected</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {totalTransactions - verifiedTransactions}
              </div>
              <div className="text-sm text-gray-800">Pending</div>
            </div>
          </div>

          <AccessibleButton
            variant="primary"
            onClick={() => window.location.reload()}
            className="w-full"
            ariaLabel="Complete verification session and return to dashboard"
          >
            Complete Session
          </AccessibleButton>
        </CardContent>
      </Card>
    </div>
  )
}