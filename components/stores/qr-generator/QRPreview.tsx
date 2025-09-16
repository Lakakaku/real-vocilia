'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Printer, Eye, EyeOff } from 'lucide-react';
import { TRANSLATIONS, QR_SIZES } from '@/lib/qr/constants';

interface QRPreviewProps {
  storeId: string;
  storeName: string;
  storeCode: string;
  template: 'counter' | 'wall' | 'window';
  includeLogo?: boolean;
  language?: 'sv' | 'en';
  onToggleLogo?: () => void;
  onDownload?: () => void;
}

export function QRPreview({
  storeId,
  storeName,
  storeCode,
  template,
  includeLogo = true,
  language = 'sv',
  onToggleLogo,
  onDownload
}: QRPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const translations = TRANSLATIONS[language];
  const specs = QR_SIZES[template];

  useEffect(() => {
    generatePreview();
  }, [storeId, template, includeLogo, language]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stores/qr/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          templateName: template,
          includeLogo,
          language,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to generate preview');
      }

      setPreviewUrl(data.data.dataUrl);
    } catch (err) {
      console.error('Preview generation failed:', err);
      setError(translations.error || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!previewUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${storeName}</title>
          <style>
            @page {
              size: ${specs.widthCm}cm ${specs.heightCm}cm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            .store-code {
              font-family: monospace;
              font-size: 24px;
              font-weight: bold;
              margin-top: 20px;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${previewUrl}" alt="QR Code" />
            <div class="store-code">${storeCode}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{storeName}</CardTitle>
          <Badge variant="secondary">
            {specs.displayName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-4">
            {error}
          </div>
        ) : previewUrl ? (
          <>
            {/* Preview Tabs */}
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  {language === 'sv' ? 'QR-kod' : 'QR Code'}
                </TabsTrigger>
                <TabsTrigger value="specs">
                  {language === 'sv' ? 'Specifikationer' : 'Specifications'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-4">
                {/* QR Code Image */}
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <img
                    src={previewUrl}
                    alt={`QR Code for ${storeName}`}
                    className="w-full h-auto max-w-xs mx-auto"
                  />

                  {/* Store Code */}
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      {translations.store_code_label}
                    </p>
                    <p className="text-2xl font-mono font-bold text-gray-900">
                      {storeCode}
                    </p>
                  </div>
                </div>

                {/* Instructions Toggle */}
                {showInstructions && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold text-gray-900">
                      {translations.scan_prompt}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {translations.cashback_info}
                    </p>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>{translations.step_1}</li>
                      <li>{translations.step_2}</li>
                      <li>{translations.step_3}</li>
                    </ol>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="specs" className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {language === 'sv' ? 'Dokumentstorlek:' : 'Document Size:'}
                    </span>
                    <span className="font-medium">
                      {specs.dimensions.width} × {specs.dimensions.height} cm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {language === 'sv' ? 'QR-kodsstorlek:' : 'QR Code Size:'}
                    </span>
                    <span className="font-medium">
                      {specs.dimensions.qrSize} cm ({specs.qrSizePx} px)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {language === 'sv' ? 'Utskriftskvalitet:' : 'Print Quality:'}
                    </span>
                    <span className="font-medium">
                      {specs.printSpecs.dpi} DPI
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {language === 'sv' ? 'Rekommenderad placering:' : 'Recommended Placement:'}
                    </span>
                    <span className="font-medium text-right">
                      {specs.useCase}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onToggleLogo}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {includeLogo ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    {language === 'sv' ? 'Dölj logotyp' : 'Hide Logo'}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    {language === 'sv' ? 'Visa logotyp' : 'Show Logo'}
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowInstructions(!showInstructions)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {showInstructions ? (
                  language === 'sv' ? 'Dölj instruktioner' : 'Hide Instructions'
                ) : (
                  language === 'sv' ? 'Visa instruktioner' : 'Show Instructions'
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                {language === 'sv' ? 'Skriv ut' : 'Print'}
              </Button>

              <Button
                onClick={onDownload}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {translations.download_button}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}