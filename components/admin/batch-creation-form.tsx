'use client'

/**
 * BatchCreationForm - Admin form for creating new verification batches
 *
 * Features:
 * - Multi-step batch creation wizard with validation
 * - CSV file upload with preview and validation
 * - Business selection with metadata collection
 * - Flexible deadline configuration with business rules
 * - Batch settings and priority configuration
 * - Pre-flight validation with detailed feedback
 * - Progress tracking during batch creation
 * - Integration with verification workflow system
 * - Support for draft mode and immediate release
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  FileUp,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  FileText,
  Settings,
  Play,
  Save,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
  Target,
  Zap,
  Eye,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface Business {
  id: string
  name: string
  contact_email: string
  status: 'active' | 'inactive' | 'suspended'
  verification_tier: 'standard' | 'premium' | 'enterprise'
  default_deadline_hours: number
  weekly_limit: number
  current_week_batches: number
}

interface BatchPreviewData {
  total_transactions: number
  total_amount: number
  unique_recipients: number
  amount_range: {
    min: number
    max: number
    avg: number
  }
  sample_transactions: Array<{
    amount: number
    recipient_name: string
    recipient_account: string
    reference: string
  }>
  validation_errors: string[]
  validation_warnings: string[]
}

interface BatchSettings {
  priority: 'low' | 'medium' | 'high' | 'critical'
  auto_start_verification: boolean
  custom_deadline: string | null
  verification_notes: string
  force_create: boolean
  notify_business: boolean
  include_fraud_check: boolean
}

interface CreationProgress {
  step: 'upload' | 'business' | 'settings' | 'review' | 'creating' | 'complete'
  progress: number
  message: string
  error: string | null
  batch_id: string | null
}

interface BatchCreationFormProps {
  onBatchCreated?: (batchId: string) => void
  onCancel?: () => void
  className?: string
  initialBusinessId?: string
  mode?: 'dialog' | 'page'
}

export function BatchCreationForm({
  onBatchCreated,
  onCancel,
  className,
  initialBusinessId,
  mode = 'dialog'
}: BatchCreationFormProps) {
  // Form state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    priority: 'medium',
    auto_start_verification: true,
    custom_deadline: null,
    verification_notes: '',
    force_create: false,
    notify_business: true,
    include_fraud_check: true
  })

  // Data state
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [previewData, setPreviewData] = useState<BatchPreviewData | null>(null)
  const [creationProgress, setCreationProgress] = useState<CreationProgress>({
    step: 'upload',
    progress: 0,
    message: '',
    error: null,
    batch_id: null
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Load businesses
  const loadBusinesses = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/businesses?status=active', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to load businesses')
      }

      const data = await response.json()
      setBusinesses(data.businesses || [])

      // Pre-select business if provided
      if (initialBusinessId) {
        const business = data.businesses?.find((b: Business) => b.id === initialBusinessId)
        if (business) {
          setSelectedBusiness(business)
        }
      }

    } catch (error) {
      console.error('Failed to load businesses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [initialBusinessId])

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setCsvFile(file)
    setCreationProgress(prev => ({ ...prev, step: 'upload', message: 'Processing CSV file...' }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/batches/preview', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to process CSV file')
      }

      const data = await response.json()
      setPreviewData(data)

      if (data.validation_errors.length === 0) {
        setCreationProgress(prev => ({ ...prev, step: 'business', message: 'CSV validated successfully' }))
      } else {
        setCreationProgress(prev => ({ ...prev, error: 'CSV validation failed' }))
      }

    } catch (error) {
      console.error('CSV processing failed:', error)
      setCreationProgress(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'CSV processing failed'
      }))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  // Create batch
  const createBatch = async () => {
    if (!csvFile || !selectedBusiness) return

    try {
      setCreationProgress({ step: 'creating', progress: 0, message: 'Creating batch...', error: null, batch_id: null })

      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('business_id', selectedBusiness.id)
      formData.append('settings', JSON.stringify(batchSettings))

      // Progress simulation
      const progressInterval = setInterval(() => {
        setCreationProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 500)

      const response = await fetch('/api/admin/batches/create', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create batch')
      }

      const data = await response.json()

      setCreationProgress({
        step: 'complete',
        progress: 100,
        message: 'Batch created successfully!',
        error: null,
        batch_id: data.batch_id
      })

      if (onBatchCreated) {
        onBatchCreated(data.batch_id)
      }

    } catch (error) {
      console.error('Batch creation failed:', error)
      setCreationProgress(prev => ({
        ...prev,
        step: 'review',
        error: error instanceof Error ? error.message : 'Batch creation failed'
      }))
    }
  }

  // Navigation helpers
  const canProceedToNext = () => {
    switch (creationProgress.step) {
      case 'upload':
        return csvFile && previewData && previewData.validation_errors.length === 0
      case 'business':
        return selectedBusiness
      case 'settings':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    switch (creationProgress.step) {
      case 'upload':
        if (!businesses.length) loadBusinesses()
        setCreationProgress(prev => ({ ...prev, step: 'business' }))
        break
      case 'business':
        setCreationProgress(prev => ({ ...prev, step: 'settings' }))
        break
      case 'settings':
        setCreationProgress(prev => ({ ...prev, step: 'review' }))
        break
      case 'review':
        createBatch()
        break
    }
  }

  const prevStep = () => {
    switch (creationProgress.step) {
      case 'business':
        setCreationProgress(prev => ({ ...prev, step: 'upload' }))
        break
      case 'settings':
        setCreationProgress(prev => ({ ...prev, step: 'business' }))
        break
      case 'review':
        setCreationProgress(prev => ({ ...prev, step: 'settings' }))
        break
    }
  }

  // Render upload step
  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileUp className="h-5 w-5" />
          <span>Upload CSV File</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />

          {csvFile ? (
            <div className="space-y-2">
              <p className="font-medium">{csvFile.name}</p>
              <p className="text-sm text-gray-600">
                {(csvFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">Drop your CSV file here, or click to browse</p>
              <p className="text-sm text-gray-600">
                Maximum file size: 10MB
              </p>
            </div>
          )}
        </div>

        {/* Preview Data */}
        {previewData && (
          <div className="space-y-4">
            {/* Validation Results */}
            {previewData.validation_errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Validation Errors:</div>
                    <ul className="text-sm space-y-1">
                      {previewData.validation_errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {previewData.validation_warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Warnings:</div>
                    <ul className="text-sm space-y-1">
                      {previewData.validation_warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{previewData.total_transactions}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{previewData.total_amount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total SEK</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{previewData.unique_recipients}</div>
                <div className="text-sm text-gray-600">Recipients</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{previewData.amount_range.avg.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Avg Amount</div>
              </div>
            </div>

            {/* Sample Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sample Transactions</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              {showPreview && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.sample_transactions.slice(0, 5).map((transaction, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">
                            {transaction.amount.toLocaleString()} SEK
                          </TableCell>
                          <TableCell>{transaction.recipient_name}</TableCell>
                          <TableCell className="font-mono">{transaction.recipient_account}</TableCell>
                          <TableCell className="truncate max-w-48">{transaction.reference}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Render business selection step
  const renderBusinessStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Select Business</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Business</Label>
          <Select
            value={selectedBusiness?.id || ''}
            onValueChange={(value) => {
              const business = businesses.find(b => b.id === value)
              setSelectedBusiness(business || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{business.name}</span>
                    <Badge variant={business.status === 'active' ? 'default' : 'secondary'}>
                      {business.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBusiness && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="font-medium">Business Information</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Contact Email:</span>
                <div className="font-medium">{selectedBusiness.contact_email}</div>
              </div>
              <div>
                <span className="text-gray-600">Verification Tier:</span>
                <div className="font-medium capitalize">{selectedBusiness.verification_tier}</div>
              </div>
              <div>
                <span className="text-gray-600">Default Deadline:</span>
                <div className="font-medium">{selectedBusiness.default_deadline_hours}h</div>
              </div>
              <div>
                <span className="text-gray-600">This Week:</span>
                <div className="font-medium">
                  {selectedBusiness.current_week_batches}/{selectedBusiness.weekly_limit} batches
                </div>
              </div>
            </div>

            {selectedBusiness.current_week_batches >= selectedBusiness.weekly_limit && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This business has reached their weekly batch limit.
                  Enable &quot;Force Create&quot; in settings to proceed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Render settings step
  const renderSettingsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Batch Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={batchSettings.priority}
            onValueChange={(value: any) => setBatchSettings(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Deadline */}
        <div className="space-y-2">
          <Label>Custom Deadline (Optional)</Label>
          <Input
            type="datetime-local"
            value={batchSettings.custom_deadline || ''}
            onChange={(e) => setBatchSettings(prev => ({
              ...prev,
              custom_deadline: e.target.value || null
            }))}
          />
          <p className="text-sm text-gray-600">
            Leave empty to use business default ({selectedBusiness?.default_deadline_hours}h)
          </p>
        </div>

        {/* Verification Notes */}
        <div className="space-y-2">
          <Label>Verification Notes</Label>
          <Textarea
            placeholder="Add any special instructions for verifiers..."
            value={batchSettings.verification_notes}
            onChange={(e) => setBatchSettings(prev => ({
              ...prev,
              verification_notes: e.target.value
            }))}
            rows={3}
          />
        </div>

        {/* Checkboxes */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto_start"
              checked={batchSettings.auto_start_verification}
              onCheckedChange={(checked) => setBatchSettings(prev => ({
                ...prev,
                auto_start_verification: checked as boolean
              }))}
            />
            <Label htmlFor="auto_start">Auto-start verification after creation</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify_business"
              checked={batchSettings.notify_business}
              onCheckedChange={(checked) => setBatchSettings(prev => ({
                ...prev,
                notify_business: checked as boolean
              }))}
            />
            <Label htmlFor="notify_business">Notify business via email</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_fraud_check"
              checked={batchSettings.include_fraud_check}
              onCheckedChange={(checked) => setBatchSettings(prev => ({
                ...prev,
                include_fraud_check: checked as boolean
              }))}
            />
            <Label htmlFor="include_fraud_check">Include AI fraud detection</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="force_create"
              checked={batchSettings.force_create}
              onCheckedChange={(checked) => setBatchSettings(prev => ({
                ...prev,
                force_create: checked as boolean
              }))}
            />
            <Label htmlFor="force_create">Force create (bypass limits and warnings)</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render review step
  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Review & Create</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">File Information</h4>
              <div className="space-y-1 text-sm">
                <div>File: {csvFile?.name}</div>
                <div>Transactions: {previewData?.total_transactions}</div>
                <div>Total Amount: {previewData?.total_amount.toLocaleString()} SEK</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Business</h4>
              <div className="space-y-1 text-sm">
                <div>Name: {selectedBusiness?.name}</div>
                <div>Tier: {selectedBusiness?.verification_tier}</div>
                <div>Contact: {selectedBusiness?.contact_email}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Settings</h4>
              <div className="space-y-1 text-sm">
                <div>Priority: {batchSettings.priority}</div>
                <div>Auto-start: {batchSettings.auto_start_verification ? 'Yes' : 'No'}</div>
                <div>Notify Business: {batchSettings.notify_business ? 'Yes' : 'No'}</div>
                <div>Fraud Check: {batchSettings.include_fraud_check ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {batchSettings.verification_notes && (
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-gray-700">{batchSettings.verification_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {selectedBusiness && selectedBusiness.current_week_batches >= selectedBusiness.weekly_limit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: This business has reached their weekly batch limit.
              Force create is {batchSettings.force_create ? 'enabled' : 'disabled'}.
            </AlertDescription>
          </Alert>
        )}

        {creationProgress.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{creationProgress.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )

  // Render progress step
  const renderProgressStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Creating Batch</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{creationProgress.message}</span>
            <span>{creationProgress.progress}%</span>
          </div>
          <Progress value={creationProgress.progress} className="h-2" />
        </div>

        <div className="text-center text-sm text-gray-600">
          This may take a few moments while we process your batch...
        </div>
      </CardContent>
    </Card>
  )

  // Render complete step
  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Batch Created Successfully</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <div className="text-lg">
            Batch created with ID:
            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
              {creationProgress.batch_id}
            </code>
          </div>

          <div className="flex justify-center space-x-2">
            <Button variant="outline" onClick={() => window.open(`/admin/batches/${creationProgress.batch_id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Batch
            </Button>
            <Button onClick={() => onBatchCreated?.(creationProgress.batch_id!)}>
              <Target className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render step content
  const renderStepContent = () => {
    switch (creationProgress.step) {
      case 'upload':
        return renderUploadStep()
      case 'business':
        return renderBusinessStep()
      case 'settings':
        return renderSettingsStep()
      case 'review':
        return renderReviewStep()
      case 'creating':
        return renderProgressStep()
      case 'complete':
        return renderCompleteStep()
      default:
        return null
    }
  }

  // Render navigation
  const renderNavigation = () => {
    if (creationProgress.step === 'creating' || creationProgress.step === 'complete') {
      return null
    }

    return (
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={creationProgress.step === 'upload' ? onCancel : prevStep}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {creationProgress.step === 'upload' ? 'Cancel' : 'Previous'}
        </Button>

        <Button
          onClick={nextStep}
          disabled={!canProceedToNext() || isLoading}
        >
          {creationProgress.step === 'review' ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              Create Batch
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {['upload', 'business', 'settings', 'review'].map((step, index) => {
          const isActive = creationProgress.step === step
          const isCompleted = ['upload', 'business', 'settings', 'review'].indexOf(creationProgress.step) > index

          return (
            <div key={step} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                isActive && "bg-blue-600 text-white",
                isCompleted && "bg-green-600 text-white",
                !isActive && !isCompleted && "bg-gray-200 text-gray-600"
              )}>
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              {index < 3 && (
                <div className={cn(
                  "w-12 h-1 mx-2",
                  isCompleted ? "bg-green-600" : "bg-gray-200"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      {renderNavigation()}
    </div>
  )
}