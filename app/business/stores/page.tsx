'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { StoreCard } from '@/components/stores/StoreCard'
import { LocationValidator } from '@/components/stores/LocationValidator'
import type { StoreWithStats, CreateStoreData } from '@/lib/stores/types'

interface NewStoreForm extends CreateStoreData {
  id?: string
}

export default function StoresPage() {
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<StoreWithStats[]>([])
  const [filteredStores, setFilteredStores] = useState<StoreWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddStore, setShowAddStore] = useState(false)
  const [isCreatingStore, setIsCreatingStore] = useState(false)
  const [rotatingStoreId, setRotatingStoreId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newStore, setNewStore] = useState<NewStoreForm>({
    name: '',
    location_address: '',
    location_city: '',
    location_region: '',
    location_postal: '',
  })
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuthAndLoadStores()
  }, [])

  useEffect(() => {
    // Filter stores based on search term
    const filtered = stores.filter(store => 
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.location_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.store_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredStores(filtered)
  }, [stores, searchTerm])

  const checkAuthAndLoadStores = async () => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      await loadStores()
    } catch (error) {
      console.error('Error checking auth:', error)
      setError('Failed to authenticate. Please try logging in again.')
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      setError(null)
      const response = await fetch('/api/stores', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load stores')
      }

      const data = await response.json()
      setStores(data.data || [])
    } catch (error) {
      console.error('Error loading stores:', error)
      setError(error instanceof Error ? error.message : 'Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const validateStoreForm = (store: NewStoreForm): string | null => {
    if (!store.name?.trim()) return 'Store name is required'
    if (store.name.trim().length < 2) return 'Store name must be at least 2 characters'
    if (store.name.length > 255) return 'Store name must be 255 characters or less'
    
    if (store.location_postal && !/^[0-9]{3}\s?[0-9]{2}$/.test(store.location_postal)) {
      return 'Invalid Swedish postal code format (expected: 12345 or 123 45)'
    }
    
    return null
  }

  const addStore = async () => {
    const validationError = validateStoreForm(newStore)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsCreatingStore(true)
    setError(null)

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStore.name.trim(),
          location_address: newStore.location_address?.trim(),
          location_city: newStore.location_city?.trim(),
          location_region: newStore.location_region?.trim(),
          location_postal: newStore.location_postal?.trim(),
          location_lat: newStore.location_lat,
          location_lng: newStore.location_lng,
          operating_hours: newStore.operating_hours || {},
          metadata: newStore.metadata || {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create store')
      }

      const data = await response.json()
      
      // Reload stores to get updated data with stats
      await loadStores()
      
      // Reset form
      setShowAddStore(false)
      setNewStore({
        name: '',
        location_address: '',
        location_city: '',
        location_region: '',
        location_postal: '',
      })
      
    } catch (error) {
      console.error('Error creating store:', error)
      setError(error instanceof Error ? error.message : 'Failed to create store')
    } finally {
      setIsCreatingStore(false)
    }
  }

  const rotateStoreCode = async (storeId: string) => {
    setRotatingStoreId(storeId)
    setError(null)

    try {
      const response = await fetch(`/api/stores/${storeId}/rotate-code`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to rotate store code')
      }

      const data = await response.json()
      
      // Update the store in our local state
      setStores(prevStores => 
        prevStores.map(store => 
          store.id === storeId 
            ? { 
                ...store, 
                store_code: data.data.new_code,
                code_rotated_at: data.data.rotated_at,
                qr_code_url: `https://vocilia.com/${data.data.new_code}`
              }
            : store
        )
      )
      
    } catch (error) {
      console.error('Error rotating store code:', error)
      setError(error instanceof Error ? error.message : 'Failed to rotate store code')
    } finally {
      setRotatingStoreId(null)
    }
  }

  const generateQRCode = (storeCode: string) => {
    // Generate QR code URL and open in new tab for download
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vocilia.com/${storeCode}`
    window.open(qrUrl, '_blank')
  }

  const exportStoreData = () => {
    const csvData = stores.map(store => ({
      'Store Name': store.name,
      'Store Code': store.store_code,
      'City': store.location_city || '',
      'Address': store.location_address || '',
      'Postal Code': store.location_postal || '',
      'Feedback Count': store.feedback_count,
      'Avg Quality': store.avg_quality_score?.toFixed(1) || 'N/A',
      'Last Feedback': store.last_feedback_at ? new Date(store.last_feedback_at).toLocaleDateString() : 'Never',
      'Created': new Date(store.created_at).toLocaleDateString(),
      'QR URL': store.qr_code_url || `https://vocilia.com/${store.store_code}`
    }))

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocilia-stores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your store locations and generate QR codes for customer feedback
          </p>
        </div>
        <div className="flex space-x-3">
          {stores.length > 0 && (
            <Button
              variant="outline"
              onClick={exportStoreData}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
          )}
          <Button
            onClick={() => setShowAddStore(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Store</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2 h-auto p-0 text-red-600 hover:text-red-800"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      {stores.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search stores by name, city, or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-sm">
                  {filteredStores.length} of {stores.length} stores
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <Input
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    placeholder="e.g., Downtown Store"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    value={newStore.location_city || ''}
                    onChange={(e) => setNewStore({ ...newStore, location_city: e.target.value })}
                    placeholder="e.g., Stockholm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <Input
                    value={newStore.location_region || ''}
                    onChange={(e) => setNewStore({ ...newStore, location_region: e.target.value })}
                    placeholder="e.g., Stockholm County"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <Input
                    value={newStore.location_address || ''}
                    onChange={(e) => setNewStore({ ...newStore, location_address: e.target.value })}
                    placeholder="e.g., Drottninggatan 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <Input
                    value={newStore.location_postal || ''}
                    onChange={(e) => setNewStore({ ...newStore, location_postal: e.target.value })}
                    placeholder="e.g., 111 21"
                    maxLength={6}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Location Validator */}
              {newStore.location_postal && (
                <LocationValidator
                  initialPostalCode={newStore.location_postal}
                  initialAddress={newStore.location_address}
                  onValidationComplete={(result) => {
                    if (result.isValid && result.normalizedAddress) {
                      setNewStore({
                        ...newStore,
                        location_postal: result.postalCode,
                        location_address: result.address || newStore.location_address
                      })
                    }
                  }}
                />
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddStore(false)
                    setError(null)
                    setNewStore({
                      name: '',
                      location_address: '',
                      location_city: '',
                      location_region: '',
                      location_postal: '',
                    })
                  }}
                  disabled={isCreatingStore}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addStore}
                  disabled={isCreatingStore || !newStore.name?.trim()}
                  className="flex items-center space-x-2"
                >
                  {isCreatingStore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Create Store</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stores Grid */}
      {filteredStores.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onRotateCode={rotateStoreCode}
              onGenerateQR={generateQRCode}
              isRotatingCode={rotatingStoreId === store.id}
            />
          ))}
        </div>
      ) : stores.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores yet</h3>
          <p className="text-gray-600 mb-6">Add your first store to start collecting feedback</p>
          <Button
            onClick={() => setShowAddStore(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Store</span>
          </Button>
        </div>
      ) : (
        /* No Search Results */
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
          <p className="text-gray-600 mb-4">
            No stores match your search for "{searchTerm}"
          </p>
          <Button
            variant="outline"
            onClick={() => setSearchTerm('')}
          >
            Clear search
          </Button>
        </div>
      )}

      {/* QR Code Instructions */}
      {stores.length > 0 && (
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How to Use QR Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-800 font-bold">1</span>
                </div>
                <h4 className="font-medium text-blue-800 mb-2">Generate & Download</h4>
                <p className="text-sm text-blue-700">Click the QR button to generate and download QR codes for each store</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-800 font-bold">2</span>
                </div>
                <h4 className="font-medium text-blue-800 mb-2">Print & Display</h4>
                <p className="text-sm text-blue-700">Place QR codes at checkout, on tables, or include on receipts</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-800 font-bold">3</span>
                </div>
                <h4 className="font-medium text-blue-800 mb-2">Collect Feedback</h4>
                <p className="text-sm text-blue-700">Customers scan to share their experience and earn cashback</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-800 mb-2">Store Code Security</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Each store gets a unique 6-character code</li>
                <li>• Codes can be rotated if compromised</li>
                <li>• Old codes redirect to current ones temporarily</li>
                <li>• Rate limiting prevents spam (5 submissions per phone per day)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}