'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadBusiness() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/business/login')
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', user.id)
        .single()

      if (business) {
        setBusinessId(business.id)
      } else {
        // If no business found, redirect to signup
        redirect('/business/signup')
      }

      setIsLoading(false)
    }

    loadBusiness()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!businessId) {
    return null
  }

  return <OnboardingFlow businessId={businessId} />
}