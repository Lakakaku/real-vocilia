/**
 * useAutoSave Hook
 * Provides auto-save functionality with debouncing, conflict resolution, and status tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { debounce, deepEqual, detectConflicts, sanitizeContextData, type SaveStatus, type ContextDraft } from '../utils/context-helpers'

interface AutoSaveOptions {
  debounceMs?: number
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
  onConflict?: (conflicts: any[]) => void
  enabled?: boolean
}

interface AutoSaveReturn {
  saveStatus: SaveStatus
  save: (data: any, immediate?: boolean) => Promise<void>
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  clearUnsavedChanges: () => void
  retry: () => Promise<void>
}

export function useAutoSave(options: AutoSaveOptions): AutoSaveReturn {
  const {
    debounceMs = 2000,
    onSave,
    onConflict,
    enabled = true
  } = options

  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Refs to track current data and save operations
  const currentDataRef = useRef<any>(null)
  const publishedDataRef = useRef<any>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savePromiseRef = useRef<Promise<void> | null>(null)

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (data: any) => {
      if (!enabled) return

      await performSave(data)
    }, debounceMs),
    [enabled, debounceMs]
  )

  const performSave = useCallback(async (data: any) => {
    if (!data || !enabled) return

    setSaveStatus({ status: 'saving' })

    try {
      // Sanitize data before saving
      const sanitizedData = sanitizeContextData(data)

      // Check for conflicts if we have published data
      if (publishedDataRef.current && lastSaved) {
        const conflicts = detectConflicts(
          publishedDataRef.current,
          sanitizedData,
          lastSaved,
          new Date()
        )

        if (conflicts.hasConflicts && onConflict) {
          onConflict(conflicts.conflicts)
          setSaveStatus({
            status: 'error',
            error: 'Conflicts detected. Please resolve before saving.'
          })
          return
        }
      }

      const result = await onSave(sanitizedData)

      if (result.success) {
        const now = new Date()
        setLastSaved(now)
        setHasUnsavedChanges(false)
        publishedDataRef.current = sanitizedData
        setSaveStatus({ status: 'saved', lastSaved: now })

        // Auto-clear saved status after 3 seconds
        setTimeout(() => {
          setSaveStatus(prev => prev.status === 'saved' ? { status: 'idle', lastSaved: prev.lastSaved } : prev)
        }, 3000)
      } else {
        setSaveStatus({
          status: 'error',
          error: result.error || 'Failed to save changes'
        })
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      setSaveStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to save changes'
      })
    }
  }, [enabled, onSave, onConflict, lastSaved])

  const save = useCallback(async (data: any, immediate: boolean = false) => {
    currentDataRef.current = data

    // Check if data has actually changed
    if (publishedDataRef.current && deepEqual(data, publishedDataRef.current)) {
      setHasUnsavedChanges(false)
      return
    }

    setHasUnsavedChanges(true)

    if (immediate) {
      // Cancel any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      // Save immediately
      await performSave(data)
    } else {
      // Use debounced save
      debouncedSave(data)
    }
  }, [debouncedSave, performSave])

  const retry = useCallback(async () => {
    if (currentDataRef.current && hasUnsavedChanges) {
      await performSave(currentDataRef.current)
    }
  }, [performSave, hasUnsavedChanges])

  const clearUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Handle page unload with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    saveStatus,
    save,
    hasUnsavedChanges,
    lastSaved,
    clearUnsavedChanges,
    retry
  }
}

/**
 * Hook for managing draft data in localStorage
 */
export function useDraftStorage(businessId: string, category?: string) {
  const getDraftKey = useCallback((fieldId?: string) => {
    let key = `vocilia_draft_${businessId}`
    if (category) key += `_${category}`
    if (fieldId) key += `_${fieldId}`
    return key
  }, [businessId, category])

  const saveDraft = useCallback((data: any, fieldId?: string) => {
    try {
      const key = getDraftKey(fieldId)
      const draft: ContextDraft = {
        data,
        lastModified: new Date(),
        category,
        fieldId
      }
      localStorage.setItem(key, JSON.stringify(draft))
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }, [getDraftKey, category])

  const loadDraft = useCallback((fieldId?: string): ContextDraft | null => {
    try {
      const key = getDraftKey(fieldId)
      const stored = localStorage.getItem(key)
      if (stored) {
        const draft = JSON.parse(stored)
        return {
          ...draft,
          lastModified: new Date(draft.lastModified)
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
    }
    return null
  }, [getDraftKey])

  const clearDraft = useCallback((fieldId?: string) => {
    try {
      const key = getDraftKey(fieldId)
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [getDraftKey])

  const getAllDrafts = useCallback((): ContextDraft[] => {
    try {
      const drafts: ContextDraft[] = []
      const prefix = `vocilia_draft_${businessId}`

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(prefix)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            const draft = JSON.parse(stored)
            drafts.push({
              ...draft,
              lastModified: new Date(draft.lastModified)
            })
          }
        }
      }

      return drafts.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    } catch (error) {
      console.error('Failed to get all drafts:', error)
      return []
    }
  }, [businessId])

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    getAllDrafts,
    getDraftKey
  }
}