'use client'

import { OnboardingProgress as OnboardingProgressType } from '@/types/onboarding'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingProgressBarProps {
  progress: OnboardingProgressType
  onStepClick?: (step: number) => void
}

const STEP_TITLES = [
  'Welcome',
  'Understanding Feedback',
  'Business Profile',
  'Technical Setup',
  'Your Goals',
  'Quick Start'
]

export function OnboardingProgressBar({ progress, onStepClick }: OnboardingProgressBarProps) {
  const { currentStep, totalSteps, completedSteps, percentComplete } = progress

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{percentComplete}% Complete</span>
        </div>
        <Progress value={percentComplete} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="hidden sm:flex items-center justify-between">
        {STEP_TITLES.map((title, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(stepNumber)
          const isCurrent = currentStep === stepNumber
          const isClickable = isCompleted || stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex flex-col items-center">
              <button
                onClick={() => isClickable && onStepClick?.(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isCurrent && !isCompleted && "bg-blue-500 border-blue-500 text-white",
                  !isCompleted && !isCurrent && "bg-background border-muted-foreground/30",
                  isClickable && "cursor-pointer hover:scale-110",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </button>
              <span className={cn(
                "text-xs mt-2 text-center max-w-[80px]",
                isCurrent && "font-semibold",
                !isCurrent && !isCompleted && "text-muted-foreground"
              )}>
                {title}
              </span>
            </div>
          )}
        )}
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                completedSteps.includes(step) && "bg-green-500 w-3 h-3",
                currentStep === step && "bg-blue-500 w-3 h-3",
                !completedSteps.includes(step) && currentStep !== step && "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <p className="text-center text-sm mt-2 font-medium">
          {STEP_TITLES[currentStep - 1]}
        </p>
      </div>

      {/* Time estimate */}
      {progress.estimatedTimeRemaining > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Estimated time remaining: {progress.estimatedTimeRemaining} minutes
        </p>
      )}
    </div>
  )
}