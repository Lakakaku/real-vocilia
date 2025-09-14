'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BusinessHomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page as the default for business subdomain
    router.push('/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to Business Login...</h1>
      </div>
    </div>
  )
}