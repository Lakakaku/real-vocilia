'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function VerificationPage() {
  const [loading, setLoading] = useState(true)
  const [activeVerification, setActiveVerification] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuthAndLoadVerification()

    // Update countdown timer every second
    const timer = setInterval(() => {
      if (activeVerification?.deadline) {
        updateTimeRemaining(activeVerification.deadline)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeVerification])

  const checkAuthAndLoadVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      // Load active verification for the business
      // TODO: Implement actual verification loading from database
      const mockVerification = {
        id: 1,
        week: '2024-W37',
        status: 'pending',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        transaction_count: 42,
        total_amount: 12450,
        total_rewards: 873,
        created_at: new Date().toISOString(),
      }

      setActiveVerification(mockVerification)
      updateTimeRemaining(mockVerification.deadline)
      setLoading(false)
    } catch (error) {
      console.error('Error loading verification:', error)
      setLoading(false)
    }
  }

  const updateTimeRemaining = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeRemaining('Deadline passed')
      return
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setUploadedFile(file)
    } else {
      alert('Please upload a CSV file')
    }
  }

  const downloadBatch = () => {
    // TODO: Implement actual CSV download
    const csvContent = `Phone,Amount,Transaction_ID,Timestamp,Store
46701234567,299,TXN001,2024-09-14 10:30,Main Store
46709876543,150,TXN002,2024-09-14 11:45,Main Store`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `verification_batch_${activeVerification?.week}.csv`
    a.click()
  }

  const submitVerification = async () => {
    if (!uploadedFile) {
      alert('Please upload a verification file')
      return
    }

    // TODO: Implement actual file upload and verification
    alert('Verification submitted successfully!')
    setUploadedFile(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
        <p className="text-gray-600 mt-2">
          Verify customer transactions to release feedback and process payments
        </p>
      </div>

      {activeVerification ? (
        <>
          {/* Countdown Timer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-yellow-800">
                  Verification Required - Week {activeVerification.week}
                </h2>
                <p className="text-yellow-700 mt-1">
                  Please verify transactions before the deadline
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-yellow-800">{timeRemaining}</p>
                <p className="text-sm text-yellow-700">Time remaining</p>
              </div>
            </div>
          </div>

          {/* Batch Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{activeVerification.transaction_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{activeVerification.total_amount} SEK</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Rewards</p>
              <p className="text-2xl font-bold text-gray-900">{activeVerification.total_rewards} SEK</p>
            </div>
          </div>

          {/* Verification Process */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6">Verification Process</h3>

            <div className="space-y-6">
              {/* Step 1: Download */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Download Transaction Batch</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Download the CSV file containing all transactions for this week
                  </p>
                  <button
                    onClick={downloadBatch}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download CSV
                  </button>
                </div>
              </div>

              {/* Step 2: Verify */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Verify Against Your Records</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Compare transactions with your POS system and mark any fraudulent entries
                  </p>
                  <div className="mt-3 p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      ✓ Check transaction amounts<br />
                      ✓ Verify timestamps match your records<br />
                      ✓ Mark any suspicious transactions as fraudulent
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Upload */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Upload Verified File</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload the verified CSV file with any fraudulent transactions marked
                  </p>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadedFile && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ {uploadedFile.name} ready to upload
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={submitVerification}
                  disabled={!uploadedFile}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Verification
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-blue-800 mb-4">
              Our AI system has already flagged potential fraudulent transactions based on your business context.
              These are highlighted in the CSV file for your review.
            </p>
            <div className="flex space-x-4">
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                View Tutorial →
              </button>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-semibold text-green-800 mb-2">All Caught Up!</h2>
          <p className="text-green-700">
            No pending verifications. New batches are sent out every Monday.
          </p>
        </div>
      )}
    </div>
  )
}