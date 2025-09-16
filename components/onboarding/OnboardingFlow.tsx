'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OnboardingProgressBar } from './OnboardingProgress'
import { WelcomeStep } from './steps/WelcomeStep'
import { EducationStep } from './steps/EducationStep'
import { ProfileStep } from './steps/ProfileStep'
import { IntegrationStep } from './steps/IntegrationStep'
import { GoalsStep } from './steps/GoalsStep'
import { ContextStarterStep } from './steps/ContextStarterStep'
import { CelebrationScreen } from './CelebrationScreen'
import {
  OnboardingData,
  OnboardingProgress,
  BusinessOnboardingUpdate,
  TOTAL_ONBOARDING_STEPS
} from '@/types/onboarding'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'

interface OnboardingFlowProps {
  initialStep?: number
  businessId: string
}

export function OnboardingFlow({ initialStep = 1, businessId }: OnboardingFlowProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    currentStep: initialStep,
    completedSteps: [],
  })

  const supabase = createClient()

  // Calculate progress
  const progress: OnboardingProgress = {
    currentStep: onboardingData.currentStep,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    completedSteps: onboardingData.completedSteps,
    percentComplete: Math.round((onboardingData.completedSteps.length / TOTAL_ONBOARDING_STEPS) * 100),
    estimatedTimeRemaining: Math.max(0, (TOTAL_ONBOARDING_STEPS - onboardingData.completedSteps.length) * 2)
  }

  const loadProgress = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('onboarding_step, onboarding_completed, business_type, store_count, avg_transaction_value, expected_feedback_volume, pos_system, verification_preference, primary_goals, quick_context')
        .eq('id', businessId)
        .single()

      if (error) throw error

      if (business) {
        // Reconstruct onboarding data from saved business data
        const completedSteps = []
        if (business.onboarding_step) {
          for (let i = 1; i < business.onboarding_step; i++) {
            completedSteps.push(i)
          }
        }

        setOnboardingData({
          currentStep: business.onboarding_step || 1,
          completedSteps,
          // We could reconstruct step data from business fields if needed
        })

        if (business.onboarding_completed) {
          router.push('/business/dashboard')
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [businessId, supabase, router])

  const saveProgress = useCallback(async () => {
    setIsSaving(true)
    try {
      const update: BusinessOnboardingUpdate = {
        onboarding_step: onboardingData.currentStep,
        onboarding_completed: onboardingData.completedSteps.length === TOTAL_ONBOARDING_STEPS,
      }

      // Map step data to business fields
      if (onboardingData.step3) {
        update.business_type = onboardingData.step3.businessType
        update.store_count = onboardingData.step3.storeCount
        update.avg_transaction_value = onboardingData.step3.avgTransactionValue
      }

      if (onboardingData.step4) {
        update.pos_system = onboardingData.step4.posSystem
        update.verification_preference = onboardingData.step4.verificationPreference
      }

      if (onboardingData.step5) {
        update.primary_goals = onboardingData.step5.primaryGoals
        update.expected_feedback_volume = String(onboardingData.step5.expectedFeedbackVolume)
      }

      if (onboardingData.step6) {
        update.quick_context = {
          businessSpecialty: onboardingData.step6.businessSpecialty,
          commonCompliment: onboardingData.step6.commonCompliment,
          improvementArea: onboardingData.step6.improvementArea,
        }
      }

      const { error } = await supabase
        .from('businesses')
        .update(update)
        .eq('id', businessId)

      if (error) throw error
    } catch (error) {
      console.error('Error saving progress:', error)
    } finally {
      setIsSaving(false)
    }
  }, [onboardingData, businessId, supabase])

  // Load saved progress on mount
  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Auto-save progress every time data changes
  useEffect(() => {
    if (onboardingData.currentStep > 0) {
      saveProgress()
    }
  }, [onboardingData, saveProgress])

  const handleNext = async (stepData: any) => {
    const updatedData = {
      ...onboardingData,
      [`step${onboardingData.currentStep}`]: stepData,
      completedSteps: Array.from(new Set([...onboardingData.completedSteps, onboardingData.currentStep])),
    }

    if (onboardingData.currentStep === TOTAL_ONBOARDING_STEPS) {
      // Final step completed
      updatedData.currentStep = TOTAL_ONBOARDING_STEPS
      setOnboardingData(updatedData)
      await saveProgress()
      setShowCelebration(true)
    } else {
      updatedData.currentStep = onboardingData.currentStep + 1
      setOnboardingData(updatedData)
    }
  }

  const handleBack = () => {
    if (onboardingData.currentStep > 1) {
      setOnboardingData({
        ...onboardingData,
        currentStep: onboardingData.currentStep - 1,
      })
    }
  }

  const handleSkip = () => {
    if (onboardingData.currentStep < TOTAL_ONBOARDING_STEPS) {
      setOnboardingData({
        ...onboardingData,
        currentStep: onboardingData.currentStep + 1,
      })
    }
  }

  const handleStepClick = (step: number) => {
    if (onboardingData.completedSteps.includes(step) || step < onboardingData.currentStep) {
      setOnboardingData({
        ...onboardingData,
        currentStep: step,
      })
    }
  }

  const handleCompleteLater = async () => {
    await saveProgress()
    router.push('/business/dashboard')
  }

  const handleCelebrationComplete = async () => {
    // Mark onboarding as completed and trigger context initialization
    await supabase
      .from('businesses')
      .update({ onboarding_completed: true })
      .eq('id', businessId)

    router.push('/business/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    )
  }

  if (showCelebration) {
    return <CelebrationScreen businessId={businessId} onComplete={handleCelebrationComplete} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Vocilia</h1>
          <p className="text-gray-600">Let&apos;s get your business set up for success</p>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-8">
          <OnboardingProgressBar
            progress={progress}
            onStepClick={handleStepClick}
          />
        </Card>

        {/* Step Content */}
        <Card className="p-8">
          {onboardingData.currentStep === 1 && (
            <WelcomeStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
            />
          )}
          {onboardingData.currentStep === 2 && (
            <EducationStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
            />
          )}
          {onboardingData.currentStep === 3 && (
            <ProfileStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {onboardingData.currentStep === 4 && (
            <IntegrationStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {onboardingData.currentStep === 5 && (
            <GoalsStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {onboardingData.currentStep === 6 && (
            <ContextStarterStep
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
        </Card>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleCompleteLater}
            disabled={isSaving}
          >
            Complete Later
          </Button>

          {isSaving && (
            <span className="text-sm text-muted-foreground">
              Saving progress...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}