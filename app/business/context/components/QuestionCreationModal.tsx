'use client'

/**
 * Question Creation Modal Component
 * Modal for creating and editing custom questions
 * Agent: business-onboarding
 */

import { useState, useEffect } from 'react'
import { X, HelpCircle, Calendar, Target, BarChart3, Globe } from 'lucide-react'
import type { QuestionFormData, CustomQuestion, QUESTION_CATEGORIES } from '@/types/custom-questions'
import { CustomQuestionsService } from '@/lib/services/custom-questions-service'

interface QuestionCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: QuestionFormData) => void
  stores?: Array<{ id: string; name: string }>
  businessType: string
  initialData?: CustomQuestion | null
}

export function QuestionCreationModal({
  isOpen,
  onClose,
  onSubmit,
  stores = [],
  businessType,
  initialData,
}: QuestionCreationModalProps) {
  const [formData, setFormData] = useState<QuestionFormData>({
    text: '',
    textSv: '',
    frequencyType: 'every_nth',
    frequencyValue: 10,
    stores: 'all',
    seasonalEnabled: false,
    priority: 5,
    followUpEnabled: true,
    category: 'general_satisfaction',
  })

  const [validation, setValidation] = useState<{
    errors: string[]
    warnings: string[]
    suggestions: string[]
  }>({
    errors: [],
    warnings: [],
    suggestions: [],
  })

  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        text: initialData.text,
        textSv: initialData.textSv,
        frequencyType: initialData.frequency.type,
        frequencyValue: initialData.frequency.value,
        stores: initialData.targeting.stores,
        seasonalEnabled: initialData.seasonal.enabled,
        seasonalStart: initialData.seasonal.startDate ? new Date(initialData.seasonal.startDate) : undefined,
        seasonalEnd: initialData.seasonal.endDate ? new Date(initialData.seasonal.endDate) : undefined,
        seasonalRecurring: initialData.seasonal.recurring,
        priority: initialData.priority,
        followUpEnabled: initialData.metadata?.followUpEnabled || true,
        category: initialData.metadata?.category,
      })

      if (Array.isArray(initialData.targeting.stores)) {
        setSelectedStores(initialData.targeting.stores)
      }
    }
  }, [initialData])

  const handleTextChange = async (text: string) => {
    setFormData({ ...formData, text })

    // Real-time validation
    if (text.length >= 10) {
      const result = await CustomQuestionsService.validateQuestion({ ...formData, text })
      setValidation({
        errors: result.errors,
        warnings: result.warnings,
        suggestions: result.suggestions,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { stores: _, ...restFormData } = formData
    const finalData: QuestionFormData = {
      ...restFormData,
      stores: selectedStores.length > 0 ? selectedStores : 'all',
    }

    const result = await CustomQuestionsService.validateQuestion(finalData)

    if (!result.isValid) {
      setValidation({
        errors: result.errors,
        warnings: result.warnings,
        suggestions: result.suggestions,
      })
      return
    }

    onSubmit(finalData)
  }

  const categories = [
    { value: 'service_quality', label: 'Service Quality' },
    { value: 'product_feedback', label: 'Product Feedback' },
    { value: 'staff_performance', label: 'Staff Performance' },
    { value: 'store_experience', label: 'Store Experience' },
    { value: 'pricing_value', label: 'Pricing & Value' },
    { value: 'cleanliness_hygiene', label: 'Cleanliness' },
    { value: 'wait_times', label: 'Wait Times' },
    { value: 'recommendations', label: 'Recommendations' },
    { value: 'special_offers', label: 'Special Offers' },
    { value: 'general_satisfaction', label: 'General Satisfaction' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Edit Question' : 'Create Custom Question'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="e.g., How was your checkout experience today?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              required
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formData.text.length}/200 characters
              </span>
              {validation.warnings.length > 0 && (
                <span className="text-xs text-yellow-600 flex items-center">
                  <HelpCircle className="h-3 w-3 mr-1" />
                  {validation.warnings[0]}
                </span>
              )}
            </div>
            {validation.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                {validation.errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </div>
            )}
          </div>

          {/* Swedish Translation (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swedish Translation (Optional)
            </label>
            <textarea
              value={formData.textSv || ''}
              onChange={(e) => setFormData({ ...formData, textSv: e.target.value })}
              placeholder="Swedish version of the question"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Frequency Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BarChart3 className="inline h-4 w-4 mr-1" />
              Frequency
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <select
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="every_nth">Every Nth Customer</option>
                  <option value="percentage">Percentage of Customers</option>
                  <option value="fixed">Fixed Count per Day</option>
                </select>
                <input
                  type="number"
                  value={formData.frequencyValue}
                  onChange={(e) => setFormData({ ...formData, frequencyValue: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="100"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {formData.frequencyType === 'every_nth' && 'customers'}
                  {formData.frequencyType === 'percentage' && '% of customers'}
                  {formData.frequencyType === 'fixed' && 'times per day'}
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  {formData.frequencyType === 'every_nth' &&
                    `This question will be asked to every ${formData.frequencyValue}th customer`}
                  {formData.frequencyType === 'percentage' &&
                    `Approximately ${formData.frequencyValue}% of customers will receive this question`}
                  {formData.frequencyType === 'fixed' &&
                    `This question will be asked ${formData.frequencyValue} times per day`}
                </p>
              </div>
            </div>
          </div>

          {/* Store Targeting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="inline h-4 w-4 mr-1" />
              Store Targeting
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="all-stores"
                  checked={formData.stores === 'all' || selectedStores.length === 0}
                  onChange={() => {
                    setFormData({ ...formData, stores: 'all' })
                    setSelectedStores([])
                  }}
                  className="mr-2"
                />
                <label htmlFor="all-stores" className="text-sm text-gray-700">
                  All stores
                </label>
              </div>
              {stores.length > 1 && (
                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      id="specific-stores"
                      checked={selectedStores.length > 0}
                      onChange={() => {
                        if (selectedStores.length === 0 && stores.length > 0) {
                          setSelectedStores([stores[0].id])
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="specific-stores" className="text-sm text-gray-700">
                      Specific stores
                    </label>
                  </div>
                  {selectedStores.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {stores.map((store) => (
                        <label key={store.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedStores.includes(store.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStores([...selectedStores, store.id])
                              } else {
                                setSelectedStores(selectedStores.filter(id => id !== store.id))
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seasonal Activation */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.seasonalEnabled}
                onChange={(e) => setFormData({ ...formData, seasonalEnabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                <Calendar className="inline h-4 w-4 mr-1" />
                Seasonal Question
              </span>
            </label>
            {formData.seasonalEnabled && (
              <div className="mt-3 ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.seasonalStart ? formData.seasonalStart.toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasonalStart: e.target.value ? new Date(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.seasonalEnd ? formData.seasonalEnd.toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seasonalEnd: e.target.value ? new Date(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.seasonalRecurring || false}
                    onChange={(e) => setFormData({ ...formData, seasonalRecurring: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Repeat annually</span>
                </label>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Low</span>
                    <span className="font-medium">{formData.priority}</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category || 'general_satisfaction'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-up */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.followUpEnabled}
                    onChange={(e) => setFormData({ ...formData, followUpEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Allow AI follow-up questions</span>
                </label>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {validation.suggestions.length > 0 && (
            <div className="bg-yellow-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Suggestions</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validation.suggestions.map((suggestion, i) => (
                  <li key={i}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {initialData ? 'Update' : 'Create'} Question
          </button>
        </div>
      </div>
    </div>
  )
}