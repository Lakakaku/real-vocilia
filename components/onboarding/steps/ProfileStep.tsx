'use client'

import { useState } from 'react'
import { OnboardingStepProps, BusinessType, BUSINESS_TYPE_LABELS } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Store, MapPin, DollarSign, Users } from 'lucide-react'

export function ProfileStep({ data, onNext, onBack }: OnboardingStepProps) {
  const [businessType, setBusinessType] = useState<BusinessType>(data.step3?.businessType || 'retail')
  const [storeCount, setStoreCount] = useState(data.step3?.storeCount || 1)
  const [geographicCoverage, setGeographicCoverage] = useState(data.step3?.geographicCoverage || 'single_city')
  const [avgTransactionValue, setAvgTransactionValue] = useState(data.step3?.avgTransactionValue || 500)
  const [expectedCustomerVolume, setExpectedCustomerVolume] = useState(data.step3?.expectedCustomerVolume || 1000)
  const [monthlyFeedbackBudget, setMonthlyFeedbackBudget] = useState(data.step3?.monthlyFeedbackBudget || 10000)

  const handleContinue = () => {
    onNext({
      businessType,
      storeCount,
      geographicCoverage,
      avgTransactionValue,
      expectedCustomerVolume,
      monthlyFeedbackBudget,
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Tell Us About Your Business</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Help us customize Vocilia for your specific needs
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Type */}
        <Card>
          <CardContent className="p-6">
            <Label className="text-base font-semibold mb-4 flex items-center">
              <Store className="w-4 h-4 mr-2" />
              Business Type
            </Label>
            <Select value={businessType} onValueChange={(value) => setBusinessType(value as BusinessType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Store Count & Coverage */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="storeCount" className="flex items-center mb-2">
                <Store className="w-4 h-4 mr-2" />
                Number of Store Locations
              </Label>
              <Input
                id="storeCount"
                type="number"
                min="1"
                value={storeCount}
                onChange={(e) => setStoreCount(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label className="flex items-center mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                Geographic Coverage
              </Label>
              <RadioGroup value={geographicCoverage} onValueChange={(value) => setGeographicCoverage(value as 'single_city' | 'region' | 'national')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single_city" id="single_city" />
                  <Label htmlFor="single_city">Single City</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="region" id="region" />
                  <Label htmlFor="region">Regional (Multiple Cities)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="national" id="national" />
                  <Label htmlFor="national">National</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Business Metrics */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="avgTransaction" className="flex items-center mb-2">
                <DollarSign className="w-4 h-4 mr-2" />
                Average Transaction Value (SEK)
              </Label>
              <Input
                id="avgTransaction"
                type="number"
                value={avgTransactionValue}
                onChange={(e) => setAvgTransactionValue(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="customerVolume" className="flex items-center mb-2">
                <Users className="w-4 h-4 mr-2" />
                Expected Monthly Customers
              </Label>
              <Input
                id="customerVolume"
                type="number"
                value={expectedCustomerVolume}
                onChange={(e) => setExpectedCustomerVolume(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="feedbackBudget" className="flex items-center mb-2">
                <DollarSign className="w-4 h-4 mr-2" />
                Monthly Feedback Budget (SEK)
              </Label>
              <Input
                id="feedbackBudget"
                type="number"
                value={monthlyFeedbackBudget}
                onChange={(e) => setMonthlyFeedbackBudget(parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                This covers customer rewards and platform fees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button size="lg" onClick={handleContinue} className="group">
          Continue
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  )
}