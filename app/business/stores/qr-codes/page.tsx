'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Download, Store, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { QRCodeDisplay } from '@/components/stores/qr-generator/QRCodeDisplay';
import { TEMPLATE_SPECS, TRANSLATIONS } from '@/lib/qr/constants';

export default function QRCodeDownloadCenter() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<'counter' | 'wall' | 'window'>('wall');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'PNG' | 'SVG'>('PDF');
  const [language, setLanguage] = useState<'sv' | 'en'>('sv');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translations = TRANSLATIONS[language];

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to continue');
        return;
      }

      // Get stores for the business
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('business_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setStores(data || []);
      if (data && data.length > 0) {
        setSelectedStore(data[0]);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
      setError('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedStore) return;

    try {
      setDownloading(true);

      const response = await fetch('/api/stores/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: selectedStore.id,
          templateName: selectedSize,
          format: selectedFormat,
          includeLogo: true,
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

  const handleBulkDownload = async () => {
    try {
      setDownloading(true);

      const response = await fetch('/api/stores/qr/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: stores[0]?.business_id,
          template: selectedSize,
          format: selectedFormat,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to start bulk download');
      }

      // Poll for completion
      // In a real implementation, this would show a progress bar
      alert(`Bulk download started. Job ID: ${data.data.jobId}`);
    } catch (err) {
      console.error('Bulk download failed:', err);
      setError('Failed to start bulk download');
    } finally {
      setDownloading(false);
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
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Store className="h-4 w-4" />
          <AlertDescription>
            No stores found. Please add a store first to generate QR codes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <QrCode className="h-8 w-8" />
          QR Code Download Center
        </h1>
        <p className="text-gray-600 mt-2">
          Generate and download QR codes for your stores
        </p>
      </div>

      {/* Language Selector */}
      <div className="mb-6 flex justify-end">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Select store and QR code options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'sv' ? 'Välj butik' : 'Select Store'}
              </label>
              <Select
                value={selectedStore?.id}
                onValueChange={(id) => {
                  const store = stores.find(s => s.id === id);
                  setSelectedStore(store);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.store_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {translations.select_size}
              </label>
              <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="counter">Counter</TabsTrigger>
                  <TabsTrigger value="wall">Wall</TabsTrigger>
                  <TabsTrigger value="window">Window</TabsTrigger>
                </TabsList>
                <TabsContent value={selectedSize} className="mt-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold">
                      {TEMPLATE_SPECS[selectedSize].displayName}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {TEMPLATE_SPECS[selectedSize].description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {TEMPLATE_SPECS[selectedSize].useCase}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Format Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {translations.select_format}
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

            {/* Download Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleDownload}
                disabled={!selectedStore || downloading}
                className="w-full"
                size="lg"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {translations.downloading}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {translations.download_button}
                  </>
                )}
              </Button>

              {stores.length > 1 && (
                <Button
                  onClick={handleBulkDownload}
                  disabled={downloading}
                  variant="outline"
                  className="w-full"
                >
                  Download All Stores ({stores.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div>
          {selectedStore && (
            <QRCodeDisplay
              storeId={selectedStore.id}
              storeName={selectedStore.name}
              storeCode={selectedStore.store_code}
              size={selectedSize}
              includeLogo={true}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Download</h4>
              <p className="text-sm text-gray-600">
                Select your store and preferred size, then download the QR code
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Print</h4>
              <p className="text-sm text-gray-600">
                Print the QR code using a standard printer at the recommended size
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Display</h4>
              <p className="text-sm text-gray-600">
                Place the QR code where customers can easily scan it
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}