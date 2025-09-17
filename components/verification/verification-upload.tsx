'use client'

/**
 * VerificationUpload - CSV upload component for payment batch verification
 *
 * Features:
 * - Drag and drop file upload with validation
 * - CSV format validation and preview
 * - File size and security checks
 * - Progress tracking during upload
 * - Error handling with detailed messages
 * - Success feedback with session creation
 * - Mobile-responsive design
 */

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Upload,
  File,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationUploadProps {
  onUploadSuccess?: (sessionId: string, batchId: string) => void
  onUploadError?: (error: string) => void
  maxFileSize?: number // in bytes
  acceptedFileTypes?: string[]
  className?: string
}

interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fileInfo?: {
    name: string
    size: number
    type: string
    lastModified: Date
  }
  csvPreview?: {
    headers: string[]
    sampleRows: string[][]
    totalRows: number
  }
}

interface UploadState {
  file: File | null
  validation: FileValidationResult | null
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
  sessionId: string | null
  batchId: string | null
}

interface UploadMetadata {
  week_number: number
  year_number: number
  business_notes: string
  priority_level: 'low' | 'medium' | 'high'
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ACCEPTED_TYPES = ['.csv', 'text/csv', 'application/csv']

export function VerificationUpload({
  onUploadSuccess,
  onUploadError,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  className
}: VerificationUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    validation: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    sessionId: null,
    batchId: null
  })

  const [metadata, setMetadata] = useState<UploadMetadata>({
    week_number: new Date().getWeek(), // Custom extension for week number
    year_number: new Date().getFullYear(),
    business_notes: '',
    priority_level: 'medium'
  })

  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate uploaded file
  const validateFile = useCallback(async (file: File): Promise<FileValidationResult> => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isValidType = acceptedFileTypes.some(type =>
      type.includes(fileExtension || '') ||
      file.type.includes(type.replace('.', ''))
    )

    if (!isValidType) {
      errors.push(`File type not supported. Please upload a CSV file.`)
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds limit. Maximum size is ${Math.round(maxFileSize / (1024 * 1024))}MB.`)
    }

    if (file.size === 0) {
      errors.push('File is empty.')
    }

    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    }

    // If basic validation fails, return early
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        fileInfo
      }
    }

    // Parse CSV content for preview and validation
    try {
      const content = await file.text()
      const lines = content.split('\n').filter(line => line.trim().length > 0)

      if (lines.length === 0) {
        errors.push('CSV file contains no data.')
      } else if (lines.length === 1) {
        errors.push('CSV file contains only headers, no data rows.')
      } else if (lines.length > 10000) {
        warnings.push(`Large file detected (${lines.length} rows). Processing may take longer.`)
      }

      // Parse headers
      const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : []

      // Required columns for payment verification
      const requiredColumns = [
        'amount', 'recipient_name', 'recipient_account', 'reference'
      ]

      const missingColumns = requiredColumns.filter(col =>
        !headers.some(header =>
          header.toLowerCase().includes(col) ||
          col.includes(header.toLowerCase())
        )
      )

      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
      }

      // Sample data rows for preview (max 5 rows)
      const sampleRows = lines.slice(1, 6).map(line =>
        line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      )

      // Check for consistent column count
      const headerCount = headers.length
      const inconsistentRows = sampleRows.filter(row => row.length !== headerCount)

      if (inconsistentRows.length > 0) {
        warnings.push('Some rows have inconsistent column counts. Please verify CSV format.')
      }

      // Basic data validation on sample
      if (sampleRows.length > 0) {
        const amountColumnIndex = headers.findIndex(h =>
          h.toLowerCase().includes('amount') ||
          h.toLowerCase().includes('sum') ||
          h.toLowerCase().includes('total')
        )

        if (amountColumnIndex >= 0) {
          const invalidAmounts = sampleRows.filter(row => {
            const amount = row[amountColumnIndex]?.replace(/[^\d.,]/g, '')
            return !amount || isNaN(parseFloat(amount))
          })

          if (invalidAmounts.length > 0) {
            warnings.push('Some amount values may be invalid. Please verify numeric format.')
          }
        }
      }

      const csvPreview = {
        headers,
        sampleRows,
        totalRows: lines.length - 1 // Exclude header
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo,
        csvPreview
      }

    } catch (parseError) {
      errors.push('Failed to parse CSV file. Please check file format.')
      return {
        isValid: false,
        errors,
        warnings,
        fileInfo
      }
    }
  }, [acceptedFileTypes, maxFileSize])

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      file,
      validation: null,
      error: null,
      success: false
    }))

    // Validate the file
    const validation = await validateFile(file)
    setUploadState(prev => ({ ...prev, validation }))
  }, [validateFile])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Clear selected file
  const clearFile = () => {
    setUploadState({
      file: null,
      validation: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false,
      sessionId: null,
      batchId: null
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload file
  const handleUpload = async () => {
    if (!uploadState.file || !uploadState.validation?.isValid) return

    try {
      setUploadState(prev => ({
        ...prev,
        uploading: true,
        progress: 0,
        error: null,
        success: false
      }))

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('csv_file', uploadState.file)
      formData.append('metadata', JSON.stringify({
        week_number: metadata.week_number,
        year_number: metadata.year_number,
        business_notes: metadata.business_notes.trim() || undefined,
        priority_level: metadata.priority_level,
        total_transactions: uploadState.validation.csvPreview?.totalRows || 0,
        filename: uploadState.file.name,
        file_size: uploadState.file.size
      }))

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 15, 85)
        }))
      }, 200)

      const response = await fetch('/api/verification/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 100,
        success: true,
        sessionId: result.verification_session.id,
        batchId: result.batch.id
      }))

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(result.verification_session.id, result.batch.id)
      }

      // Clear success state after 5 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }))
      }, 5000)

    } catch (error) {
      console.error('Upload failed:', error)

      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: errorMessage
      }))

      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Payment Batch</CardTitle>
          <CardDescription>
            Select a CSV file containing payment transactions for verification.
            Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!uploadState.file ? (
            /* Drop Zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop your CSV file here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: CSV files up to {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFileTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* File Selected */
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-medium">{uploadState.file.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatFileSize(uploadState.file.size)} •
                      {uploadState.validation?.csvPreview?.totalRows.toLocaleString() || '?'} rows
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {uploadState.validation?.csvPreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFile}
                    disabled={uploadState.uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Validation Results */}
              {uploadState.validation && (
                <div className="space-y-3">
                  {/* Errors */}
                  {uploadState.validation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-1">Validation Errors:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {uploadState.validation.errors.map((error, i) => (
                            <li key={i} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Warnings */}
                  {uploadState.validation.warnings.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <div className="font-medium mb-1 text-yellow-800">Warnings:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {uploadState.validation.warnings.map((warning, i) => (
                            <li key={i} className="text-sm text-yellow-700">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success */}
                  {uploadState.validation.isValid && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        CSV file is valid and ready for upload.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Form (when file is valid) */}
      {uploadState.file && uploadState.validation?.isValid && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
            <CardDescription>
              Provide additional information about this payment batch
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="week_number">Week Number</Label>
                <Input
                  id="week_number"
                  type="number"
                  min="1"
                  max="53"
                  value={metadata.week_number}
                  onChange={(e) => setMetadata(prev => ({ ...prev, week_number: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <Label htmlFor="year_number">Year</Label>
                <Input
                  id="year_number"
                  type="number"
                  min="2020"
                  max="2030"
                  value={metadata.year_number}
                  onChange={(e) => setMetadata(prev => ({ ...prev, year_number: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="priority_level">Priority Level</Label>
              <select
                id="priority_level"
                value={metadata.priority_level}
                onChange={(e) => setMetadata(prev => ({ ...prev, priority_level: e.target.value as any }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <Label htmlFor="business_notes">Notes (Optional)</Label>
              <Textarea
                id="business_notes"
                placeholder="Add any notes about this batch..."
                value={metadata.business_notes}
                onChange={(e) => setMetadata(prev => ({ ...prev, business_notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadState.uploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-gray-600">{Math.round(uploadState.progress)}%</span>
              </div>
              <Progress value={uploadState.progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {uploadState.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium mb-1">Upload Successful!</div>
            <p>Verification session created. You can now start verifying transactions.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Button */}
      {uploadState.file && uploadState.validation?.isValid && !uploadState.success && (
        <Button
          onClick={handleUpload}
          disabled={uploadState.uploading}
          className="w-full"
          size="lg"
        >
          {uploadState.uploading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Upload className="h-5 w-5 mr-2" />
          )}
          {uploadState.uploading ? 'Uploading...' : 'Start Verification Process'}
        </Button>
      )}

      {/* CSV Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>CSV Preview</DialogTitle>
            <DialogDescription>
              Preview of the first 5 rows from your CSV file
            </DialogDescription>
          </DialogHeader>

          {uploadState.validation?.csvPreview && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <Badge variant="outline">
                  {uploadState.validation.csvPreview.totalRows} rows
                </Badge>
                <Badge variant="outline">
                  {uploadState.validation.csvPreview.headers.length} columns
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {uploadState.validation.csvPreview.headers.map((header, i) => (
                        <TableHead key={i}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadState.validation.csvPreview.sampleRows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="max-w-[200px] truncate">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Extend Date prototype for week number calculation
declare global {
  interface Date {
    getWeek(): number
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}