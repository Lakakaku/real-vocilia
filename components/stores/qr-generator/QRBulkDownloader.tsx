'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TEMPLATE_SPECS } from '@/lib/qr/constants';

interface QRBulkDownloaderProps {
  businessId: string;
  storeCount: number;
  language?: 'sv' | 'en';
  onComplete?: () => void;
}

export function QRBulkDownloader({
  businessId,
  storeCount,
  language = 'sv',
  onComplete
}: QRBulkDownloaderProps) {
  const [template, setTemplate] = useState<'counter' | 'wall' | 'window'>('wall');
  const [format, setFormat] = useState<'PDF' | 'ZIP'>('PDF');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      setSuccess(false);
      setProgress(10);

      const response = await fetch('/api/stores/qr/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          template,
          format,
        }),
      });

      setProgress(50);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to generate bulk download');
      }

      setProgress(90);

      // Open download link
      window.open(data.data.downloadUrl, '_blank');

      setJobId(data.data.jobId);
      setSuccess(true);
      setProgress(100);

      // Call completion callback
      onComplete?.();

      // Reset after delay
      setTimeout(() => {
        setProgress(0);
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Bulk download failed:', err);
      setError(
        language === 'sv'
          ? 'Kunde inte generera bulk-nedladdning'
          : 'Failed to generate bulk download'
      );
      setProgress(0);
    } finally {
      setDownloading(false);
    }
  };

  const estimatedSize = () => {
    const baseSize = 50; // KB
    const perStoreSize = format === 'PDF' ? 100 : 200; // KB
    const total = baseSize + (perStoreSize * storeCount);

    if (total > 1024) {
      return `${(total / 1024).toFixed(1)} MB`;
    }
    return `${total} KB`;
  };

  const estimatedTime = () => {
    const seconds = Math.ceil(storeCount * 0.5);
    if (seconds < 60) {
      return language === 'sv' ? `~${seconds} sekunder` : `~${seconds} seconds`;
    }
    const minutes = Math.ceil(seconds / 60);
    return language === 'sv' ? `~${minutes} minuter` : `~${minutes} minutes`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {language === 'sv' ? 'Bulk-nedladdning' : 'Bulk Download'}
        </CardTitle>
        <CardDescription>
          {language === 'sv'
            ? `Ladda ner QR-koder för alla ${storeCount} butiker samtidigt`
            : `Download QR codes for all ${storeCount} stores at once`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            {language === 'sv' ? 'Välj mall' : 'Select Template'}
          </label>
          <Select
            value={template}
            onValueChange={(v) => setTemplate(v as 'counter' | 'wall' | 'window')}
            disabled={downloading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="counter">
                {TEMPLATE_SPECS.counter.displayName}
              </SelectItem>
              <SelectItem value="wall">
                {TEMPLATE_SPECS.wall.displayName}
              </SelectItem>
              <SelectItem value="window">
                {TEMPLATE_SPECS.window.displayName}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            {language === 'sv' ? 'Välj format' : 'Select Format'}
          </label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as 'PDF' | 'ZIP')}
            disabled={downloading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PDF">
                {language === 'sv'
                  ? 'Enkel PDF (alla QR-koder i ett dokument)'
                  : 'Single PDF (all QR codes in one document)'
                }
              </SelectItem>
              <SelectItem value="ZIP">
                {language === 'sv'
                  ? 'ZIP-arkiv (separata filer för varje butik)'
                  : 'ZIP Archive (separate files for each store)'
                }
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {language === 'sv' ? 'Uppskattad storlek:' : 'Estimated size:'}
            </span>
            <span className="font-medium">{estimatedSize()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              {language === 'sv' ? 'Beräknad tid:' : 'Estimated time:'}
            </span>
            <span className="font-medium">{estimatedTime()}</span>
          </div>
        </div>

        {/* Progress */}
        {downloading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-gray-600">
              {language === 'sv' ? 'Genererar QR-koder...' : 'Generating QR codes...'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {language === 'sv'
                ? `Nedladdning klar! Job-ID: ${jobId}`
                : `Download complete! Job ID: ${jobId}`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={downloading || storeCount === 0}
          className="w-full"
          size="lg"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === 'sv' ? 'Genererar...' : 'Generating...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {language === 'sv'
                ? `Ladda ner ${storeCount} QR-koder`
                : `Download ${storeCount} QR Codes`
              }
            </>
          )}
        </Button>

        {/* Help Text */}
        <p className="text-xs text-gray-500 text-center">
          {language === 'sv'
            ? 'Nedladdningen öppnas i en ny flik. Blockera inte popup-fönster.'
            : 'Download will open in a new tab. Don\'t block pop-ups.'
          }
        </p>
      </CardContent>
    </Card>
  );
}