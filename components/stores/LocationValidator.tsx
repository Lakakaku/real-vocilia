'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, MapPin, Loader2 } from 'lucide-react'

interface LocationValidatorProps {
  initialPostalCode?: string
  initialAddress?: string
  onValidationComplete?: (result: {
    isValid: boolean
    normalizedAddress?: string
    postalCode: string
    address?: string
  }) => void
  className?: string
}

export function LocationValidator({
  initialPostalCode = '',
  initialAddress = '',
  onValidationComplete,
  className = ''
}: LocationValidatorProps) {
  const [postalCode, setPostalCode] = useState(initialPostalCode)
  const [address, setAddress] = useState(initialAddress)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    message: string
    normalizedAddress?: string
  } | null>(null)

  const validateLocation = async () => {
    if (!postalCode.trim()) {
      setValidationResult({
        isValid: false,
        message: 'Postal code is required'
      })
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/stores/validate-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postal_code: postalCode.trim(),
          address: address.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      const result = data.data
      setValidationResult(result)

      // Call parent callback if provided
      if (onValidationComplete) {
        onValidationComplete({
          isValid: result.isValid,
          normalizedAddress: result.normalizedAddress,
          postalCode: postalCode.trim(),
          address: address.trim() || undefined
        })
      }

    } catch (error) {
      console.error('Location validation error:', error)
      setValidationResult({
        isValid: false,
        message: error instanceof Error ? error.message : 'Validation failed'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const formatPostalCode = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 5 digits
    if (digits.length <= 5) {
      // Format as XXX XX if 5 digits, otherwise just return the digits
      if (digits.length === 5) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      }
      return digits
    }
    
    return value.slice(0, -1) // Prevent typing more than 5 digits
  }

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value)
    setPostalCode(formatted)
    
    // Clear validation result when input changes
    if (validationResult) {
      setValidationResult(null)
    }
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
    
    // Clear validation result when input changes
    if (validationResult) {
      setValidationResult(null)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Location Validation</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postal-code">Swedish Postal Code *</Label>
            <Input
              id="postal-code"
              placeholder="123 45"
              value={postalCode}
              onChange={handlePostalCodeChange}
              maxLength={6}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              Format: 12345 or 123 45
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address (Optional)</Label>
            <Input
              id="address"
              placeholder="Drottninggatan 1"
              value={address}
              onChange={handleAddressChange}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={validateLocation}
            disabled={isValidating || !postalCode.trim()}
            className="flex items-center space-x-2"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>Validate Location</span>
              </>
            )}
          </Button>

          {validationResult && (
            <Badge 
              variant={validationResult.isValid ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {validationResult.isValid ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>{validationResult.isValid ? 'Valid' : 'Invalid'}</span>
            </Badge>
          )}
        </div>

        {validationResult && (
          <Alert className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-start space-x-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="space-y-1">
                <AlertDescription className={validationResult.isValid ? 'text-green-800' : 'text-red-800'}>
                  {validationResult.message}
                </AlertDescription>
                {validationResult.normalizedAddress && (
                  <p className="text-sm text-green-700 font-medium">
                    Normalized: {validationResult.normalizedAddress}
                  </p>
                )}
              </div>
            </div>
          </Alert>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Swedish Postal Code Format</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 5 digits: 12345 or 123 45</li>
            <li>• First digit 1-9 (no leading zeros for regions)</li>
            <li>• Space after 3rd digit is optional but recommended</li>
            <li>• Example: 111 21 (Stockholm), 413 01 (Göteborg)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}