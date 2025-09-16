'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Image, Package } from 'lucide-react';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { QRDownloadHistory as HistoryType } from '@/lib/types/qr';

interface QRDownloadHistoryProps {
  businessId: string;
  storeId?: string;
  language?: 'sv' | 'en';
  limit?: number;
}

export function QRDownloadHistory({
  businessId,
  storeId,
  language = 'sv',
  limit = 20
}: QRDownloadHistoryProps) {
  const [history, setHistory] = useState<HistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const dateLocale = language === 'sv' ? sv : enUS;

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (storeId) {
        params.append('storeId', storeId);
      }

      const response = await fetch(`/api/stores/qr/history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load history');
      }

      setHistory(data.data.downloads);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(language === 'sv' ? 'Kunde inte ladda historik' : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, storeId, language]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return <FileText className="h-4 w-4" />;
      case 'PNG':
      case 'SVG':
        return <Image className="h-4 w-4" />; {/* eslint-disable-line jsx-a11y/alt-text */}
      case 'ZIP':
        return <Package className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getTemplateLabel = (templateId: string) => {
    const templates: Record<string, { sv: string; en: string }> = {
      'counter': { sv: 'Kassadisk', en: 'Counter' },
      'wall': { sv: 'Vägg', en: 'Wall' },
      'window': { sv: 'Skyltfönster', en: 'Window' }
    };
    return templates[templateId]?.[language] || templateId;
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          {language === 'sv' ? 'Ingen nedladdningshistorik ännu' : 'No download history yet'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'sv' ? 'Nedladdningshistorik' : 'Download History'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'sv' ? 'Datum' : 'Date'}</TableHead>
                <TableHead>{language === 'sv' ? 'Butik' : 'Store'}</TableHead>
                <TableHead>{language === 'sv' ? 'Mall' : 'Template'}</TableHead>
                <TableHead>{language === 'sv' ? 'Format' : 'Format'}</TableHead>
                <TableHead>{language === 'sv' ? 'Storlek' : 'Size'}</TableHead>
                <TableHead>{language === 'sv' ? 'Version' : 'Version'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(item.downloaded_at || item.created_at), 'PPp')}
                  </TableCell>
                  <TableCell>
                    {(item as any).stores?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getTemplateLabel(item.template_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getFormatIcon(item.format)}
                      <span>{item.format}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.file_size_kb} KB
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{item.qr_version}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              {language === 'sv' ? 'Föregående' : 'Previous'}
            </Button>
            <span className="text-sm text-gray-600">
              {language === 'sv' ? `Sida ${page} av ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              {language === 'sv' ? 'Nästa' : 'Next'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}