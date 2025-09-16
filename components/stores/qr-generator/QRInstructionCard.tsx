'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Smartphone, MessageCircle, CreditCard, Store } from 'lucide-react';
import { TRANSLATIONS } from '@/lib/qr/constants';

interface QRInstructionCardProps {
  language?: 'sv' | 'en';
  variant?: 'compact' | 'detailed';
  showBusinessBenefits?: boolean;
}

export function QRInstructionCard({
  language = 'sv',
  variant = 'detailed',
  showBusinessBenefits = false
}: QRInstructionCardProps) {
  const translations = TRANSLATIONS[language];

  const customerSteps = [
    {
      icon: Smartphone,
      title: language === 'sv' ? 'Skanna QR-koden' : 'Scan QR Code',
      description: translations.step_1,
    },
    {
      icon: MessageCircle,
      title: language === 'sv' ? 'Lämna feedback' : 'Leave Feedback',
      description: translations.step_2,
    },
    {
      icon: CreditCard,
      title: language === 'sv' ? 'Få cashback' : 'Get Cashback',
      description: translations.step_3,
    },
  ];

  const businessBenefits = [
    {
      icon: CheckCircle2,
      title: language === 'sv' ? 'Äkta feedback' : 'Genuine Feedback',
      description: language === 'sv'
        ? 'Få värdefulla insikter från riktiga kunder'
        : 'Get valuable insights from real customers',
    },
    {
      icon: Store,
      title: language === 'sv' ? 'Öka lojalitet' : 'Increase Loyalty',
      description: language === 'sv'
        ? 'Belöna kunder för deras tid och feedback'
        : 'Reward customers for their time and feedback',
    },
    {
      icon: MessageCircle,
      title: language === 'sv' ? 'AI-analys' : 'AI Analysis',
      description: language === 'sv'
        ? 'Automatisk analys och sammanfattning av feedback'
        : 'Automatic analysis and summary of feedback',
    },
  ];

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {language === 'sv' ? 'Hur det fungerar' : 'How it works'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {customerSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={index} className="flex items-start gap-2">
                  <Icon className="h-4 w-4 text-primary mt-0.5" />
                  <span>{step.description}</span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'sv' ? 'Instruktioner' : 'Instructions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customer" className="w-full">
          <TabsList className={`grid w-full ${showBusinessBenefits ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="customer">
              {language === 'sv' ? 'För kunder' : 'For Customers'}
            </TabsTrigger>
            {showBusinessBenefits && (
              <TabsTrigger value="business">
                {language === 'sv' ? 'För företag' : 'For Business'}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="customer" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                {translations.scan_prompt}
              </h3>
              <p className="text-sm text-blue-700">
                {translations.cashback_info}
              </p>
            </div>

            <div className="space-y-4">
              {customerSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {index + 1}. {step.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                {language === 'sv'
                  ? 'Feedback behandlas anonymt och säkert'
                  : 'Feedback is processed anonymously and securely'
                }
              </p>
            </div>
          </TabsContent>

          {showBusinessBenefits && (
            <TabsContent value="business" className="space-y-4 mt-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">
                  {language === 'sv' ? 'Fördelar för ditt företag' : 'Benefits for Your Business'}
                </h3>
                <p className="text-sm text-purple-700">
                  {language === 'sv'
                    ? 'Vocilia hjälper dig att förstå dina kunder bättre'
                    : 'Vocilia helps you understand your customers better'
                  }
                </p>
              </div>

              <div className="space-y-4">
                {businessBenefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">
                          {benefit.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  {language === 'sv'
                    ? 'Veckovis sammanfattning av all feedback'
                    : 'Weekly summary of all feedback'
                  }
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}