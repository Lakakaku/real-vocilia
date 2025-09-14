'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { ContextField } from './ContextCategories'

interface ContextFieldEditorProps {
  field: ContextField
  value: string | string[] | number
  onChange: (value: string | string[] | number) => void
  error?: string
  className?: string
}

export function ContextFieldEditor({ field, value, onChange, error, className }: ContextFieldEditorProps) {
  const [newOption, setNewOption] = useState('')

  const handleMultiSelectChange = (option: string, checked: boolean) => {
    const currentValue = Array.isArray(value) ? value : []

    if (checked) {
      onChange([...currentValue, option])
    } else {
      onChange(currentValue.filter(v => v !== option))
    }
  }

  const addCustomOption = () => {
    if (!newOption.trim()) return

    const currentValue = Array.isArray(value) ? value : []
    const options = field.options || []

    // Add to field options if not already present
    if (!options.includes(newOption.trim())) {
      field.options = [...options, newOption.trim()]
    }

    // Add to selected values
    if (!currentValue.includes(newOption.trim())) {
      onChange([...currentValue, newOption.trim()])
    }

    setNewOption('')
  }

  const renderTextInput = () => (
    <Input
      id={field.id}
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={error ? 'border-red-500' : ''}
    />
  )

  const renderNumberInput = () => (
    <Input
      id={field.id}
      type="number"
      value={typeof value === 'number' ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={field.placeholder}
      min={0}
      className={error ? 'border-red-500' : ''}
    />
  )

  const renderTextarea = () => (
    <Textarea
      id={field.id}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={3}
      className={error ? 'border-red-500' : ''}
    />
  )

  const renderSelect = () => (
    <Select
      value={typeof value === 'string' ? value : ''}
      onValueChange={(val) => onChange(val)}
    >
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const renderMultiSelect = () => {
    const currentValue = Array.isArray(value) ? value : []

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {field.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${option}`}
                checked={currentValue.includes(option)}
                onCheckedChange={(checked) =>
                  handleMultiSelectChange(option, checked as boolean)
                }
              />
              <Label
                htmlFor={`${field.id}-${option}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>

        {/* Show selected values */}
        {currentValue.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {currentValue.map((selectedValue) => (
              <Badge
                key={selectedValue}
                variant="secondary"
                className="text-xs"
              >
                {selectedValue}
                <button
                  type="button"
                  onClick={() => {
                    onChange(currentValue.filter(v => v !== selectedValue))
                  }}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add custom option */}
        <div className="flex space-x-2">
          <Input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Add custom option..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && addCustomOption()}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomOption}
            disabled={!newOption.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    )
  }

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return renderTextInput()
      case 'number':
        return renderNumberInput()
      case 'textarea':
        return renderTextarea()
      case 'select':
        return renderSelect()
      case 'multiselect':
        return renderMultiSelect()
      default:
        return renderTextInput()
    }
  }

  return (
    <div className={className}>
      {renderField()}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      {field.description && !error && (
        <p className="text-gray-500 text-sm mt-1">{field.description}</p>
      )}
    </div>
  )
}