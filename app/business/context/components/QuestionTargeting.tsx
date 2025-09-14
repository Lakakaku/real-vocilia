'use client'

/**
 * Question Targeting Component
 * Configure store-specific and time-based targeting
 * Agent: business-onboarding
 */

import { useState } from 'react'
import { MapPin, Clock, Calendar, Users } from 'lucide-react'
import type { QuestionTargeting } from '@/types/custom-questions'

interface QuestionTargetingProps {
  targeting: QuestionTargeting
  onChange: (targeting: QuestionTargeting) => void
  stores: Array<{ id: string; name: string; location?: string }>
  disabled?: boolean
}

export function QuestionTargeting({
  targeting,
  onChange,
  stores,
  disabled = false,
}: QuestionTargetingProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleStoreSelection = (storeId: string, selected: boolean) => {
    if (targeting.stores === 'all') {
      // Switching from 'all' to specific stores
      onChange({
        ...targeting,
        stores: selected ? [storeId] : [],
      })
    } else {
      // Already in specific mode
      const currentStores = targeting.stores as string[]
      if (selected) {
        onChange({
          ...targeting,
          stores: [...currentStores, storeId],
        })
      } else {
        const filtered = currentStores.filter(id => id !== storeId)
        onChange({
          ...targeting,
          stores: filtered.length > 0 ? filtered : 'all',
        })
      }
    }
  }

  const handleTimeOfDayToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({
        ...targeting,
        timeOfDay: { start: '09:00', end: '17:00' },
      })
    } else {
      const { timeOfDay, ...rest } = targeting
      onChange(rest)
    }
  }

  const handleDayToggle = (day: number) => {
    const currentDays = targeting.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]
    if (currentDays.includes(day)) {
      const filtered = currentDays.filter(d => d !== day)
      onChange({
        ...targeting,
        daysOfWeek: filtered.length > 0 ? filtered : undefined,
      })
    } else {
      onChange({
        ...targeting,
        daysOfWeek: [...currentDays, day].sort(),
      })
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      {/* Store Targeting */}
      <div>
        <div className="flex items-center mb-3">
          <MapPin className="h-4 w-4 mr-2 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-900">Store Targeting</h4>
        </div>

        <div className="space-y-3">
          {/* All Stores Option */}
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={targeting.stores === 'all'}
              onChange={() => onChange({ ...targeting, stores: 'all' })}
              disabled={disabled}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">All Stores</div>
              <div className="text-xs text-gray-500">Question will be asked at every location</div>
            </div>
          </label>

          {/* Specific Stores Option */}
          {stores.length > 1 && (
            <div>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={targeting.stores !== 'all'}
                  onChange={() => {
                    if (targeting.stores === 'all') {
                      onChange({ ...targeting, stores: [stores[0].id] })
                    }
                  }}
                  disabled={disabled}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Specific Stores</div>
                  <div className="text-xs text-gray-500">Target selected locations only</div>
                </div>
              </label>

              {targeting.stores !== 'all' && (
                <div className="ml-8 mt-3 space-y-2">
                  {stores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          targeting.stores !== 'all' &&
                          (targeting.stores as string[]).includes(store.id)
                        }
                        onChange={(e) => handleStoreSelection(store.id, e.target.checked)}
                        disabled={disabled}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{store.name}</div>
                        {store.location && (
                          <div className="text-xs text-gray-500">{store.location}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Targeting */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <Clock className="h-4 w-4 mr-1" />
          {showAdvanced ? 'Hide' : 'Show'} Time-based Targeting
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Time of Day */}
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={!!targeting.timeOfDay}
                  onChange={(e) => handleTimeOfDayToggle(e.target.checked)}
                  disabled={disabled}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Specific time of day
                </span>
              </label>

              {targeting.timeOfDay && (
                <div className="ml-6 flex items-center space-x-2">
                  <input
                    type="time"
                    value={targeting.timeOfDay.start}
                    onChange={(e) => onChange({
                      ...targeting,
                      timeOfDay: {
                        ...targeting.timeOfDay!,
                        start: e.target.value,
                      },
                    })}
                    disabled={disabled}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="time"
                    value={targeting.timeOfDay.end}
                    onChange={(e) => onChange({
                      ...targeting,
                      timeOfDay: {
                        ...targeting.timeOfDay!,
                        end: e.target.value,
                      },
                    })}
                    disabled={disabled}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Days of Week */}
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={!!targeting.daysOfWeek}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...targeting,
                        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays by default
                      })
                    } else {
                      const { daysOfWeek, ...rest } = targeting
                      onChange(rest)
                    }
                  }}
                  disabled={disabled}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Specific days of week
                </span>
              </label>

              {targeting.daysOfWeek && (
                <div className="ml-6 flex space-x-1">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      disabled={disabled}
                      className={`
                        px-3 py-1 text-xs font-medium rounded
                        ${targeting.daysOfWeek?.includes(index)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-200'}
                      `}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Segments (Future) */}
            <div className="p-3 bg-white rounded border border-gray-200">
              <div className="flex items-start">
                <Users className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">
                    Customer Segments (Coming Soon)
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Target specific customer groups based on purchase history, frequency, or demographics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Targeting Summary */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm text-blue-900">
          <span className="font-medium">Current targeting:</span>{' '}
          {targeting.stores === 'all'
            ? 'All stores'
            : `${(targeting.stores as string[]).length} selected store${
                (targeting.stores as string[]).length > 1 ? 's' : ''
              }`}
          {targeting.timeOfDay && `, ${targeting.timeOfDay.start}-${targeting.timeOfDay.end}`}
          {targeting.daysOfWeek && `, ${targeting.daysOfWeek.length} days/week`}
        </div>
      </div>
    </div>
  )
}