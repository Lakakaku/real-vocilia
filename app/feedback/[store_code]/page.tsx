'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function FeedbackPage() {
  const params = useParams()
  const storeCode = params.store_code as string
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [purchaseTime, setPurchaseTime] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    validateStoreCode()
  }, [storeCode])

  const validateStoreCode = async () => {
    try {
      setLoading(true)

      // Validate store code format (6-digit alphanumeric)
      if (!/^[A-Z0-9]{6}$/i.test(storeCode)) {
        setError('Ogiltig butikskod. Vänligen kontrollera koden och försök igen.')
        setLoading(false)
        return
      }

      // Check if store exists in database
      const { data, error: dbError } = await supabase
        .from('stores')
        .select('*, businesses(name)')
        .eq('store_code', storeCode.toUpperCase())
        .single()

      if (dbError || !data) {
        setError('Butikskoden kunde inte hittas. Vänligen kontrollera koden.')
        setLoading(false)
        return
      }

      setStore(data)
      setLoading(false)
    } catch (err) {
      console.error('Error validating store code:', err)
      setError('Ett fel uppstod. Vänligen försök igen.')
      setLoading(false)
    }
  }

  const handlePhoneValidation = (value: string) => {
    // Swedish phone number validation
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.startsWith('46')) {
      return cleaned
    } else if (cleaned.startsWith('0')) {
      return '46' + cleaned.substring(1)
    } else if (cleaned.length === 9) {
      return '46' + cleaned
    }
    return cleaned
  }

  const startFeedback = () => {
    // Validate inputs
    if (!phoneNumber || !transactionAmount || !purchaseTime) {
      alert('Vänligen fyll i alla fält')
      return
    }

    const validatedPhone = handlePhoneValidation(phoneNumber)
    if (!/^46[0-9]{9}$/.test(validatedPhone)) {
      alert('Vänligen ange ett giltigt svenskt telefonnummer')
      return
    }

    // Start recording/feedback process
    setIsRecording(true)
    // TODO: Implement voice recording and AI conversation
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifierar butikskod...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Fel</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 w-full bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Store Info */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {store?.businesses?.name}
          </h1>
          <p className="mt-2 text-gray-600">{store?.name}</p>
          <p className="text-sm text-gray-500">Butikskod: {storeCode.toUpperCase()}</p>
        </div>

        {!isRecording ? (
          /* Transaction Details Form */
          <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Dela din feedback och få cashback
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefonnummer (för Swish-betalning)
              </label>
              <input
                type="tel"
                placeholder="070-123 45 67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Köpbelopp (SEK)
              </label>
              <input
                type="number"
                placeholder="299"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tid för köp
              </label>
              <input
                type="time"
                value={purchaseTime}
                onChange={(e) => setPurchaseTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={startFeedback}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 transition"
            >
              Starta feedback-samtal
            </button>

            <p className="text-xs text-gray-500 text-center">
              Du får 3-15% cashback baserat på kvaliteten på din feedback
            </p>
          </div>
        ) : (
          /* Recording Interface */
          <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-4 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-lg font-medium">Lyssnar...</p>
              <p className="text-sm text-gray-600">Berätta om din upplevelse</p>
            </div>

            <button
              onClick={() => setIsRecording(false)}
              className="w-full bg-red-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-red-700 transition"
            >
              Avsluta samtal
            </button>
          </div>
        )}
      </div>
    </main>
  )
}