'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Store, Home, Maximize2 } from 'lucide-react';
import { TEMPLATE_SPECS } from '@/lib/qr/constants';

interface QRTemplateSelectorProps {
  selectedTemplate: 'counter' | 'wall' | 'window';
  onTemplateChange: (template: 'counter' | 'wall' | 'window') => void;
  language?: 'sv' | 'en';
}

export function QRTemplateSelector({
  selectedTemplate,
  onTemplateChange,
  language = 'sv'
}: QRTemplateSelectorProps) {
  const templates = [
    {
      id: 'counter',
      icon: Store,
      ...TEMPLATE_SPECS.counter
    },
    {
      id: 'wall',
      icon: Home,
      ...TEMPLATE_SPECS.wall
    },
    {
      id: 'window',
      icon: Maximize2,
      ...TEMPLATE_SPECS.window
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'sv' ? 'Välj QR-kodsstorlek' : 'Select QR Code Size'}</CardTitle>
        <CardDescription>
          {language === 'sv'
            ? 'Välj rätt storlek baserat på var QR-koden ska placeras'
            : 'Choose the right size based on where the QR code will be placed'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedTemplate}
          onValueChange={(value) => onTemplateChange(value as 'counter' | 'wall' | 'window')}
          className="space-y-4"
        >
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
              >
                <RadioGroupItem value={template.id} id={template.id} />
                <Label
                  htmlFor={template.id}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-5 w-5 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-base">
                        {template.displayName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {template.useCase}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{template.dimensions.width} × {template.dimensions.height} cm</span>
                        <span>QR: {template.dimensions.qrSize} cm</span>
                        <span>{template.printSpecs.dpi} DPI</span>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}