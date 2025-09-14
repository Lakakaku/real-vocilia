'use client'

import { useState } from 'react'
import { OnboardingStepProps } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle, Sparkles, MessageSquare, Lightbulb, Zap } from 'lucide-react'

export function ContextStarterStep({ data, onNext, onBack }: OnboardingStepProps) {
  const [businessSpecialty, setBusinessSpecialty] = useState(data.step6?.businessSpecialty || '')
  const [commonCompliment, setCommonCompliment] = useState(data.step6?.commonCompliment || '')
  const [improvementArea, setImprovementArea] = useState(data.step6?.improvementArea || '')
  const [uniqueOffering, setUniqueOffering] = useState(data.step6?.uniqueOffering || '')
  const [targetCustomer, setTargetCustomer] = useState(data.step6?.targetCustomer || '')

  const handleComplete = () => {
    onNext({
      businessSpecialty,
      commonCompliment,
      improvementArea,
      uniqueOffering,
      targetCustomer,
    })
  }

  const isComplete = businessSpecialty && commonCompliment && improvementArea

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold">Quick Context Starter</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Help our AI understand your business in 2 minutes. We&apos;ll use this to generate your first context template.
        </p>
      </div>

      {/* Quick Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Quick Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="specialty" className="flex items-center mb-2">
              <span className="text-red-500 mr-1">*</span>
              What makes your business special?
            </Label>
            <Input
              id="specialty"
              placeholder="E.g., Family-owned since 1985, authentic Italian recipes..."
              value={businessSpecialty}
              onChange={(e) => setBusinessSpecialty(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This helps AI understand your unique value proposition
            </p>
          </div>

          <div>
            <Label htmlFor="compliment" className="flex items-center mb-2">
              <span className="text-red-500 mr-1">*</span>
              What do customers often compliment you on?
            </Label>
            <Input
              id="compliment"
              placeholder="E.g., Friendly staff, fresh ingredients, quick service..."
              value={commonCompliment}
              onChange={(e) => setCommonCompliment(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Helps identify your strengths to maintain
            </p>
          </div>

          <div>
            <Label htmlFor="improvement" className="flex items-center mb-2">
              <span className="text-red-500 mr-1">*</span>
              What area would you most like to improve?
            </Label>
            <Input
              id="improvement"
              placeholder="E.g., Wait times, product variety, online ordering..."
              value={improvementArea}
              onChange={(e) => setImprovementArea(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Focuses feedback collection on your priorities
            </p>
          </div>

          <div>
            <Label htmlFor="unique" className="mb-2">
              What&apos;s something unique you offer? (Optional)
            </Label>
            <Input
              id="unique"
              placeholder="E.g., Secret sauce, loyalty program, live music..."
              value={uniqueOffering}
              onChange={(e) => setUniqueOffering(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="target" className="mb-2">
              Who is your ideal customer? (Optional)
            </Label>
            <Input
              id="target"
              placeholder="E.g., Families with kids, business professionals, students..."
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Preview */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            What Happens Next
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600">1</span>
              </div>
              <div>
                <h4 className="font-medium">AI Creates Your Template</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI will generate a complete context template based on your answers
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600">2</span>
              </div>
              <div>
                <h4 className="font-medium">Customize & Expand</h4>
                <p className="text-sm text-muted-foreground">
                  You can edit and add more details in the Context Manager
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600">3</span>
              </div>
              <div>
                <h4 className="font-medium">Weekly Learning</h4>
                <p className="text-sm text-muted-foreground">
                  AI learns from feedback and suggests context improvements weekly
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {isComplete && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Ready to Launch!</h4>
                <p className="text-sm text-green-700">
                  You&apos;ve provided enough information to get started. You can always add more details later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <Card className="bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Pro Tip</h4>
              <p className="text-sm text-blue-800 mt-1">
                The more specific you are, the better our AI can help you collect relevant feedback.
                Don&apos;t worry about being perfect - you can refine everything later!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleComplete}
          className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          disabled={!isComplete}
        >
          Complete Setup
          <CheckCircle className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}