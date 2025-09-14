'use client'

import { useState } from 'react'
import { OnboardingStepProps, POSSystem, VerificationPreference } from '@/types/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Monitor, Upload, CheckCircle, Info, Settings, Zap } from 'lucide-react'

const POS_SYSTEMS: { value: POSSystem; label: string; description: string }[] = [
  {
    value: 'manual',
    label: 'Manual Verification',
    description: 'Upload your verified transactions as CSV files each week'
  },
  {
    value: 'square',
    label: 'Square',
    description: 'Automatic sync with your Square POS system'
  },
  {
    value: 'shopify',
    label: 'Shopify',
    description: 'Direct integration with your Shopify store'
  },
  {
    value: 'custom',
    label: 'Custom/Other',
    description: 'We\'ll work with you to integrate your specific system'
  },
]

const VERIFICATION_OPTIONS: { value: VerificationPreference; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'automated',
    label: 'Fully Automated',
    description: 'Transactions verified automatically through POS integration',
    icon: <Zap className="w-5 h-5 text-green-600" />
  },
  {
    value: 'manual_upload',
    label: 'Manual Upload',
    description: 'Upload verified CSV files weekly',
    icon: <Upload className="w-5 h-5 text-blue-600" />
  },
  {
    value: 'hybrid',
    label: 'Hybrid Approach',
    description: 'Automated with manual review for exceptions',
    icon: <Settings className="w-5 h-5 text-purple-600" />
  },
]

export function IntegrationStep({ data, onNext, onBack }: OnboardingStepProps) {
  const [posSystem, setPosSystem] = useState<POSSystem>(data.step4?.posSystem || 'manual')
  const [verificationPreference, setVerificationPreference] = useState<VerificationPreference>(
    data.step4?.verificationPreference || 'manual_upload'
  )
  const [hasExistingIntegration, setHasExistingIntegration] = useState(data.step4?.hasExistingIntegration || false)

  const handleContinue = () => {
    onNext({
      posSystem,
      verificationPreference,
      hasExistingIntegration,
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Technical Integration</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose how you&apos;ll verify customer transactions
        </p>
      </div>

      {/* POS System Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Your POS System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={posSystem} onValueChange={(value) => setPosSystem(value as POSSystem)}>
            <div className="space-y-4">
              {POS_SYSTEMS.map((system) => (
                <div key={system.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={system.value} id={system.value} className="mt-1" />
                  <Label htmlFor={system.value} className="cursor-pointer">
                    <div>
                      <div className="font-medium">{system.label}</div>
                      <div className="text-sm text-muted-foreground">{system.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Verification Method */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {VERIFICATION_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  verificationPreference === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setVerificationPreference(option.value)}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{option.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>
                  {verificationPreference === option.value && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Timeline */}
      <Card className="bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Integration Timeline</h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Manual upload: Start immediately</li>
                <li>• POS integration: 2-3 business days for setup</li>
                <li>• Custom integration: We&apos;ll contact you within 24 hours</li>
              </ul>
              <p className="mt-3 text-sm text-blue-700">
                You can start with manual upload and switch to automated integration anytime.
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
        <Button size="lg" onClick={handleContinue} className="group">
          Continue
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  )
}