'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, resetPasswordRequestSchema, resetPasswordSchema } from './validation'
import type { LoginInput, SignupInput, ResetPasswordRequestInput, ResetPasswordInput } from './validation'
import EmailService from '@/lib/email/service'
import { EnhancedRateLimiter } from '@/lib/rate-limiting/signup'

export async function login(formData: LoginInput) {
  const supabase = await createClient()

  // Validate input
  const validatedData = loginSchema.parse(formData)

  const { error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: SignupInput) {
  const supabase = await createClient()

  // Validate input
  const validatedData = signupSchema.parse(formData)

  // Check rate limiting
  const rateLimitCheck = await EnhancedRateLimiter.checkLimit(validatedData.email)
  if (!rateLimitCheck.allowed) {
    return { error: rateLimitCheck.error || 'Too many signup attempts. Please try again later.' }
  }

  // Record this attempt
  await EnhancedRateLimiter.recordAttempt(validatedData.email)

  // Check if email already exists
  const { data: existingBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('email', validatedData.email)
    .single()

  if (existingBusiness) {
    return { error: 'An account with this email already exists' }
  }

  // Start transaction-like operation
  let userId: string | null = null
  let storeCode: string | null = null

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BUSINESS_URL}/auth/callback`,
        data: {
          name: validatedData.name,
        }
      }
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: 'Failed to create user' }
    }

    userId = authData.user.id

    // Generate unique 6-digit store code
    const generateStoreCode = async (): Promise<string> => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      // Check if code exists
      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('store_code', code)
        .single()

      if (existing) {
        return generateStoreCode() // Recursively generate new code
      }

      return code
    }

    storeCode = await generateStoreCode()

    // Create business record with initial setup
    const { error: businessError } = await supabase
      .from('businesses')
      .insert({
        id: userId,
        name: validatedData.name,
        email: validatedData.email,
        subscription_status: 'trial',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
        onboarding_completed: false,
        onboarding_step: 0,
      })

    if (businessError) {
      // Clean up auth user if business creation fails
      await supabase.auth.admin.deleteUser(userId)
      return { error: 'Failed to create business account' }
    }

    // Create initial business context
    const { error: contextError } = await supabase
      .from('business_contexts')
      .insert({
        business_id: userId,
        context_data: {},
        completeness_score: 0,
        ai_conversation_history: [],
        custom_questions: [],
        fraud_indicators: [],
      })

    if (contextError) {
      console.error('Failed to create business context:', contextError)
      // Don't fail signup if context creation fails
    }

    // Create default store for the business
    const { error: storeError } = await supabase
      .from('stores')
      .insert({
        business_id: userId,
        name: 'Main Location',
        store_code: storeCode,
        is_active: true,
      })

    if (storeError) {
      console.error('Failed to create default store:', storeError)
      // Don't fail signup if store creation fails
    }

    // Log signup event in admin logs
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert({
        action: 'business_signup',
        entity_type: 'business',
        entity_id: userId,
        details: {
          business_name: validatedData.name,
          email: validatedData.email,
          store_code: storeCode,
          timestamp: new Date().toISOString(),
        },
      })

    if (logError) {
      console.error('Failed to log signup event:', logError)
      // Don't fail signup if logging fails
    }

    // Send welcome email (non-blocking)
    EmailService.sendWelcomeEmail(validatedData.name, validatedData.email)
      .then(result => {
        if (!result.success && 'error' in result) {
          console.error('Failed to send welcome email:', result.error)
        }
      })
      .catch(error => {
        console.error('Error sending welcome email:', error)
      })

    return {
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      data: {
        userId,
        storeCode,
      }
    }
  } catch (error) {
    // Clean up if user was created
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (deleteError) {
        console.error('Failed to clean up user after error:', deleteError)
      }
    }

    console.error('Signup error:', error)
    return { error: 'An unexpected error occurred during signup' }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPasswordRequest(formData: ResetPasswordRequestInput) {
  const supabase = await createClient()

  // Validate input
  const validatedData = resetPasswordRequestSchema.parse(formData)

  const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BUSINESS_URL}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Password reset link has been sent to your email.'
  }
}

export async function resetPassword(formData: ResetPasswordInput) {
  const supabase = await createClient()

  // Validate input
  const validatedData = resetPasswordSchema.parse(formData)

  const { error } = await supabase.auth.updateUser({
    password: validatedData.password,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Password has been reset successfully.'
  }
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BUSINESS_URL}/auth/callback`,
    }
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Verification email has been resent.'
  }
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}