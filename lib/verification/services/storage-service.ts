/**
 * Supabase Storage Service for File Upload and Download
 *
 * Handles secure file operations for CSV uploads, downloads, and
 * file management with proper access controls and audit logging.
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

// File upload types
export interface FileUploadOptions {
  bucket: string
  path: string
  file: File
  upsert?: boolean
  cacheControl?: string
  contentType?: string
  metadata?: Record<string, string>
}

export interface FileUploadResult {
  success: boolean
  path?: string
  signedUrl?: string
  error?: string
  metadata?: {
    size: number
    lastModified: Date
    contentType: string
    etag?: string
  }
}

// File download types
export interface FileDownloadOptions {
  bucket: string
  path: string
  expiresIn?: number // seconds
  transform?: {
    width?: number
    height?: number
    quality?: number
  }
}

export interface FileDownloadResult {
  success: boolean
  signedUrl?: string
  publicUrl?: string
  blob?: Blob
  error?: string
  metadata?: {
    size: number
    contentType: string
    lastModified: string
    etag?: string
  }
}

// File management types
export interface FileListOptions {
  bucket: string
  prefix?: string
  limit?: number
  offset?: number
  sortBy?: 'name' | 'updated_at' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

export interface FileInfo {
  name: string
  path: string
  size: number
  contentType: string
  lastModified: string
  etag?: string
  metadata?: Record<string, string>
}

export interface BatchUploadResult {
  successful: Array<{ path: string; signedUrl?: string }>
  failed: Array<{ path: string; error: string }>
  summary: {
    total: number
    successful: number
    failed: number
    totalSize: number
  }
}

// Storage buckets configuration
export const STORAGE_BUCKETS = {
  VERIFICATION_CSV: 'verification-csv',
  BATCH_UPLOADS: 'batch-uploads',
  EXPORT_FILES: 'export-files',
  TEMP_FILES: 'temp-files',
  AUDIT_EXPORTS: 'audit-exports',
} as const

export type StorageBucket = keyof typeof STORAGE_BUCKETS

// File path generators
export class StoragePathGenerator {
  /**
   * Generates path for CSV batch upload
   */
  static batchUpload(businessId: string, batchId: string, filename: string): string {
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `batches/${businessId}/${timestamp}/${batchId}/${filename}`
  }

  /**
   * Generates path for verification results export
   */
  static verificationExport(businessId: string, sessionId: string, filename: string): string {
    const timestamp = new Date().toISOString().slice(0, 10)
    return `exports/${businessId}/${timestamp}/${sessionId}/${filename}`
  }

  /**
   * Generates path for audit report export
   */
  static auditExport(businessId: string, reportId: string, filename: string): string {
    const timestamp = new Date().toISOString().slice(0, 10)
    return `audit/${businessId}/${timestamp}/${reportId}/${filename}`
  }

  /**
   * Generates path for temporary files
   */
  static tempFile(sessionId: string, filename: string): string {
    const timestamp = Date.now()
    return `temp/${sessionId}/${timestamp}-${filename}`
  }

  /**
   * Generates path for error reports
   */
  static errorReport(businessId: string, uploadId: string, filename: string): string {
    const timestamp = new Date().toISOString().slice(0, 10)
    return `errors/${businessId}/${timestamp}/${uploadId}/${filename}`
  }
}

export class VerificationStorageService {
  private supabase = createClient()
  private serverClient?: ReturnType<typeof createServerClient>

  constructor(useServerClient = false) {
    if (useServerClient) {
      this.serverClient = createServerClient()
    }
  }

