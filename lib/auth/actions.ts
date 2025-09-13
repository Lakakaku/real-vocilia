'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, resetPasswordRequestSchema, resetPasswordSchema } from './validation'
import type { LoginInput, SignupInput, ResetPasswordRequestInput, ResetPasswordInput } from './validation'

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

  // Create business record
  const { error: businessError } = await supabase
    .from('businesses')
    .insert({
      id: authData.user.id,
      name: validatedData.name,
      email: validatedData.email,
    })

  if (businessError) {
    // Clean up auth user if business creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create business account' }
  }

  return {
    success: true,
    message: 'Account created successfully. Please check your email to verify your account.'
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