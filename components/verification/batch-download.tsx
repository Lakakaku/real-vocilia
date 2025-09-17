'use client'

/**
 * BatchDownload - Component for downloading verification batch files
 *
 * Features:
 * - Download original batch CSV files
 * - Export verification results in multiple formats
 * - Progress indication during download
 * - Error handling with retry functionality
 * - Support for different download types
 * - Metadata options for exported files
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  File,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BatchDownloadProps {
  sessionId?: string
  batchId?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  onDownloadStart?: (type: string, format: string) => void
  onDownloadComplete?: (type: string, format: string, success: boolean) => void
}

type DownloadType = 'batch_csv' | 'verification_results'
type ExportFormat = 'csv' | 'json'

interface DownloadOptions {
  include_metadata: boolean
  include_fraud_assessment: boolean
  include_audit_trail: boolean
  include_timing_data: boolean
}

interface DownloadState {
  isDownloading: boolean
  downloadType: DownloadType | null
  progress: number
  error: string | null
  success: boolean
}

export function BatchDownload({
  sessionId,
  batchId,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  onDownloadStart,
  onDownloadComplete
}: BatchDownloadProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    downloadType: null,
    progress: 0,
    error: null,
    success: false
  })

  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    include_metadata: true,
    include_fraud_assessment: true,
    include_audit_trail: false,
    include_timing_data: true
  })

  // Handle download request
  const handleDownload = async (type: DownloadType, format: ExportFormat = 'csv') => {
    if (disabled || downloadState.isDownloading) return

    try {
      setDownloadState({
        isDownloading: true,
        downloadType: type,
        progress: 0,
        error: null,
        success: false
      })

      if (onDownloadStart) {
        onDownloadStart(type, format)
      }

      let downloadUrl: string
      let requestBody: any = null

      if (type === 'batch_csv') {
        // Download original batch CSV
        if (!batchId) {
          throw new Error('Batch ID is required for batch CSV download')
        }

        downloadUrl = '/api/verification/download'
        requestBody = {
          type: 'batch_csv',
          batch_id: batchId,
          format: format
        }
      } else {
        // Download verification results
        if (!sessionId) {
          throw new Error('Session ID is required for verification results download')
        }

        downloadUrl = `/api/admin/verification-results/${sessionId}/download?format=${format}&include_metadata=${downloadOptions.include_metadata}&include_fraud_assessment=${downloadOptions.include_fraud_assessment}&include_audit_trail=${downloadOptions.include_audit_trail}&include_timing_data=${downloadOptions.include_timing_data}`
      }

      // Update progress
      setDownloadState(prev => ({ ...prev, progress: 25 }))

      let response: Response

      if (type === 'batch_csv') {
        // POST request for batch download
        response = await fetch(downloadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })
      } else {
        // GET request for verification results
        response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
      }

      setDownloadState(prev => ({ ...prev, progress: 50 }))

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Download failed: ${response.statusText}`)
      }

      setDownloadState(prev => ({ ...prev, progress: 75 }))

      // Get the file content
      const blob = await response.blob()

      // Extract filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `download.${format}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadState({
        isDownloading: false,
        downloadType: null,
        progress: 100,
        error: null,
        success: true
      })

      if (onDownloadComplete) {
        onDownloadComplete(type, format, true)
      }

      // Clear success state after 3 seconds
      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, success: false }))
      }, 3000)

    } catch (error) {
      console.error('Download failed:', error)

      const errorMessage = error instanceof Error ? error.message : 'Download failed'

      setDownloadState({
        isDownloading: false,
        downloadType: null,
        progress: 0,
        error: errorMessage,
        success: false
      })

      if (onDownloadComplete) {
        onDownloadComplete(type, format, false)
      }

      // Clear error after 5 seconds
      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, error: null }))
      }, 5000)
    }
  }

  // Retry download
  const retryDownload = () => {
    if (downloadState.downloadType) {
      handleDownload(downloadState.downloadType)
    }
  }

  // Simple download button (when only one option is available)
  const renderSimpleButton = (type: DownloadType, label: string, icon: React.ComponentType<any>) => {
    const IconComponent = icon

    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || downloadState.isDownloading}
        onClick={() => handleDownload(type)}
        className={cn('flex items-center space-x-2', className)}
      >
        {downloadState.isDownloading && downloadState.downloadType === type ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloadState.success ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <IconComponent className="h-4 w-4" />
        )}
        <span>{label}</span>
        {downloadState.isDownloading && downloadState.downloadType === type && (
          <Badge variant="secondary" className="ml-2">
            {downloadState.progress}%
          </Badge>
        )}
      </Button>
    )
  }

  // Render dropdown menu for multiple options
  const renderDropdownButton = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || downloadState.isDownloading}
            className={cn('flex items-center space-x-2', className)}
          >
            {downloadState.isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : downloadState.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Download Options</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Batch CSV Download */}
          {batchId && (
            <DropdownMenuItem onClick={() => handleDownload('batch_csv', 'csv')}>
              <FileText className="h-4 w-4 mr-2" />
              Original Batch CSV
            </DropdownMenuItem>
          )}

          {/* Verification Results */}
          {sessionId && (
            <>
              <DropdownMenuItem onClick={() => handleDownload('verification_results', 'csv')}>
                <Database className="h-4 w-4 mr-2" />
                Verification Results (CSV)
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => handleDownload('verification_results', 'json')}>
                <File className="h-4 w-4 mr-2" />
                Verification Results (JSON)
              </DropdownMenuItem>
            </>
          )}

          {/* Export Options */}
          {sessionId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>

              <DropdownMenuCheckboxItem
                checked={downloadOptions.include_metadata}
                onCheckedChange={(checked) =>
                  setDownloadOptions(prev => ({ ...prev, include_metadata: checked }))
                }
              >
                Include Metadata
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={downloadOptions.include_fraud_assessment}
                onCheckedChange={(checked) =>
                  setDownloadOptions(prev => ({ ...prev, include_fraud_assessment: checked }))
                }
              >
                Include AI Assessment
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={downloadOptions.include_timing_data}
                onCheckedChange={(checked) =>
                  setDownloadOptions(prev => ({ ...prev, include_timing_data: checked }))
                }
              >
                Include Timing Data
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={downloadOptions.include_audit_trail}
                onCheckedChange={(checked) =>
                  setDownloadOptions(prev => ({ ...prev, include_audit_trail: checked }))
                }
              >
                Include Audit Trail
              </DropdownMenuCheckboxItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-2">
      {/* Main Download Button */}
      {sessionId && batchId ? (
        renderDropdownButton()
      ) : batchId ? (
        renderSimpleButton('batch_csv', 'Download CSV', FileText)
      ) : sessionId ? (
        renderDropdownButton()
      ) : (
        <Button variant={variant} size={size} disabled className={className}>
          <AlertCircle className="h-4 w-4 mr-2" />
          No Data Available
        </Button>
      )}

      {/* Progress Bar */}
      {downloadState.isDownloading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${downloadState.progress}%` }}
          ></div>
        </div>
      )}

      {/* Error Message */}
      {downloadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{downloadState.error}</span>
            <Button variant="outline" size="sm" onClick={retryDownload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {downloadState.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Download completed successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Utility function for triggering downloads programmatically
export async function downloadBatchFile(
  sessionId?: string,
  batchId?: string,
  type: DownloadType = 'batch_csv',
  format: ExportFormat = 'csv',
  options?: Partial<DownloadOptions>
): Promise<boolean> {
  try {
    let downloadUrl: string
    let requestBody: any = null

    if (type === 'batch_csv') {
      if (!batchId) {
        throw new Error('Batch ID is required for batch CSV download')
      }

      downloadUrl = '/api/verification/download'
      requestBody = {
        type: 'batch_csv',
        batch_id: batchId,
        format: format
      }
    } else {
      if (!sessionId) {
        throw new Error('Session ID is required for verification results download')
      }

      const params = new URLSearchParams({
        format,
        include_metadata: String(options?.include_metadata ?? true),
        include_fraud_assessment: String(options?.include_fraud_assessment ?? true),
        include_audit_trail: String(options?.include_audit_trail ?? false),
        include_timing_data: String(options?.include_timing_data ?? true)
      })

      downloadUrl = `/api/admin/verification-results/${sessionId}/download?${params}`
    }

    let response: Response

    if (type === 'batch_csv') {
      response = await fetch(downloadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
    } else {
      response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `download.${format}`

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return true

  } catch (error) {
    console.error('Download failed:', error)
    return false
  }
}