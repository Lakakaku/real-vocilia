'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResetPasswordRequestForm } from '@/components/auth/reset-password-request-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const isResetMode = searchParams.get('code') !== null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Vocilia Business</h1>
          <p className="mt-2 text-gray-600">
            Reset your account password
          </p>
        </div>
        {isResetMode ? <ResetPasswordForm /> : <ResetPasswordRequestForm />}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}