'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateQRCode, generateStoreQRUrl } from '@/lib/qr/generator';
import { QR_SIZES, TRANSLATIONS } from '@/lib/qr/constants';

interface QRCodeDisplayProps {
  storeId: string;
  storeName: string;
  storeCode: string;
  size?: 'counter' | 'wall' | 'window';
  includeLogo?: boolean;
  language?: 'sv' | 'en';
  onDownload?: () => void;
}

export function QRCodeDisplay({
  storeId,
  storeName,
  storeCode,
  size = 'wall',
  includeLogo = true,
  language = 'sv',
  onDownload
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations = TRANSLATIONS[language];
  const specs = QR_SIZES[size];

  const generateQR = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = generateStoreQRUrl(storeCode);
      const dataUrl = await generateQRCode({
        url,
        size: specs.qrSizePx,
        includeLogo,
      });

      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      setError(translations.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [storeCode, specs.qrSizePx, includeLogo, translations.error]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    // Create download link
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${storeCode}_qr_${size}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onDownload?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{storeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{translations.generating}</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : qrDataUrl ? (
          <>
            {/* QR Code Display */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
              <Image
                src={qrDataUrl}
                alt={`QR Code for ${storeName}`}
                width={specs.qrSizePx}
                height={specs.qrSizePx}
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

            {/* Instructions */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-900">
                {translations.scan_prompt}
              </h3>
              <p className="text-sm text-gray-700">
                {translations.cashback_info}
              </p>
              <ol className="text-sm text-gray-600 space-y-1 list-none">
                <li>{translations.step_1}</li>
                <li>{translations.step_2}</li>
                <li>{translations.step_3}</li>
              </ol>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {translations.download_button}
            </Button>

            {/* Size Info */}
            <div className="text-center text-sm text-gray-500">
              <p>
                {size === 'counter' && 'För kassadisk (10x10 cm)'}
                {size === 'wall' && 'För vägg (21x21 cm)'}
                {size === 'window' && 'För skyltfönster (30x30 cm)'}
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}