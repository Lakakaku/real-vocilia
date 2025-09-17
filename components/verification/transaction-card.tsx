'use client'

/**
 * TransactionCard - Individual transaction card with fraud indicators
 *
 * Features:
 * - Mobile-optimized transaction display
 * - Inline verification actions (approve/reject)
 * - Risk indicators and fraud flags
 * - AI-powered fraud insights integration
 * - Expandable details view
 * - Quick action buttons
 * - Accessibility support
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  AlertTriangle,
  Eye,
  ChevronDown,
  User,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Shield,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  index: number
  transaction_id: string
  amount: number
  recipient_name: string
  recipient_account: string
  reference: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  is_flagged: boolean
  fraud_indicators: string[]
  verified_at: string | null
  verified_by: string | null
  verification_time_seconds: number | null
  verification_result?: {
    decision: 'approved' | 'rejected'
    reason?: string
    notes?: string
    verified_by: string
    verified_at: string
    verification_time_seconds: number
  }
}

interface TransactionCardProps {
  transaction: Transaction
  onVerify: (decision: 'approved' | 'rejected', reason?: string, notes?: string) => Promise<void>
  onView?: (transaction: Transaction) => void
  isVerifying?: boolean
  showActions?: boolean
  compact?: boolean
  className?: string
}

interface VerificationDialogState {
  isOpen: boolean
  decision: 'approved' | 'rejected' | null
  reason: string
  notes: string
}

export function TransactionCard({
  transaction,
  onVerify,
  onView,
  isVerifying = false,
  showActions = true,
  compact = false,
  className
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dialogState, setDialogState] = useState<VerificationDialogState>({
    isOpen: false,
    decision: null,
    reason: '',
    notes: ''
  })

  // Get status color and icon
  const getStatusDisplay = () => {
    switch (transaction.status) {
      case 'approved':
        return {
          color: 'bg-green-50 border-green-200',
          badgeColor: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          label: 'Approved'
        }
      case 'rejected':
        return {
          color: 'bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600',
          label: 'Rejected'
        }
      case 'pending':
        return {
          color: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          icon: Clock,
          iconColor: 'text-gray-600',
          label: 'Pending'
        }
      default:
        return {
          color: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          icon: Clock,
          iconColor: 'text-gray-600',
          label: 'Unknown'
        }
    }
  }

  // Get risk level display
  const getRiskDisplay = () => {
    switch (transaction.risk_level) {
      case 'high':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'High Risk'
        }
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertTriangle,
          label: 'Medium Risk'
        }
      case 'low':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Shield,
          label: 'Low Risk'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Shield,
          label: 'Unknown'
        }
    }
  }

  // Open verification dialog
  const openVerificationDialog = (decision: 'approved' | 'rejected') => {
    setDialogState({
      isOpen: true,
      decision,
      reason: '',
      notes: ''
    })
  }

  // Close verification dialog
  const closeVerificationDialog = () => {
    setDialogState({
      isOpen: false,
      decision: null,
      reason: '',
      notes: ''
    })
  }

  // Handle verification submission
  const handleVerificationSubmit = async () => {
    if (!dialogState.decision) return

    try {
      await onVerify(dialogState.decision, dialogState.reason, dialogState.notes)
      closeVerificationDialog()
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Verification failed:', error)
    }
  }

  const statusDisplay = getStatusDisplay()
  const riskDisplay = getRiskDisplay()
  const StatusIcon = statusDisplay.icon
  const RiskIcon = riskDisplay.icon

  return (
    <>
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        statusDisplay.color,
        transaction.is_flagged && 'ring-2 ring-red-200',
        className
      )}>
        <CardHeader className={cn('pb-3', compact && 'pb-2')}>
          <div className="flex items-center justify-between">
            {/* Transaction Index and ID */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-gray-600">#{transaction.index}</span>
                <Badge className={statusDisplay.badgeColor}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusDisplay.label}
                </Badge>
              </div>
              <div className="text-sm font-medium">{transaction.transaction_id}</div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <div className="text-lg font-bold">
                {transaction.amount.toLocaleString()} SEK
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn('space-y-4', compact && 'space-y-2')}>
          {/* Recipient Information */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{transaction.recipient_name}</div>
                <div className="text-sm text-gray-600 font-mono truncate">
                  {transaction.recipient_account}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-600 truncate">
                  {transaction.reference}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="text-sm text-gray-600">
                {new Date(transaction.date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Risk and Fraud Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={riskDisplay.color} variant="outline">
              <RiskIcon className="h-3 w-3 mr-1" />
              {riskDisplay.label}
            </Badge>

            <Badge variant="outline" className="text-xs">
              Score: {transaction.risk_score}
            </Badge>

            {transaction.is_flagged && (
              <Badge variant="destructive" className="animate-pulse">
                <Flag className="h-3 w-3 mr-1" />
                Flagged
              </Badge>
            )}
          </div>

          {/* Fraud Indicators */}
          {transaction.fraud_indicators.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <span className="font-medium">Fraud indicators:</span>{' '}
                {transaction.fraud_indicators.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Result (if verified) */}
          {transaction.verification_result && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Verified:</span>
                <span className="font-medium">
                  {new Date(transaction.verification_result.verified_at).toLocaleString()}
                </span>
              </div>

              {transaction.verification_result.reason && (
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Reason:</span>
                  <p className="text-sm mt-1">{transaction.verification_result.reason}</p>
                </div>
              )}

              {transaction.verification_result.notes && (
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Notes:</span>
                  <p className="text-sm mt-1">{transaction.verification_result.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Expandable Details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Transaction Details</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Risk Score:</span>
                  <div className="font-medium">{transaction.risk_score}/100</div>
                </div>

                <div>
                  <span className="text-gray-600">Risk Level:</span>
                  <div className="font-medium capitalize">{transaction.risk_level}</div>
                </div>

                {transaction.verification_time_seconds && (
                  <>
                    <div>
                      <span className="text-gray-600">Verification Time:</span>
                      <div className="font-medium">
                        {Math.round(transaction.verification_time_seconds / 60)}m {transaction.verification_time_seconds % 60}s
                      </div>
                    </div>
                  </>
                )}
              </div>

              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onView(transaction)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          {showActions && transaction.status === 'pending' && (
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => openVerificationDialog('approved')}
                disabled={isVerifying}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>

              <Button
                onClick={() => openVerificationDialog('rejected')}
                disabled={isVerifying}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={dialogState.isOpen} onOpenChange={closeVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState.decision === 'approved' ? 'Approve' : 'Reject'} Transaction
            </DialogTitle>
            <DialogDescription>
              Transaction #{transaction.index}: {transaction.transaction_id}
              <br />
              Amount: {transaction.amount.toLocaleString()} SEK
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="Enter verification reason..."
                value={dialogState.reason}
                onChange={(e) => setDialogState(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={dialogState.notes}
                onChange={(e) => setDialogState(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Risk Warning for Approval */}
            {dialogState.decision === 'approved' && (transaction.risk_level === 'high' || transaction.is_flagged) && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Warning:</strong> This transaction has {transaction.risk_level} risk
                  {transaction.is_flagged && ' and has been flagged for review'}.
                  Please ensure you have reviewed all fraud indicators before approving.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeVerificationDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleVerificationSubmit}
              disabled={isVerifying}
              className={dialogState.decision === 'approved' ?
                'bg-green-600 hover:bg-green-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : dialogState.decision === 'approved' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {dialogState.decision === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}