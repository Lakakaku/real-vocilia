'use client'

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { resendVerificationEmail } from '@/lib/auth/actions'

interface EmailVerificationNoticeProps {
  email: string
  businessName?: string
  storeCode?: string
}

export function EmailVerificationNotice({
  email,
  businessName,
  storeCode,
}: EmailVerificationNoticeProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage(null)

    try {
      const result = await resendVerificationEmail(email)

      if (result.success) {
        setResendMessage({
          type: 'success',
          text: 'Verification email sent! Please check your inbox.',
        })
        setCountdown(60) // 60 second cooldown
      } else {
        setResendMessage({
          type: 'error',
          text: result.error || 'Failed to resend verification email. Please try again.',
        })
      }
    } catch (error) {
      setResendMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Vocilia Business</h1>
          <p className="mt-2 text-gray-600">
            Account created successfully!
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              We&apos;ve sent a verification email to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900">Account Details</h3>
              {businessName && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Business:</span> {businessName}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {email}
              </p>
              {storeCode && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Store Code:</span>{' '}
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">{storeCode}</span>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Please verify your email address to access your dashboard and start collecting customer feedback.
                </AlertDescription>
              </Alert>

              {resendMessage && (
                <Alert
                  className={
                    resendMessage.type === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }
                >
                  {resendMessage.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription
                    className={
                      resendMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }
                  >
                    {resendMessage.text}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Didn&apos;t receive the email? Check your spam folder or
                </p>
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending || countdown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Next Steps</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <span className="font-medium mr-2">1.</span>
                  <span>Click the verification link in your email</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">2.</span>
                  <span>Complete the onboarding process (10 minutes)</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">3.</span>
                  <span>Set up your business context with AI assistance</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">4.</span>
                  <span>Generate and place your QR codes</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">5.</span>
                  <span>Start receiving valuable customer feedback!</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact us at{' '}
                <a href="mailto:support@vocilia.com" className="text-blue-600 hover:underline">
                  support@vocilia.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EmailVerificationNotice