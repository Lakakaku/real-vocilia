import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a password reset
      const isPasswordReset = searchParams.get('type') === 'recovery'

      if (isPasswordReset) {
        // Redirect to password reset page with code
        return NextResponse.redirect(`${origin}/reset-password?code=${code}`)
      }

      // Get the user session to check if they need onboarding
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if this is a first-time user who needs onboarding
        const { data: business } = await supabase
          .from('businesses')
          .select('onboarding_completed, onboarding_step')
          .eq('id', user.id)
          .single()

        if (business && !business.onboarding_completed) {
          // Update onboarding step to 1 if it's still 0
          if (business.onboarding_step === 0) {
            await supabase
              .from('businesses')
              .update({ onboarding_step: 1 })
              .eq('id', user.id)
          }

          // Redirect to onboarding
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      // Otherwise, redirect to dashboard or next page
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}