  /**
   * Uploads a CSV file for batch processing
   */
  async uploadBatchCSV(options: {
    businessId: string
    batchId: string
    file: File
    filename?: string
  }): Promise<FileUploadResult> {
    try {
      const filename = options.filename || `transactions-${Date.now()}.csv`
      const path = StoragePathGenerator.batchUpload(options.businessId, options.batchId, filename)

      const uploadResult = await this.uploadFile({
        bucket: STORAGE_BUCKETS.BATCH_UPLOADS,
        path,
        file: options.file,
        contentType: 'text/csv',
        metadata: {
          businessId: options.businessId,
          batchId: options.batchId,
          uploadType: 'batch_csv',
          originalName: options.file.name,
        },
      })

      if (uploadResult.success && uploadResult.path) {
        // Generate signed URL for processing
        const signedUrl = await this.getSignedUrl({
          bucket: STORAGE_BUCKETS.BATCH_UPLOADS,
          path: uploadResult.path,
          expiresIn: 3600, // 1 hour
        })

        return {
          ...uploadResult,
          signedUrl: signedUrl.signedUrl,
        }
      }

      return uploadResult
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload batch CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Uploads verification results CSV export
   */
  async uploadVerificationExport(options: {
    businessId: string
    sessionId: string
    csvContent: string
    filename?: string
  }): Promise<FileUploadResult> {
    try {
      const filename = options.filename || `verification-results-${Date.now()}.csv`
      const path = StoragePathGenerator.verificationExport(options.businessId, options.sessionId, filename)

      // Create File from CSV content
      const csvBlob = new Blob([options.csvContent], { type: 'text/csv' })
      const file = new File([csvBlob], filename, { type: 'text/csv' })

      const uploadResult = await this.uploadFile({
        bucket: STORAGE_BUCKETS.EXPORT_FILES,
        path,
        file,
        contentType: 'text/csv',
        metadata: {
          businessId: options.businessId,
          sessionId: options.sessionId,
          exportType: 'verification_results',
          generatedAt: new Date().toISOString(),
        },
      })

      if (uploadResult.success && uploadResult.path) {
        // Generate signed URL for download
        const signedUrl = await this.getSignedUrl({
          bucket: STORAGE_BUCKETS.EXPORT_FILES,
          path: uploadResult.path,
          expiresIn: 86400, // 24 hours
        })

        return {
          ...uploadResult,
          signedUrl: signedUrl.signedUrl,
        }
      }

      return uploadResult
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload verification export: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Creates error report file for CSV validation failures
   */
  async createErrorReport(options: {
    businessId: string
    uploadId: string
    errorData: {
      errors: Array<{ row: number; field: string; message: string }>
      warnings: Array<{ row: number; field: string; message: string }>
      summary: { total_errors: number; total_warnings: number }
    }
  }): Promise<FileUploadResult> {
    try {
      const filename = `error-report-${Date.now()}.json`
      const path = StoragePathGenerator.errorReport(options.businessId, options.uploadId, filename)

      const errorReport = {
        uploadId: options.uploadId,
        businessId: options.businessId,
        generatedAt: new Date().toISOString(),
        ...options.errorData,
      }

      const jsonBlob = new Blob([JSON.stringify(errorReport, null, 2)], { type: 'application/json' })
      const file = new File([jsonBlob], filename, { type: 'application/json' })

      const uploadResult = await this.uploadFile({
        bucket: STORAGE_BUCKETS.EXPORT_FILES,
        path,
        file,
        contentType: 'application/json',
        metadata: {
          businessId: options.businessId,
          uploadId: options.uploadId,
          reportType: 'error_report',
          errorCount: options.errorData.summary.total_errors.toString(),
          warningCount: options.errorData.summary.total_warnings.toString(),
        },
      })

      if (uploadResult.success && uploadResult.path) {
        const signedUrl = await this.getSignedUrl({
          bucket: STORAGE_BUCKETS.EXPORT_FILES,
          path: uploadResult.path,
          expiresIn: 86400, // 24 hours
        })

        return {
          ...uploadResult,
          signedUrl: signedUrl.signedUrl,
        }
      }

      return uploadResult
    } catch (error) {
      return {
        success: false,
        error: `Failed to create error report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Generic file upload method
   */
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(options.bucket)
        .upload(options.path, options.file, {
          upsert: options.upsert || false,
          cacheControl: options.cacheControl || '3600',
          contentType: options.contentType || options.file.type,
          metadata: options.metadata,
        })

      if (error) {
        return {
          success: false,
          error: `Storage upload failed: ${error.message}`,
        }
      }

      return {
        success: true,
        path: data.path,
        metadata: {
          size: options.file.size,
          lastModified: new Date(options.file.lastModified),
          contentType: options.file.type,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Downloads file content as blob
   */
  async downloadFile(options: FileDownloadOptions): Promise<FileDownloadResult> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(options.bucket)
        .download(options.path)

      if (error) {
        return {
          success: false,
          error: `Download failed: ${error.message}`,
        }
      }

      return {
        success: true,
        blob: data,
        metadata: {
          size: data.size,
          contentType: data.type,
          lastModified: new Date().toISOString(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Download error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Gets signed URL for temporary access
   */
  async getSignedUrl(options: FileDownloadOptions): Promise<FileDownloadResult> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(options.bucket)
        .createSignedUrl(options.path, options.expiresIn || 3600)

      if (error) {
        return {
          success: false,
          error: `Signed URL generation failed: ${error.message}`,
        }
      }

      return {
        success: true,
        signedUrl: data.signedUrl,
      }
    } catch (error) {
      return {
        success: false,
        error: `Signed URL error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Gets public URL for files in public buckets
   */
  getPublicUrl(bucket: string, path: string): string {
    const client = this.serverClient || this.supabase
    const { data } = client.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /**
   * Lists files in a bucket with filtering
   */
  async listFiles(options: FileListOptions): Promise<{
    success: boolean
    files?: FileInfo[]
    error?: string
  }> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(options.bucket)
        .list(options.prefix, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: { column: options.sortBy || 'created_at', order: options.sortOrder || 'desc' },
        })

      if (error) {
        return {
          success: false,
          error: `File listing failed: ${error.message}`,
        }
      }

      const files: FileInfo[] = data.map(file => ({
        name: file.name,
        path: `${options.prefix || ''}${file.name}`,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: file.updated_at || file.created_at,
        etag: file.metadata?.eTag,
        metadata: file.metadata || {},
      }))

      return {
        success: true,
        files,
      }
    } catch (error) {
      return {
        success: false,
        error: `File listing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Deletes a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const client = this.serverClient || this.supabase

      const { error } = await client.storage
        .from(bucket)
        .remove([path])

      if (error) {
        return {
          success: false,
          error: `File deletion failed: ${error.message}`,
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Deletes multiple files in batch
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<{
    success: boolean
    deleted: string[]
    failed: Array<{ path: string; error: string }>
  }> {
    const deleted: string[] = []
    const failed: Array<{ path: string; error: string }> = []

    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(bucket)
        .remove(paths)

      if (error) {
        // If batch deletion fails, try individual deletions
        for (const path of paths) {
          const result = await this.deleteFile(bucket, path)
          if (result.success) {
            deleted.push(path)
          } else {
            failed.push({ path, error: result.error || 'Unknown error' })
          }
        }
      } else {
        deleted.push(...paths)
      }

      return {
        success: failed.length === 0,
        deleted,
        failed,
      }
    } catch (error) {
      return {
        success: false,
        deleted,
        failed: paths.map(path => ({
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      }
    }
  }

  /**
   * Moves/renames a file
   */
  async moveFile(bucket: string, fromPath: string, toPath: string): Promise<{
    success: boolean
    newPath?: string
    error?: string
  }> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(bucket)
        .move(fromPath, toPath)

      if (error) {
        return {
          success: false,
          error: `File move failed: ${error.message}`,
        }
      }

      return {
        success: true,
        newPath: data.path,
      }
    } catch (error) {
      return {
        success: false,
        error: `Move error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Copies a file to a new location
   */
  async copyFile(bucket: string, fromPath: string, toPath: string): Promise<{
    success: boolean
    newPath?: string
    error?: string
  }> {
    try {
      const client = this.serverClient || this.supabase

      const { data, error } = await client.storage
        .from(bucket)
        .copy(fromPath, toPath)

      if (error) {
        return {
          success: false,
          error: `File copy failed: ${error.message}`,
        }
      }

      return {
        success: true,
        newPath: data.path,
      }
    } catch (error) {
      return {
        success: false,
        error: `Copy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Gets file metadata without downloading
   */
  async getFileMetadata(bucket: string, path: string): Promise<{
    success: boolean
    metadata?: {
      size: number
      contentType: string
      lastModified: string
      etag?: string
      customMetadata?: Record<string, string>
    }
    error?: string
  }> {
    try {
      const client = this.serverClient || this.supabase

      // Use HEAD request to get metadata only
      const { data, error } = await client.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop(),
        })

      if (error) {
        return {
          success: false,
          error: `Metadata retrieval failed: ${error.message}`,
        }
      }

      const file = data.find(f => f.name === path.split('/').pop())
      if (!file) {
        return {
          success: false,
          error: 'File not found',
        }
      }

      return {
        success: true,
        metadata: {
          size: file.metadata?.size || 0,
          contentType: file.metadata?.mimetype || 'application/octet-stream',
          lastModified: file.updated_at || file.created_at,
          etag: file.metadata?.eTag,
          customMetadata: file.metadata || {},
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Metadata error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Cleans up temporary files older than specified age
   */
  async cleanupTempFiles(options: {
    maxAgeHours?: number
    dryRun?: boolean
  } = {}): Promise<{
    success: boolean
    deletedCount: number
    totalSize: number
    errors: string[]
  }> {
    const maxAgeHours = options.maxAgeHours || 24
    const dryRun = options.dryRun || false
    const errors: string[] = []
    let deletedCount = 0
    let totalSize = 0

    try {
      const listResult = await this.listFiles({
        bucket: STORAGE_BUCKETS.TEMP_FILES,
        prefix: 'temp/',
        limit: 1000,
      })

      if (!listResult.success || !listResult.files) {
        return {
          success: false,
          deletedCount: 0,
          totalSize: 0,
          errors: [listResult.error || 'Failed to list temp files'],
        }
      }

      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours)

      const filesToDelete: string[] = []

      for (const file of listResult.files) {
        const fileDate = new Date(file.lastModified)
        if (fileDate < cutoffTime) {
          filesToDelete.push(file.path)
          totalSize += file.size
        }
      }

      if (!dryRun && filesToDelete.length > 0) {
        const deleteResult = await this.deleteFiles(STORAGE_BUCKETS.TEMP_FILES, filesToDelete)
        deletedCount = deleteResult.deleted.length
        errors.push(...deleteResult.failed.map(f => f.error))
      } else {
        deletedCount = filesToDelete.length
      }

      return {
        success: true,
        deletedCount,
        totalSize,
        errors,
      }
    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        totalSize: 0,
        errors: [error instanceof Error ? error.message : 'Unknown cleanup error'],
      }
    }
  }

  /**
   * Validates file access permissions
   */
  async validateFileAccess(options: {
    bucket: string
    path: string
    businessId: string
    operation: 'read' | 'write' | 'delete'
  }): Promise<{
    allowed: boolean
    reason?: string
  }> {
    try {
      // Extract business ID from path if present
      const pathBusinessId = options.path.split('/')[1] // Assuming format: prefix/businessId/...

      // Check if path belongs to the requesting business
      if (pathBusinessId !== options.businessId) {
        return {
          allowed: false,
          reason: 'File does not belong to the requesting business',
        }
      }

      // Additional bucket-specific checks
      switch (options.bucket) {
        case STORAGE_BUCKETS.BATCH_UPLOADS:
          // Only allow business to access their own batch uploads
          return { allowed: pathBusinessId === options.businessId }

        case STORAGE_BUCKETS.EXPORT_FILES:
          // Only allow business to access their own exports
          return { allowed: pathBusinessId === options.businessId }

        case STORAGE_BUCKETS.AUDIT_EXPORTS:
          // Audit exports may have stricter access controls
          if (options.operation === 'delete') {
            return {
              allowed: false,
              reason: 'Audit files cannot be deleted',
            }
          }
          return { allowed: pathBusinessId === options.businessId }

        case STORAGE_BUCKETS.TEMP_FILES:
          // Temp files can be accessed by any authenticated user
          return { allowed: true }

        default:
          return {
            allowed: false,
            reason: 'Unknown bucket',
          }
      }
    } catch (error) {
      return {
        allowed: false,
        reason: `Access validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}

// Utility functions for file operations
export class StorageUtils {
  /**
   * Generates unique filename with timestamp
   */
  static generateUniqueFilename(originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(7)
    const extension = originalName.split('.').pop()
    const baseName = originalName.replace(/\.[^/.]+$/, '')

    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-')
    const prefixStr = prefix ? `${prefix}-` : ''

    return `${prefixStr}${cleanBaseName}-${timestamp}-${randomSuffix}.${extension}`
  }

  /**
   * Validates file type and size
   */
  static validateFile(file: File, options: {
    allowedTypes?: string[]
    maxSizeBytes?: number
    minSizeBytes?: number
  } = {}): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const allowedTypes = options.allowedTypes || ['text/csv', 'application/json']
    const maxSize = options.maxSizeBytes || 10 * 1024 * 1024 // 10MB default
    const minSize = options.minSizeBytes || 1

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(2)}MB`)
    }

    if (file.size < minSize) {
      errors.push(`File size ${file.size} bytes is below minimum of ${minSize} bytes`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * Extracts file extension
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Checks if filename is safe (no directory traversal, etc.)
   */
  static isSafeFilename(filename: string): boolean {
    // Check for directory traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    if (invalidChars.test(filename)) {
      return false
    }

    // Check length
    if (filename.length > 255) {
      return false
    }

    return true
  }
}