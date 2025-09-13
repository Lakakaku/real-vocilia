import { z } from 'zod'

// Production-standard password requirements
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Signup schema (3 fields only)
export const signupSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
})

// Password reset request schema
export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Password reset schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Password strength calculation
export function calculatePasswordStrength(password: string): {
  score: number
  strength: 'weak' | 'fair' | 'good' | 'strong'
} {
  let score = 0

  // Length
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 10

  // Character types
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^A-Za-z0-9]/.test(password)) score += 20

  // Variety
  const uniqueChars = new Set(password).size
  if (uniqueChars >= 10) score += 15

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
  if (score >= 80) strength = 'strong'
  else if (score >= 60) strength = 'good'
  else if (score >= 40) strength = 'fair'

  return { score: Math.min(100, score), strength }
}