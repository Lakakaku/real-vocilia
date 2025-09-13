'use client'

import { calculatePasswordStrength } from '@/lib/auth/validation'
import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, strength } = calculatePasswordStrength(password)

  const getColor = () => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500'
      case 'fair':
        return 'bg-yellow-500'
      case 'good':
        return 'bg-blue-500'
      case 'strong':
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getLabel = () => {
    if (!password) return ''
    switch (strength) {
      case 'weak':
        return 'Weak password'
      case 'fair':
        return 'Fair password'
      case 'good':
        return 'Good password'
      case 'strong':
        return 'Strong password'
      default:
        return ''
    }
  }

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              level <= Math.ceil(score / 25) ? getColor() : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', strength === 'weak' ? 'text-red-500' : 'text-gray-600')}>
        {getLabel()}
      </p>
      <ul className="text-xs text-gray-500 space-y-1">
        <li className={password.length >= 12 ? 'line-through' : ''}>
          • At least 12 characters
        </li>
        <li className={/[A-Z]/.test(password) ? 'line-through' : ''}>
          • One uppercase letter
        </li>
        <li className={/[a-z]/.test(password) ? 'line-through' : ''}>
          • One lowercase letter
        </li>
        <li className={/[0-9]/.test(password) ? 'line-through' : ''}>
          • One number
        </li>
        <li className={/[^A-Za-z0-9]/.test(password) ? 'line-through' : ''}>
          • One special character
        </li>
      </ul>
    </div>
  )
}