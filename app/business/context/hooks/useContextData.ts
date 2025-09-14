/**
 * useContextData Hook
 * Manages context data loading, updating, and synchronization with optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAutoSave, useDraftStorage } from './useAutoSave'
import { deepEqual, deepMerge, validateContextData, calculateCompletenessScore, type SaveStatus } from '../utils/context-helpers'
import { updateContextCategory, getContextCategoryData } from '@/app/actions/context-actions'

interface ContextData {
  id?: string
  business_id: string
  context_data: any
  completeness_score: number
  last_saved_at?: Date
  has_unsaved_changes?: boolean
  draft_data?: any
}

interface UseContextDataOptions {
  businessId: string
  categoryId?: string
  autoSaveEnabled?: boolean
  loadOnMount?: boolean
}

interface UseContextDataReturn {
  contextData: ContextData | null
  isLoading: boolean
  error: string | null
  saveStatus: SaveStatus
  hasUnsavedChanges: boolean
  lastSaved: Date | null

  // Data operations
  updateField: (fieldId: string, value: any) => void
  updateCategory: (categoryId: string, categoryData: any) => void
  saveChanges: (immediate?: boolean) => Promise<void>
  reloadData: () => Promise<void>
  resetToPublished: () => void

  // Draft operations
  saveDraft: () => void
  loadDraft: () => boolean
  clearDraft: () => void
  hasDrafts: boolean

  // Validation
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export function useContextData(options: UseContextDataOptions): UseContextDataReturn {
  const {
    businessId,
    categoryId,
    autoSaveEnabled = true,
    loadOnMount = true
  } = options

  // State
  const [contextData, setContextData] = useState<ContextData | null>(null)
  const [publishedData, setPublishedData] = useState<ContextData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>({
    isValid: true,
    errors: [],
    warnings: []
  })

  // Refs for tracking changes
  const initialLoadRef = useRef(false)
  const currentChangesRef = useRef<any>({})

  // Draft storage
  const { saveDraft: saveDraftToStorage, loadDraft: loadDraftFromStorage, clearDraft: clearDraftFromStorage, getAllDrafts } = useDraftStorage(businessId, categoryId)

  // Auto-save functionality
  const autoSave = useAutoSave({
    debounceMs: 2000,
    enabled: autoSaveEnabled,
    onSave: async (data: any) => {
      try {
        if (categoryId) {
          const result = await updateContextCategory(businessId, categoryId, data)
          return result
        } else {
          // Save entire context (not implemented in current actions)
          throw new Error('Full context save not implemented')
        }
      } catch (error) {
        console.error('Save error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save'
        }
      }
    },
    onConflict: (conflicts) => {
      console.warn('Save conflicts detected:', conflicts)
      setError('Conflicts detected. Data may have been modified by another user.')
    }
  })

  // Load context data
  const loadData = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      const result = await getContextCategoryData(businessId, categoryId)

      if (!result.success) {
        setError(result.error || 'Failed to load context data')
        return
      }

      const loadedData: ContextData = {
        business_id: businessId,
        context_data: result.data?.context_data || {},
        completeness_score: result.data?.completeness_score || 0,
        last_saved_at: result.data?.updated_at ? new Date(result.data.updated_at) : undefined,
        has_unsaved_changes: false,
        draft_data: result.data?.draft_data || {}
      }

      setContextData(loadedData)
      setPublishedData(loadedData)

      // Validate loaded data
      const validationResult = validateContextData(loadedData.context_data)
      setValidation(validationResult)

    } catch (err) {
      console.error('Error loading context data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load context data')
    } finally {
      setIsLoading(false)
    }
  }, [businessId, categoryId])

  // Update a specific field
  const updateField = useCallback((fieldId: string, value: any) => {
    if (!contextData) return

    const updatedData = { ...contextData }

    if (categoryId) {
      // Update specific category field
      const categoryData = updatedData.context_data[`${categoryId}_data`] || {}
      categoryData[fieldId] = value
      updatedData.context_data[`${categoryId}_data`] = categoryData
    } else {
      // Update root field
      updatedData.context_data[fieldId] = value
    }

    // Recalculate completeness score
    updatedData.completeness_score = calculateCompletenessScore(updatedData.context_data)
    updatedData.has_unsaved_changes = !deepEqual(updatedData.context_data, publishedData?.context_data)

    setContextData(updatedData)
    currentChangesRef.current = updatedData.context_data

    // Validate updated data
    const validationResult = validateContextData(updatedData.context_data)
    setValidation(validationResult)

    // Trigger auto-save
    if (autoSaveEnabled) {
      autoSave.save(categoryId ? updatedData.context_data[`${categoryId}_data`] : updatedData.context_data)
    }
  }, [contextData, publishedData, categoryId, autoSaveEnabled, autoSave])

  // Update entire category
  const updateCategory = useCallback((targetCategoryId: string, categoryData: any) => {
    if (!contextData) return

    const updatedData = { ...contextData }
    updatedData.context_data[`${targetCategoryId}_data`] = categoryData
    updatedData.completeness_score = calculateCompletenessScore(updatedData.context_data)
    updatedData.has_unsaved_changes = !deepEqual(updatedData.context_data, publishedData?.context_data)

    setContextData(updatedData)
    currentChangesRef.current = updatedData.context_data

    // Validate updated data
    const validationResult = validateContextData(updatedData.context_data)
    setValidation(validationResult)

    // Trigger auto-save
    if (autoSaveEnabled) {
      autoSave.save(categoryData)
    }
  }, [contextData, publishedData, autoSaveEnabled, autoSave])

  // Save changes manually
  const saveChanges = useCallback(async (immediate: boolean = false) => {
    if (!contextData) return

    const dataToSave = categoryId
      ? contextData.context_data[`${categoryId}_data`]
      : contextData.context_data

    await autoSave.save(dataToSave, immediate)
  }, [contextData, categoryId, autoSave])

  // Reload data from server
  const reloadData = useCallback(async () => {
    await loadData(true)
  }, [loadData])

  // Reset to published version
  const resetToPublished = useCallback(() => {
    if (publishedData) {
      setContextData({ ...publishedData })
      currentChangesRef.current = publishedData.context_data
      autoSave.clearUnsavedChanges()

      // Validate reset data
      const validationResult = validateContextData(publishedData.context_data)
      setValidation(validationResult)
    }
  }, [publishedData, autoSave])

  // Draft operations
  const saveDraftOperation = useCallback(() => {
    if (contextData && contextData.has_unsaved_changes) {
      const dataToSave = categoryId
        ? contextData.context_data[`${categoryId}_data`]
        : contextData.context_data
      saveDraftToStorage(dataToSave)
    }
  }, [contextData, categoryId, saveDraftToStorage])

  const loadDraftOperation = useCallback((): boolean => {
    const draft = loadDraftFromStorage()
    if (draft && contextData) {
      const updatedData = { ...contextData }

      if (categoryId) {
        updatedData.context_data[`${categoryId}_data`] = draft.data
      } else {
        updatedData.context_data = deepMerge(updatedData.context_data, draft.data)
      }

      updatedData.completeness_score = calculateCompletenessScore(updatedData.context_data)
      updatedData.has_unsaved_changes = !deepEqual(updatedData.context_data, publishedData?.context_data)

      setContextData(updatedData)
      currentChangesRef.current = updatedData.context_data

      // Validate loaded draft
      const validationResult = validateContextData(updatedData.context_data)
      setValidation(validationResult)

      return true
    }
    return false
  }, [loadDraftFromStorage, contextData, publishedData, categoryId])

  const clearDraftOperation = useCallback(() => {
    clearDraftFromStorage()
  }, [clearDraftFromStorage])

  // Check if drafts exist
  const hasDrafts = getAllDrafts().length > 0

  // Load data on mount
  useEffect(() => {
    if (loadOnMount && !initialLoadRef.current) {
      initialLoadRef.current = true
      loadData()
    }
  }, [loadOnMount, loadData])

  // Auto-save draft periodically
  useEffect(() => {
    if (autoSaveEnabled && contextData?.has_unsaved_changes) {
      const interval = setInterval(() => {
        saveDraftOperation()
      }, 30000) // Save draft every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoSaveEnabled, contextData?.has_unsaved_changes, saveDraftOperation])

  return {
    contextData,
    isLoading,
    error,
    saveStatus: autoSave.saveStatus,
    hasUnsavedChanges: autoSave.hasUnsavedChanges || contextData?.has_unsaved_changes || false,
    lastSaved: autoSave.lastSaved,

    // Data operations
    updateField,
    updateCategory,
    saveChanges,
    reloadData,
    resetToPublished,

    // Draft operations
    saveDraft: saveDraftOperation,
    loadDraft: loadDraftOperation,
    clearDraft: clearDraftOperation,
    hasDrafts,

    // Validation
    validation
  }
}