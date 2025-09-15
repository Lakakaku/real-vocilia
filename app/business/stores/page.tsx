'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function StoresPage() {
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<any[]>([])
  const [showAddStore, setShowAddStore] = useState(false)
  const [newStore, setNewStore] = useState({
    name: '',
    location: '',
    address: '',
  })
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuthAndLoadStores()
  }, [])

  const checkAuthAndLoadStores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      // Load stores for the business
      // TODO: Implement actual stores loading from database
      const mockStores = [
        {
          id: 1,
          name: 'Main Store',
          store_code: 'ABC123',
          location: 'Stockholm City',
          address: 'Drottninggatan 1, 111 51 Stockholm',
          created_at: new Date().toISOString(),
          feedback_count: 127,
          avg_quality: 7.8,
        },
        {
          id: 2,
          name: 'Mall Location',
          store_code: 'XYZ789',
          location: 'Mall of Scandinavia',
          address: 'Stjärntorget 2, 169 79 Solna',
          created_at: new Date().toISOString(),
          feedback_count: 89,
          avg_quality: 8.1,
        },
      ]

      setStores(mockStores)
      setLoading(false)
    } catch (error) {
      console.error('Error loading stores:', error)
      setLoading(false)
    }
  }

  const generateQRCode = (storeCode: string) => {
    // TODO: Implement actual QR code generation
    alert(`QR code generated for store code: ${storeCode}`)
  }

  const addStore = async () => {
    if (!newStore.name || !newStore.location) {
      alert('Please fill in all required fields')
      return
    }

    // TODO: Implement actual store creation
    const newStoreCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    setStores([...stores, {
      id: stores.length + 1,
      name: newStore.name,
      store_code: newStoreCode,
      location: newStore.location,
      address: newStore.address,
      created_at: new Date().toISOString(),
      feedback_count: 0,
      avg_quality: 0,
    }])

    setShowAddStore(false)
    setNewStore({ name: '', location: '', address: '' })
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your store locations and generate QR codes for customer feedback
          </p>
        </div>
        <button
          onClick={() => setShowAddStore(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Store
        </button>
      </div>

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Store</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Downtown Store"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={newStore.location}
                  onChange={(e) => setNewStore({ ...newStore, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Stockholm City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address
                </label>
                <input
                  type="text"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Drottninggatan 1, 111 51 Stockholm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddStore(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addStore}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{store.name}</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.location}
                </div>
                {store.address && (
                  <div className="text-xs text-gray-500 ml-6">
                    {store.address}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Store Code</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{store.store_code}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Feedback</p>
                  <p className="text-lg font-semibold text-gray-900">{store.feedback_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Quality</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {store.avg_quality > 0 ? store.avg_quality.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => generateQRCode(store.store_code)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Generate QR
                </button>
                <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stores.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores yet</h3>
          <p className="text-gray-600 mb-4">Add your first store to start collecting feedback</p>
          <button
            onClick={() => setShowAddStore(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Store
          </button>
        </div>
      )}

      {/* QR Code Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use QR Codes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm font-medium text-blue-800">1. Generate & Download</p>
            <p className="text-sm text-blue-700">Create QR codes for each store location</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">2. Print & Display</p>
            <p className="text-sm text-blue-700">Place QR codes at checkout, tables, or receipts</p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">3. Collect Feedback</p>
            <p className="text-sm text-blue-700">Customers scan to share their experience</p>
          </div>
        </div>
      </div>
    </div>
  )
}