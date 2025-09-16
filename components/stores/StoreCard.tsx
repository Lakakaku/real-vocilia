'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  QrCode, 
  Edit3, 
  TrendingUp, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw
} from 'lucide-react'
import { StoreCodeDisplay } from './StoreCodeDisplay'
import { LocationValidator } from './LocationValidator'
import type { StoreWithStats } from '@/lib/stores/types'

interface StoreCardProps {
  store: StoreWithStats
  onEdit?: (store: StoreWithStats) => void
  onRotateCode?: (storeId: string) => Promise<void>
  onGenerateQR?: (storeCode: string) => void
  isRotatingCode?: boolean
  className?: string
}

export function StoreCard({
  store,
  onEdit,
  onRotateCode,
  onGenerateQR,
  isRotatingCode = false,
  className = ''
}: StoreCardProps) {
  const [showCodeDetails, setShowCodeDetails] = useState(false)
  const [showLocationValidator, setShowLocationValidator] = useState(false)

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('sv-SE')
  }

  const getQualityBadgeColor = (score?: number) => {
    if (!score) return 'secondary'
    if (score >= 8) return 'default' // Green
    if (score >= 6) return 'secondary' // Yellow
    return 'destructive' // Red
  }

  const getLocationStatusBadge = () => {
    if (store.location_validated === true) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validated
        </Badge>
      )
    } else if (store.location_validated === false) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Invalid
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
          <Clock className="h-3 w-3 mr-1" />
          Not Validated
        </Badge>
      )
    }
  }

  return (
    <Card className={`${className} transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-gray-900">{store.name}</h3>
            <div className="flex items-center space-x-2">
              {store.is_active ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {getLocationStatusBadge()}
            </div>
          </div>
          
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(store)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location Information */}
        {(store.location_city || store.location_address) && (
          <div className="space-y-2">
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {store.location_city && (
                  <div className="font-medium">{store.location_city}</div>
                )}
                {store.location_address && (
                  <div className="text-xs text-gray-500">{store.location_address}</div>
                )}
                {store.location_postal && (
                  <div className="text-xs text-gray-500 font-mono">
                    {store.location_postal}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Store Code */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Store Code</span>
              {store.code_rotated_at && (
                <Badge variant="outline" className="text-xs">
                  Recently Rotated
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCodeDetails(!showCodeDetails)}
              className="text-xs"
            >
              {showCodeDetails ? 'Hide' : 'Details'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
              {store.store_code}
            </span>
            <div className="flex space-x-1">
              {onGenerateQR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateQR(store.store_code)}
                  className="flex items-center space-x-1"
                >
                  <QrCode className="h-3 w-3" />
                  <span className="hidden sm:inline">QR</span>
                </Button>
              )}
              {onRotateCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRotateCode(store.id)}
                  disabled={isRotatingCode}
                  className="flex items-center space-x-1"
                >
                  <RotateCcw className={`h-3 w-3 ${isRotatingCode ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Rotate</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Store Code Details */}
        {showCodeDetails && (
          <StoreCodeDisplay
            store={store}
            onRotateCode={onRotateCode}
            isRotating={isRotatingCode}
          />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-blue-900">{store.feedback_count}</div>
            <div className="text-xs text-blue-700">Feedback</div>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold text-green-900">
              {store.avg_quality_score ? store.avg_quality_score.toFixed(1) : 'N/A'}
            </div>
            <div className="text-xs text-green-700">Avg Quality</div>
          </div>

          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xs font-semibold text-purple-900">
              {formatDate(store.last_feedback_at)}
            </div>
            <div className="text-xs text-purple-700">Last Feedback</div>
          </div>

          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-lg font-semibold text-amber-900">
              {store.rate_limit_violations_today}
            </div>
            <div className="text-xs text-amber-700">Rate Limits Today</div>
          </div>
        </div>

        {/* Location Validation */}
        {showLocationValidator && (
          <LocationValidator
            initialPostalCode={store.location_postal || ''}
            initialAddress={store.location_address || ''}
            onValidationComplete={(result) => {
              // Handle validation result if needed
              console.log('Location validation result:', result)
              setShowLocationValidator(false)
            }}
          />
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex space-x-2">
            {!store.location_validated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLocationValidator(!showLocationValidator)}
                className="text-xs"
              >
                Validate Location
              </Button>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            Created {formatDate(store.created_at)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}