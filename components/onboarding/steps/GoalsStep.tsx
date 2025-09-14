'use client'

import { useState } from 'react'
import { OnboardingStepProps, BusinessGoal } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Target, TrendingUp, Users, Star, MessageSquare, AlertCircle, BarChart3, Clock } from 'lucide-react'

const BUSINESS_GOALS: { value: BusinessGoal; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'increase_retention',
    label: 'Increase Customer Retention',
    description: 'Understand why customers don\'t return and fix those issues',
    icon: <Users className="w-5 h-5 text-blue-600" />
  },
  {
    value: 'improve_satisfaction',
    label: 'Improve Customer Satisfaction',
    description: 'Get detailed feedback on what customers love and what needs work',
    icon: <Star className="w-5 h-5 text-yellow-600" />
  },
  {
    value: 'discover_opportunities',
    label: 'Discover New Opportunities',
    description: 'Learn what products or services customers wish you offered',
    icon: <TrendingUp className="w-5 h-5 text-green-600" />
  },
  {
    value: 'reduce_complaints',
    label: 'Reduce Complaints',
    description: 'Catch issues early before they become negative reviews',
    icon: <AlertCircle className="w-5 h-5 text-orange-600" />
  },
  {
    value: 'optimize_operations',
    label: 'Optimize Operations',
    description: 'Identify bottlenecks and inefficiencies in your service',
    icon: <Clock className="w-5 h-5 text-purple-600" />
  },
  {
    value: 'benchmark_performance',
    label: 'Benchmark Performance',
    description: 'Track improvement over time and across locations',
    icon: <BarChart3 className="w-5 h-5 text-indigo-600" />
  },
]

export function GoalsStep({ data, onNext, onBack }: OnboardingStepProps) {
  const [primaryGoals, setPrimaryGoals] = useState<BusinessGoal[]>(data.step5?.primaryGoals || [])
  const [expectedFeedbackVolume, setExpectedFeedbackVolume] = useState<number>(data.step5?.expectedFeedbackVolume || 100)
  const [customGoal, setCustomGoal] = useState(data.step5?.customGoal || '')

  const handleGoalToggle = (goal: BusinessGoal) => {
    setPrimaryGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    )
  }

  const handleContinue = () => {
    onNext({
      primaryGoals,
      expectedFeedbackVolume,
      customGoal,
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Define Your Success</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          What do you want to achieve with customer feedback?
        </p>
      </div>

      {/* Primary Goals Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Select Your Primary Goals (Choose up to 3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {BUSINESS_GOALS.map((goal) => (
              <div
                key={goal.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  primaryGoals.includes(goal.value)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${primaryGoals.length >= 3 && !primaryGoals.includes(goal.value) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (primaryGoals.includes(goal.value) || primaryGoals.length < 3) {
                    handleGoalToggle(goal.value)
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={primaryGoals.includes(goal.value)}
                    onCheckedChange={() => {
                      if (primaryGoals.includes(goal.value) || primaryGoals.length < 3) {
                        handleGoalToggle(goal.value)
                      }
                    }}
                    disabled={primaryGoals.length >= 3 && !primaryGoals.includes(goal.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {goal.icon}
                      <h4 className="font-medium">{goal.label}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {primaryGoals.length >= 3 && (
            <p className="text-sm text-orange-600 mt-4">
              Maximum of 3 goals selected. Deselect one to choose another.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expected Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Feedback Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedbackVolume">
                How many feedback responses do you want per month?
              </Label>
              <div className="mt-2 flex items-center space-x-4">
                <Input
                  id="feedbackVolume"
                  type="number"
                  min="10"
                  max="10000"
                  value={expectedFeedbackVolume}
                  onChange={(e) => setExpectedFeedbackVolume(parseInt(e.target.value) || 100)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">responses per month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on your expected customer volume, we recommend targeting {Math.round(expectedFeedbackVolume * 0.15)} to {Math.round(expectedFeedbackVolume * 0.20)} customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Any Specific Goal? (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customGoal">
              Tell us about any specific challenge or goal you have
            </Label>
            <textarea
              id="customGoal"
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
              placeholder="E.g., We want to understand why our evening sales are lower than morning sales..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Success Metrics Preview */}
      <Card className="bg-green-50">
        <CardContent className="p-6">
          <h4 className="font-medium text-green-900 mb-3">Your Success Metrics</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-700 font-medium">Week 1</p>
              <p className="text-green-600">First insights arrive</p>
            </div>
            <div>
              <p className="text-green-700 font-medium">Month 1</p>
              <p className="text-green-600">{expectedFeedbackVolume} feedback responses</p>
            </div>
            <div>
              <p className="text-green-700 font-medium">Month 3</p>
              <p className="text-green-600">Measurable improvements</p>
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
          onClick={handleContinue}
          className="group"
          disabled={primaryGoals.length === 0}
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  )
}