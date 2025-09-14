'use client'

import { useState } from 'react'
import { OnboardingStepProps, IndustryBenefit, BUSINESS_TYPE_LABELS } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, AlertCircle, TrendingDown, Users, BarChart3, Play, CheckCircle } from 'lucide-react'

const INDUSTRY_BENEFITS: IndustryBenefit[] = [
  {
    industry: 'restaurant',
    benefits: [
      'Discover menu items customers want but you don\'t offer',
      'Identify service issues before they become reviews',
      'Understand peak time pain points',
    ],
    commonInsights: ['Wait time complaints', 'Food quality feedback', 'Atmosphere preferences'],
    avgROI: '15x',
  },
  {
    industry: 'retail',
    benefits: [
      'Understand why customers browse but don\'t buy',
      'Discover product gaps in your inventory',
      'Improve checkout experience',
    ],
    commonInsights: ['Product availability', 'Staff helpfulness', 'Store layout'],
    avgROI: '12x',
  },
  {
    industry: 'grocery',
    benefits: [
      'Track freshness perception in real-time',
      'Optimize product placement',
      'Reduce checkout friction',
    ],
    commonInsights: ['Product freshness', 'Queue management', 'Price perception'],
    avgROI: '18x',
  },
]

export function EducationStep({ data, onNext, onBack, onSkip }: OnboardingStepProps) {
  const [hasWatchedDemo, setHasWatchedDemo] = useState(false)
  const [expandedBenefit, setExpandedBenefit] = useState<string | null>(null)

  const handleContinue = () => {
    onNext({
      hasViewedEducation: true,
      hasWatchedDemo,
      understoodBenefits: true,
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Why Feedback Matters</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Most businesses are flying blind. Here&apos;s what you&apos;re missing without proper feedback.
        </p>
      </div>

      {/* The Hidden Cost of Not Knowing */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span>The Hidden Cost of Not Knowing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">90%</div>
              <p className="text-sm text-gray-700">
                of dissatisfied customers never complain - they just don&apos;t return
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">5x</div>
              <p className="text-sm text-gray-700">
                more expensive to acquire a new customer than retain an existing one
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">4%</div>
              <p className="text-sm text-gray-700">
                of unhappy customers actually tell you what&apos;s wrong
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo */}
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Play className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">See Vocilia in Action</h3>
            <p className="text-muted-foreground">
              Watch how real customers provide valuable feedback through natural conversations
            </p>
            <Button
              size="lg"
              onClick={() => setHasWatchedDemo(true)}
              className="group"
            >
              {hasWatchedDemo ? (
                <>
                  <CheckCircle className="mr-2 w-4 h-4" />
                  Demo Watched
                </>
              ) : (
                <>
                  <Play className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                  Play Demo (2 min)
                </>
              )}
            </Button>
            {hasWatchedDemo && (
              <p className="text-sm text-green-600 font-medium">
                Great! You&apos;ve seen how powerful voice feedback can be.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Industry-Specific Benefits */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">Benefits for Your Industry</h3>
        <div className="grid gap-4">
          {INDUSTRY_BENEFITS.map((benefit) => (
            <Card
              key={benefit.industry}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setExpandedBenefit(
                expandedBenefit === benefit.industry ? null : benefit.industry
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{BUSINESS_TYPE_LABELS[benefit.industry]}</span>
                  <span className="text-sm font-normal text-green-600">
                    {benefit.avgROI} average ROI
                  </span>
                </CardTitle>
              </CardHeader>
              {expandedBenefit === benefit.industry && (
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Key Benefits:</h4>
                      <ul className="space-y-1">
                        {benefit.benefits.map((b, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Common Insights Discovered:</h4>
                      <div className="flex flex-wrap gap-2">
                        {benefit.commonInsights.map((insight, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {insight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Comparison with Traditional Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Vocilia vs. Traditional Feedback Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-red-600">Traditional Surveys</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm">2% response rate</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm">Only extremes respond</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm">Delayed insights (monthly/quarterly)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm">No reward for participation</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-green-600">Vocilia Voice Feedback</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">10-20% participation rate</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Average customers participate</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Weekly actionable insights</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">3-15% cashback rewards</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleContinue}
            className="group"
          >
            I&apos;m Ready to Transform My Business
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}