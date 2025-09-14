'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react'
import { ContextFieldEditor } from './ContextFieldEditor'
import { useContextData } from '../hooks/useContextData'
import { useAutoSave } from '../hooks/useAutoSave'
import { updateContextCategory } from '@/app/actions/context-actions'
import type { ContextCategory, ContextField } from './ContextCategories'

interface ContextCategoryModalProps {
  category: ContextCategory
  businessId: string
  isOpen: boolean
  onClose: () => void
  onSave?: (categoryId: string, fields: ContextField[]) => void
}

export function ContextCategoryModal({ category, businessId, isOpen, onClose, onSave }: ContextCategoryModalProps) {
  const [fields, setFields] = useState<ContextField[]>(category.fields)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Use context data hook with auto-save
  const {
    contextData,
    isLoading: contextLoading,
    error: contextError,
    saveStatus,
    hasUnsavedChanges,
    lastSaved,
    updateField,
    validation,
    hasDrafts,
    loadDraft,
    saveDraft,
    clearDraft
  } = useContextData({
    businessId,
    categoryId: category.id,
    autoSaveEnabled: true,
    loadOnMount: true
  })

  // Update fields when context data loads
  useEffect(() => {
    if (contextData && contextData.context_data[`${category.id}_data`]) {
      const categoryData = contextData.context_data[`${category.id}_data`]
      const updatedFields = fields.map(field => ({
        ...field,
        value: categoryData[field.id] || field.value
      }))
      setFields(updatedFields)
    }
  }, [contextData, category.id, fields.length])

  // Load draft on mount if available
  useEffect(() => {
    if (isOpen && hasDrafts) {
      const shouldLoadDraft = confirm('You have unsaved changes. Would you like to load your draft?')
      if (shouldLoadDraft) {
        loadDraft()
      }
    }
  }, [isOpen, hasDrafts, loadDraft])

  const handleFieldChange = (fieldId: string, value: any) => {
    // Update local state
    setFields(prev => prev.map(field =>
      field.id === fieldId ? { ...field, value } : field
    ))

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }

    // Update context data (triggers auto-save)
    updateField(fieldId, value)
  }

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach(field => {
      if (field.required) {
        if (!field.value ||
            (typeof field.value === 'string' && field.value.trim() === '') ||
            (Array.isArray(field.value) && field.value.length === 0) ||
            (typeof field.value === 'number' && field.value < 0)) {
          newErrors[field.id] = `${field.label} is required`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateCompletion = (): number => {
    const completedFields = fields.filter(field => {
      if (Array.isArray(field.value)) return field.value.length > 0
      if (typeof field.value === 'string') return field.value.trim().length > 0
      if (typeof field.value === 'number') return field.value >= 0
      return !!field.value
    })
    return Math.round((completedFields.length / fields.length) * 100)
  }

  const handleManualSave = async () => {
    if (!validateFields()) return

    try {
      // Trigger immediate save
      const categoryData = fields.reduce((acc, field) => {
        acc[field.id] = field.value
        return acc
      }, {} as Record<string, any>)

      if (onSave) {
        await onSave(category.id, fields)
      }

      clearDraft() // Clear draft after successful save
    } catch (error) {
      console.error('Error saving category:', error)
    }
  }

  const handleCancel = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const shouldSaveDraft = confirm('You have unsaved changes. Save as draft before closing?')
      if (shouldSaveDraft) {
        saveDraft()
      }
    }

    // Reset fields to original values
    setFields(category.fields)
    setErrors({})
    onClose()
  }

  const handleLoadDraft = () => {
    const loaded = loadDraft()
    if (loaded) {
      // Update local fields state after loading draft
      if (contextData && contextData.context_data[`${category.id}_data`]) {
        const categoryData = contextData.context_data[`${category.id}_data`]
        const updatedFields = fields.map(field => ({
          ...field,
          value: categoryData[field.id] || field.value
        }))
        setFields(updatedFields)
      }
    }
  }

  const getSaveStatusIcon = () => {
    switch (saveStatus.status) {
      case 'saving':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return hasUnsavedChanges ? <WifiOff className="h-4 w-4 text-yellow-500" /> : <Wifi className="h-4 w-4 text-gray-400" />
    }
  }

  const getSaveStatusText = () => {
    switch (saveStatus.status) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return `Saved ${lastSaved ? 'at ' + lastSaved.toLocaleTimeString() : ''}`
      case 'error':
        return `Error: ${saveStatus.error}`
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'
    }
  }

  const currentCompletion = calculateCompletion()
  const hasChanges = hasUnsavedChanges || JSON.stringify(fields) !== JSON.stringify(category.fields)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{category.icon}</span>
            <div className="flex-1">
              <DialogTitle className="text-xl">{category.title}</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">{category.description}</p>

              {/* Save Status Indicator */}
              <div className="flex items-center space-x-2 mt-2">
                {getSaveStatusIcon()}
                <span className="text-xs text-gray-500">{getSaveStatusText()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={currentCompletion >= 80 ? 'default' : 'secondary'}>
                {currentCompletion}% Complete
              </Badge>
              <Badge variant={category.priority === 'high' ? 'destructive' : 'default'}>
                {category.priority} priority
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Auto-saving
                </Badge>
              )}
            </div>
          </div>
          <Progress value={currentCompletion} className="w-full mt-3" />

          {/* Draft Controls */}
          {hasDrafts && (
            <div className="flex items-center space-x-2 mt-2">
              <Alert className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  You have a draft saved.
                  <Button variant="link" size="sm" onClick={handleLoadDraft} className="p-0 ml-1 h-auto">
                    Load draft
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Loading State */}
          {contextLoading && (
            <Alert className="mb-4">
              <Clock className="h-4 w-4 animate-spin" />
              <AlertDescription>Loading context data...</AlertDescription>
            </Alert>
          )}

          {/* Context Error */}
          {contextError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{contextError}</AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Please fix the following errors:
                <ul className="list-disc list-inside mt-2">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validation.warnings.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Recommendations to improve context quality:
                <ul className="list-disc list-inside mt-2">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={field.id} className="font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.description && (
                    <span className="text-sm text-gray-500">— {field.description}</span>
                  )}
                </div>

                <ContextFieldEditor
                  field={field}
                  value={field.value}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  error={errors[field.id]}
                />
              </div>
            ))}
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No fields available for this category.</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Progress:</span>
            <span>{fields.filter(f => {
              if (Array.isArray(f.value)) return f.value.length > 0
              if (typeof f.value === 'string') return f.value.trim().length > 0
              if (typeof f.value === 'number') return f.value >= 0
              return !!f.value
            }).length} of {fields.length} fields completed</span>

            {/* Status Indicators */}
            <div className="flex items-center space-x-1">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                  Auto-saving enabled
                </Badge>
              )}
              {saveStatus.status === 'saved' && (
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                  Saved automatically
                </Badge>
              )}
              {saveStatus.status === 'error' && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                  Save failed - Retry?
                </Badge>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {/* Draft Controls */}
            {hasUnsavedChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveDraft()}
                className="text-xs"
              >
                Save Draft
              </Button>
            )}

            {hasDrafts && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearDraft()}
                className="text-xs text-red-600"
              >
                Clear Draft
              </Button>
            )}

            {/* Main Actions */}
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saveStatus.status === 'saving'}
            >
              {hasUnsavedChanges ? 'Cancel (Save Draft)' : 'Close'}
            </Button>

            <Button
              onClick={handleManualSave}
              disabled={saveStatus.status === 'saving' || (!hasChanges && !validation.warnings.length)}
              className="min-w-[120px]"
            >
              {saveStatus.status === 'saving' ? (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                hasChanges ? 'Save Now' : 'All Saved'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}