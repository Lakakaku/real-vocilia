'use client'

import { useState } from 'react'
import { OnboardingStepProps, SUCCESS_STORIES, ROICalculation } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, TrendingUp, Users, Clock, Target, Sparkles, Calculator } from 'lucide-react'

export function WelcomeStep({ data, onNext, onSkip }: OnboardingStepProps) {
  const [hasViewedCarousel, setHasViewedCarousel] = useState(false)
  const [showROICalculator, setShowROICalculator] = useState(false)
  const [roiInputs, setRoiInputs] = useState({
    monthlyCustomers: 1000,
    avgTransactionValue: 500,
    participationRate: 15,
  })

  const calculateROI = (): ROICalculation => {
    const { monthlyCustomers, avgTransactionValue, participationRate } = roiInputs
    const expectedFeedbackCount = Math.round(monthlyCustomers * (participationRate / 100))
    const avgRewardPercentage = 8 // Average 8% reward
    const totalRewardCost = expectedFeedbackCount * avgTransactionValue * (avgRewardPercentage / 100)
    const platformFee = totalRewardCost * 0.2 // 20% platform fee
    const totalMonthlyCost = totalRewardCost + platformFee
    const costPerInsight = totalMonthlyCost / expectedFeedbackCount
    const traditionalResearchCost = 50000 // Typical monthly market research cost
    const comparisonToTraditional = Math.round((traditionalResearchCost / totalMonthlyCost) * 100) / 100

    return {
      monthlyCustomers,
      participationRate,
      avgTransactionValue,
      expectedFeedbackCount,
      avgRewardPercentage,
      totalRewardCost,
      platformFee,
      totalMonthlyCost,
      costPerInsight,
      comparisonToTraditional,
    }
  }

  const handleContinue = () => {
    onNext({
      hasViewedValueProp: true,
      hasViewedSuccessStories: hasViewedCarousel,
      hasUsedROICalculator: showROICalculator,
    })
  }

  const roi = calculateROI()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold">Welcome to the Future of Customer Feedback</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform every customer interaction into valuable insights with AI-powered voice feedback
        </p>
      </div>

      {/* Value Propositions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold">For Your Customers</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Turn every purchase into potential cashback. 3-15% rewards motivate quality feedback through natural voice conversations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold">For Your Business</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    10-20x higher response rates than surveys. Weekly actionable insights from real customers, not just extremes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Stories Carousel */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">Success Stories</h3>
        <Carousel className="w-full" onScrollCapture={() => setHasViewedCarousel(true)}>
          <CarouselContent>
            {SUCCESS_STORIES.map((story) => (
              <CarouselItem key={story.id}>
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-4">{story.icon}</div>
                    <h4 className="text-lg font-semibold mb-2">{story.businessName}</h4>
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{story.improvement}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {story.metric} in {story.timeframe}
                    </p>
                    {story.quote && (
                      <blockquote className="italic text-sm text-muted-foreground mt-4">
                        &ldquo;{story.quote}&rdquo;
                      </blockquote>
                    )}
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* ROI Calculator */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">ROI Calculator</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowROICalculator(!showROICalculator)}
            >
              {showROICalculator ? 'Hide' : 'Show'} Calculator
            </Button>
          </div>

          {showROICalculator && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customers">Monthly Customers</Label>
                  <Input
                    id="customers"
                    type="number"
                    value={roiInputs.monthlyCustomers}
                    onChange={(e) => setRoiInputs({ ...roiInputs, monthlyCustomers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="transaction">Avg Transaction (SEK)</Label>
                  <Input
                    id="transaction"
                    type="number"
                    value={roiInputs.avgTransactionValue}
                    onChange={(e) => setRoiInputs({ ...roiInputs, avgTransactionValue: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="participation">Expected Participation (%)</Label>
                  <Input
                    id="participation"
                    type="number"
                    value={roiInputs.participationRate}
                    onChange={(e) => setRoiInputs({ ...roiInputs, participationRate: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expected Feedback/Month:</span>
                  <span className="font-semibold">{roi.expectedFeedbackCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Monthly Cost:</span>
                  <span className="font-semibold">{roi.totalMonthlyCost.toLocaleString()} SEK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost per Insight:</span>
                  <span className="font-semibold">{Math.round(roi.costPerInsight)} SEK</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">vs. Traditional Research:</span>
                    <span className="text-lg font-bold text-green-600">{roi.comparisonToTraditional}x cheaper</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">Your Journey to Better Insights</h3>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>
          <div className="space-y-6">
            {[
              { icon: Clock, title: 'Today', description: 'Complete setup (15 minutes)' },
              { icon: Target, title: 'Tomorrow', description: 'Display QR codes in store' },
              { icon: Users, title: 'Week 1', description: 'First customer feedback arrives' },
              { icon: TrendingUp, title: 'Month 1', description: 'Measurable improvements from insights' },
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white border-4 border-blue-500">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 pt-3">
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="ghost"
          onClick={onSkip}
        >
          Skip this step
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          className="group"
        >
          Let&apos;s Get Started
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  )
}