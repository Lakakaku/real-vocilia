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

      // Otherwise, it's email verification - redirect to dashboard or next page
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}