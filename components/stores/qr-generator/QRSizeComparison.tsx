'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ruler, Maximize2, Store, Home } from 'lucide-react';
import { QR_SIZES } from '@/lib/qr/constants';

interface QRSizeComparisonProps {
  selectedTemplate?: 'counter' | 'wall' | 'window';
  language?: 'sv' | 'en';
  onSelectTemplate?: (template: 'counter' | 'wall' | 'window') => void;
}

export function QRSizeComparison({
  selectedTemplate,
  language = 'sv',
  onSelectTemplate
}: QRSizeComparisonProps) {
  const templates = [
    {
      id: 'counter' as const,
      icon: Store,
      color: 'blue',
      ...QR_SIZES.counter
    },
    {
      id: 'wall' as const,
      icon: Home,
      color: 'green',
      ...QR_SIZES.wall
    },
    {
      id: 'window' as const,
      icon: Maximize2,
      color: 'purple',
      ...QR_SIZES.window
    }
  ];

  const getRelativeSize = (template: typeof templates[0]) => {
    const baseSize = QR_SIZES.counter.dimensions.width;
    const scale = template.dimensions.width / baseSize;
    return Math.round(scale * 100);
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          {language === 'sv' ? 'Storleksjämförelse' : 'Size Comparison'}
        </CardTitle>
        <CardDescription>
          {language === 'sv'
            ? 'Jämför de olika QR-kodsstorlekarna för att välja rätt för din butik'
            : 'Compare different QR code sizes to choose the right one for your store'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visual Size Comparison */}
        <div className="mb-6 flex items-end justify-center gap-4 h-48">
          {templates.map((template) => {
            const Icon = template.icon;
            const relativeSize = getRelativeSize(template);
            const height = (relativeSize / 100) * 150; // Max height 150px

            return (
              <div
                key={template.id}
                className={`relative flex flex-col items-center cursor-pointer transition-all ${
                  selectedTemplate === template.id ? 'scale-105' : 'hover:scale-105'
                }`}
                onClick={() => onSelectTemplate?.(template.id)}
              >
                <div
                  className={`border-2 rounded-lg flex items-center justify-center ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 bg-white'
                  }`}
                  style={{
                    width: `${relativeSize}px`,
                    height: `${height}px`,
                  }}
                >
                  <Icon
                    className={`${
                      selectedTemplate === template.id
                        ? 'text-primary'
                        : 'text-gray-400'
                    }`}
                    style={{
                      width: `${relativeSize * 0.4}px`,
                      height: `${relativeSize * 0.4}px`,
                    }}
                  />
                </div>
                <span className="text-xs mt-2 font-medium text-gray-700">
                  {template.dimensions.width}cm
                </span>
              </div>
            );
          })}
        </div>

        {/* Detailed Comparison Table */}
        <div className="space-y-3">
          {templates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;
            const colorClass = colorClasses[template.color as keyof typeof colorClasses];

            return (
              <div
                key={template.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onSelectTemplate?.(template.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {template.displayName}
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            {language === 'sv' ? 'Vald' : 'Selected'}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {template.useCase}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">
                      {language === 'sv' ? 'Storlek:' : 'Size:'}
                    </span>
                    <span className="ml-1 font-medium">
                      {template.dimensions.width}×{template.dimensions.height}cm
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {language === 'sv' ? 'QR:' : 'QR:'}
                    </span>
                    <span className="ml-1 font-medium">
                      {template.dimensions.qrSize}cm
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {language === 'sv' ? 'DPI:' : 'DPI:'}
                    </span>
                    <span className="ml-1 font-medium">
                      {template.printSpecs.dpi}
                    </span>
                  </div>
                </div>

                {/* Best For */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.id === 'counter' && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Nära kunder' : 'Close to customers'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Diskret' : 'Discrete'}
                      </Badge>
                    </>
                  )}
                  {template.id === 'wall' && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Mest populär' : 'Most popular'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Allsidig' : 'Versatile'}
                      </Badge>
                    </>
                  )}
                  {template.id === 'window' && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Maximal synlighet' : 'Maximum visibility'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {language === 'sv' ? 'Utomhus' : 'Outdoor'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{language === 'sv' ? 'Tips:' : 'Tip:'}</strong>{' '}
            {language === 'sv'
              ? 'Välj "Vägg" om du är osäker - det är den mest mångsidiga storleken som fungerar bra i de flesta situationer.'
              : 'Choose "Wall" if unsure - it\'s the most versatile size that works well in most situations.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}