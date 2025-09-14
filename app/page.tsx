'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Customer platform component
function CustomerPlatform() {
  const [storeCode, setStoreCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate store code format
    const cleanCode = storeCode.replace(/\s/g, '').toUpperCase()

    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      setError('Vänligen ange en giltig 6-siffrig butikskod')
      return
    }

    // Navigate to feedback page
    router.push(`/feedback/${cleanCode}`)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) {
      setStoreCode(value)
      setError('')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Vocilia
          </h1>
          <p className="text-xl text-gray-600">
            Få cashback för din feedback
          </p>
        </div>

        {/* Store Code Entry Card */}
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Ange butikskod
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="storeCode" className="block text-sm font-medium text-gray-700 mb-2">
                6-siffrig kod från kvittot eller QR-koden
              </label>
              <input
                id="storeCode"
                type="text"
                value={storeCode}
                onChange={handleCodeChange}
                placeholder="ABC123"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={storeCode.length !== 6}
            >
              Fortsätt
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Skanna QR-koden i butiken eller ange koden manuellt
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            ✓ Dela din upplevelse via röstsamtal
          </p>
          <p className="text-sm text-gray-600">
            ✓ Få 3-15% cashback direkt till Swish
          </p>
          <p className="text-sm text-gray-600">
            ✓ Hjälp butiker bli bättre
          </p>
        </div>

        {/* Business Link */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Är du företagare?{' '}
            <a
              href={process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business.vocilia.com'}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Registrera din butik här
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

// Loading component
function LoadingRedirect() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Vocilia...</h1>
        <p className="text-gray-600">
          If you are not redirected,{' '}
          <a href="/" className="text-blue-600 hover:text-blue-700 underline">
            click here
          </a>
        </p>
      </div>
    </div>
  )
}

// Main component that handles domain-based routing
export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [platform, setPlatform] = useState<'customer' | 'business' | 'admin'>('customer')
  const router = useRouter()

  useEffect(() => {
    // Check hostname to determine which platform to show
    const hostname = window.location.hostname

    if (hostname.includes('business.')) {
      // Redirect to business login
      router.push('/business/login')
    } else if (hostname.includes('admin.')) {
      // Redirect to admin login
      router.push('/admin/login')
    } else {
      // Show customer platform
      setPlatform('customer')
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return <LoadingRedirect />
  }

  return <CustomerPlatform />
}