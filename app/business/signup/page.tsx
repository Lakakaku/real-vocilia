export const dynamic = 'force-dynamic'

import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Vocilia Business</h1>
          <p className="mt-2 text-gray-600">
            Start getting valuable customer feedback today
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}