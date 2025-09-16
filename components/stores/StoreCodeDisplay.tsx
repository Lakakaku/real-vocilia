'use client'

import { useState } from 'react'
import { Copy, RotateCcw, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Store, PreviousStoreCode } from '@/lib/stores/types'

interface StoreCodeDisplayProps {
  store: Store
  onRotateCode?: (storeId: string) => Promise<void>
  isRotating?: boolean
}

export function StoreCodeDisplay({ store, onRotateCode, isRotating = false }: StoreCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleRotateCode = async () => {
    if (onRotateCode && !isRotating) {
      await onRotateCode(store.id)
    }
  }

  const previousCodes = store.previous_store_codes || []
  const hasHistory = previousCodes.length > 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Store Code
          {hasHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs"
            >
              {showHistory ? 'Hide' : 'Show'} History ({previousCodes.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Store Code */}
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Current Code</span>
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-3xl font-mono font-bold text-blue-900 tracking-wider">
                {store.store_code}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(store.store_code)}
                      className="h-8 w-8 p-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? 'Copied!' : 'Copy code'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {store.code_rotated_at && (
              <p className="text-xs text-blue-600 mt-2">
                Last rotated: {new Date(store.code_rotated_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* QR Code URL */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">QR Code URL</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(store.qr_code_url || '')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3 text-gray-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy URL</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-gray-600 font-mono break-all">
              {store.qr_code_url || `https://vocilia.com/${store.store_code}`}
            </p>
          </div>

          {/* Rotate Code Button */}
          {onRotateCode && (
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Rotating invalidates old codes</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateCode}
                disabled={isRotating}
                className="flex items-center space-x-2"
              >
                <RotateCcw className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} />
                <span>{isRotating ? 'Rotating...' : 'Rotate Code'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Code History */}
        {showHistory && hasHistory && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700">Previous Codes</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {previousCodes.map((prevCode: PreviousStoreCode, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded p-2 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm text-gray-700">
                      {prevCode.code}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Expired
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(prevCode.rotated_at).toLocaleDateString()}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prevCode.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3 text-gray-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy old code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 italic">
              Note: Previous codes may still work for a limited time but will redirect to the current code.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}