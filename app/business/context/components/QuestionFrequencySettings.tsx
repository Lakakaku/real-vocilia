'use client'

/**
 * Question Frequency Settings Component
 * Visual interface for configuring question frequency
 * Agent: business-onboarding
 */

import { useState } from 'react'
import { Users, Percent, Clock, Info } from 'lucide-react'
import type { QuestionFrequency } from '@/types/custom-questions'

interface QuestionFrequencySettingsProps {
  frequency: QuestionFrequency
  onChange: (frequency: QuestionFrequency) => void
  businessType?: string
  disabled?: boolean
}

export function QuestionFrequencySettings({
  frequency,
  onChange,
  businessType,
  disabled = false,
}: QuestionFrequencySettingsProps) {
  const [showExplanation, setShowExplanation] = useState(false)

  const handleTypeChange = (type: QuestionFrequency['type']) => {
    onChange({
      ...frequency,
      type,
      value: type === 'percentage' ? 10 : type === 'fixed' ? 5 : 10,
    })
  }

  const handleValueChange = (value: number) => {
    const clampedValue = Math.max(1, Math.min(100, value))
    onChange({
      ...frequency,
      value: clampedValue,
    })
  }

  const getRecommendedFrequency = () => {
    switch (businessType) {
      case 'restaurant':
        return { type: 'every_nth' as const, value: 15, reason: 'Restaurants benefit from moderate frequency to avoid survey fatigue' }
      case 'retail':
      case 'grocery':
        return { type: 'every_nth' as const, value: 20, reason: 'Retail customers shop frequently, so lower frequency prevents oversurveying' }
      case 'barbershop':
      case 'pharmacy':
        return { type: 'every_nth' as const, value: 5, reason: 'Less frequent visits mean higher survey frequency is acceptable' }
      default:
        return { type: 'every_nth' as const, value: 10, reason: 'Standard frequency for balanced feedback collection' }
    }
  }

  const recommendation = getRecommendedFrequency()

  const getEstimatedResponses = () => {
    const dailyCustomers = 100 // Estimate
    switch (frequency.type) {
      case 'every_nth':
        return Math.floor(dailyCustomers / frequency.value)
      case 'percentage':
        return Math.floor(dailyCustomers * (frequency.value / 100))
      case 'fixed':
        return frequency.value
      default:
        return 0
    }
  }

  return (
    <div className="space-y-4">
      {/* Frequency Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How often should this question be asked?
        </label>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleTypeChange('every_nth')}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${frequency.type === 'every_nth'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">Every Nth</div>
            <div className="text-xs text-gray-500">Customer-based</div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('percentage')}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${frequency.type === 'percentage'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Percent className="h-5 w-5 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">Percentage</div>
            <div className="text-xs text-gray-500">Random sampling</div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('fixed')}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${frequency.type === 'fixed'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Clock className="h-5 w-5 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">Fixed Daily</div>
            <div className="text-xs text-gray-500">Time-based</div>
          </button>
        </div>
      </div>

      {/* Frequency Value Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            {frequency.type === 'every_nth' && 'Ask every'}
            {frequency.type === 'percentage' && 'Ask'}
            {frequency.type === 'fixed' && 'Ask'}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={frequency.value}
              onChange={(e) => handleValueChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              min="1"
              max="100"
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-600">
              {frequency.type === 'every_nth' && `customer${frequency.value > 1 ? 's' : ''}`}
              {frequency.type === 'percentage' && '% of customers'}
              {frequency.type === 'fixed' && `time${frequency.value > 1 ? 's' : ''} per day`}
            </span>
          </div>
        </div>

        <input
          type="range"
          min="1"
          max={frequency.type === 'percentage' ? 100 : 50}
          value={frequency.value}
          onChange={(e) => handleValueChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
              (frequency.value / (frequency.type === 'percentage' ? 100 : 50)) * 100
            }%, #E5E7EB ${
              (frequency.value / (frequency.type === 'percentage' ? 100 : 50)) * 100
            }%, #E5E7EB 100%)`,
          }}
        />

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low frequency</span>
          <span>High frequency</span>
        </div>
      </div>

      {/* Estimated Impact */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Estimated Impact</div>
            <div className="text-sm text-gray-600 mt-1">
              With ~100 daily customers, this question will be asked approximately{' '}
              <span className="font-semibold">{getEstimatedResponses()} times per day</span>
            </div>
            {frequency.type === 'every_nth' && frequency.value > 30 && (
              <div className="text-xs text-yellow-600 mt-2">
                ⚠️ High frequency values may result in fewer responses. Consider lowering for better coverage.
              </div>
            )}
            {frequency.type === 'percentage' && frequency.value < 5 && (
              <div className="text-xs text-yellow-600 mt-2">
                ⚠️ Very low percentage may not generate enough data for meaningful insights.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {businessType && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900">
                Recommended for {businessType}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {recommendation.reason}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({
                type: recommendation.type,
                value: recommendation.value,
              })}
              disabled={disabled}
              className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Detailed Explanation */}
      <button
        type="button"
        onClick={() => setShowExplanation(!showExplanation)}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        {showExplanation ? 'Hide' : 'Show'} detailed explanation
      </button>

      {showExplanation && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <div className="font-medium text-sm text-gray-900">Every Nth Customer</div>
            <p className="text-sm text-gray-600 mt-1">
              Ask the question to every Nth customer systematically. Best for ensuring consistent coverage
              and predictable feedback volume.
            </p>
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900">Percentage-based</div>
            <p className="text-sm text-gray-600 mt-1">
              Randomly select a percentage of customers. Good for statistical sampling and avoiding
              patterns that might bias results.
            </p>
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900">Fixed Daily Count</div>
            <p className="text-sm text-gray-600 mt-1">
              Ask the question a specific number of times per day. Useful for controlling feedback
              volume regardless of customer traffic.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}