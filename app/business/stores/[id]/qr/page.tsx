'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, QrCode, History, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { QRPreview } from '@/components/stores/qr-generator/QRPreview';
import { QRDownloadHistory } from '@/components/stores/qr-generator/QRDownloadHistory';
import { QRInstructionCard } from '@/components/stores/qr-generator/QRInstructionCard';
import { QRSizeComparison } from '@/components/stores/qr-generator/QRSizeComparison';

export default function StoreQRPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params?.id as string;

  const [store, setStore] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'counter' | 'wall' | 'window'>('wall');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'PNG' | 'SVG'>('PDF');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [language, setLanguage] = useState<'sv' | 'en'>('sv');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStore();
  }, [storeId]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to continue');
        return;
      }

      // Get store details
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .eq('business_id', user.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Store not found');
        return;
      }

      setStore(data);
      setIncludeLogo(data.qr_logo_enabled !== false);
    } catch (err) {
      console.error('Failed to load store:', err);
      setError('Failed to load store details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!store) return;

    try {
      setDownloading(true);

      const response = await fetch('/api/stores/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: store.id,
          templateName: selectedTemplate,
          format: selectedFormat,
          includeLogo,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to generate QR code');
      }

      // Download the file
      window.open(data.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download QR code');
    } finally {
      setDownloading(false);
    }
  };

  const handleInvalidateCache = async () => {
    try {
      const response = await fetch('/api/stores/qr/invalidate-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: store.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadStore(); // Reload to get new version
        alert(`Cache invalidated. New version: ${data.data.newVersion}`);
      }
    } catch (err) {
      console.error('Failed to invalidate cache:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push('/business/stores')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push('/business/stores')}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <QrCode className="h-8 w-8" />
              {store.name} - QR Code
            </h1>
            <p className="text-gray-600 mt-2">
              Store Code: <span className="font-mono font-bold">{store.store_code}</span>
              {store.qr_version && (
                <span className="ml-4 text-sm">Version: {store.qr_version}</span>
              )}
            </p>
          </div>

          <Select value={language} onValueChange={(v) => setLanguage(v as 'sv' | 'en')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sv">Svenska</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="comparison">Sizes</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Customize your QR code settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Size Template
                  </label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={(v) => setSelectedTemplate(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counter">Counter (10×10 cm)</SelectItem>
                      <SelectItem value="wall">Wall (21×21 cm)</SelectItem>
                      <SelectItem value="window">Window (30×30 cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Format Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    File Format
                  </label>
                  <Select
                    value={selectedFormat}
                    onValueChange={(v) => setSelectedFormat(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF (Print Ready)</SelectItem>
                      <SelectItem value="PNG">PNG (Digital)</SelectItem>
                      <SelectItem value="SVG">SVG (Scalable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cache Management */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Cache Management</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Invalidate cache to force regeneration of QR codes
                  </p>
                  <Button
                    onClick={handleInvalidateCache}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Invalidate Cache
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <QRPreview
              storeId={store.id}
              storeName={store.name}
              storeCode={store.store_code}
              template={selectedTemplate}
              includeLogo={includeLogo}
              language={language}
              onToggleLogo={() => setIncludeLogo(!includeLogo)}
              onDownload={handleDownload}
            />
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <QRSizeComparison
            selectedTemplate={selectedTemplate}
            language={language}
            onSelectTemplate={setSelectedTemplate}
          />
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <QRInstructionCard
            language={language}
            variant="detailed"
            showBusinessBenefits={true}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Placement Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Counter QR Code</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Place near the payment terminal or on the counter where customers wait
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900">Wall QR Code</h4>
                <p className="text-sm text-green-700 mt-1">
                  Mount at eye level (150-170cm) in high-traffic areas
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900">Window QR Code</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Place on windows or entrances where it's visible from outside
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Download History
              </CardTitle>
              <CardDescription>
                Track all QR code downloads for this store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRDownloadHistory
                businessId={store.business_id}
                storeId={store.id}
                language={language}
                limit={10}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}