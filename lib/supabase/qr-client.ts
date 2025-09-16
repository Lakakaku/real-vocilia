// Supabase Client Functions for QR Code Operations

import { createClient as createServerClient } from './server';
import { createClient as createClientClient } from './client';
import {
  QRTemplate,
  QRCache,
  QRDownloadHistory,
  QRTranslation,
  QRHistoryParams
} from '../types/qr';

// Helper to get the appropriate Supabase client
function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side
    return createServerClient();
  } else {
    // Client-side
    return createClientClient();
  }
}

export class QRSupabaseClient {
  /**
   * Get all available QR templates
   */
  static async getTemplates(): Promise<QRTemplate[]> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a specific template by name
   */
  static async getTemplateByName(name: 'counter' | 'wall' | 'window'): Promise<QRTemplate | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_templates')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Get translations for a language
   */
  static async getTranslations(languageCode: 'sv' | 'en'): Promise<QRTranslation[]> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_translations')
      .select('*')
      .eq('language_code', languageCode)
      .eq('context', 'instruction');

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if a QR code is cached
   */
  static async getCachedQR(
    storeId: string,
    templateId: string,
    format: 'PDF' | 'PNG' | 'SVG',
    version: number
  ): Promise<QRCache | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_cache')
      .select('*')
      .eq('store_id', storeId)
      .eq('template_id', templateId)
      .eq('format', format)
      .eq('qr_version', version)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Update access count and time if found
    if (data) {
      await supabase
        .from('qr_cache')
        .update({
          accessed_at: new Date().toISOString(),
          access_count: data.access_count + 1,
        })
        .eq('id', data.id);
    }

    return data;
  }

  /**
   * Save QR code to cache
   */
  static async saveToCache(cache: Omit<QRCache, 'id' | 'generated_at' | 'accessed_at' | 'access_count'>): Promise<QRCache> {
    const supabase = await getSupabaseClient();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    const { data, error } = await supabase
      .from('qr_cache')
      .insert({
        ...cache,
        expires_at: expiresAt.toISOString(),
        access_count: 1,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Log QR download
   */
  static async logDownload(download: Omit<QRDownloadHistory, 'id' | 'downloaded_at' | 'created_at'>): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('qr_download_history')
      .insert(download);

    if (error) throw error;
  }

  /**
   * Get download history for a business
   */
  static async getDownloadHistory(
    businessId: string,
    params: QRHistoryParams
  ): Promise<{ downloads: QRDownloadHistory[]; total: number }> {
    const supabase = await getSupabaseClient();
    const { storeId, startDate, endDate, page = 1, limit = 50 } = params;

    let query = supabase
      .from('qr_download_history')
      .select('*, stores!inner(name)', { count: 'exact' })
      .eq('business_id', businessId);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (startDate) {
      query = query.gte('downloaded_at', startDate);
    }

    if (endDate) {
      query = query.lte('downloaded_at', endDate);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('downloaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      downloads: data || [],
      total: count || 0,
    };
  }

  /**
   * Get store with QR version
   */
  static async getStore(storeId: string): Promise<any> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update store QR version
   */
  static async updateStoreQRVersion(storeId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('stores')
      .update({
        qr_version: supabase.rpc('increment', { x: 1 }),
        qr_generated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) throw error;
  }

  /**
   * Get all stores for a business
   */
  static async getBusinessStores(businessId: string): Promise<any[]> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Clean expired cache entries
   */
  static async cleanExpiredCache(): Promise<number> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    path: string,
    file: Blob | Buffer,
    contentType: string
  ): Promise<string> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.storage
      .from('qr-codes')
      .upload(path, file, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Get signed URL for file download
   */
  static async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.storage
      .from('qr-codes')
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(path: string): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.storage
      .from('qr-codes')
      .remove([path]);

    if (error) throw error;
  }

  /**
   * Create storage bucket if it doesn't exist
   */
  static async ensureStorageBucket(): Promise<void> {
    const supabase = await getSupabaseClient();

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) throw listError;

    const bucketExists = buckets?.some(b => b.name === 'qr-codes');

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('qr-codes', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/svg+xml', 'application/pdf'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createError && createError.message !== 'Bucket already exists') {
        throw createError;
      }
    }
  }
}

// Export utility functions
export const getTemplates = QRSupabaseClient.getTemplates.bind(QRSupabaseClient);
export const getTemplateByName = QRSupabaseClient.getTemplateByName.bind(QRSupabaseClient);
export const getTranslations = QRSupabaseClient.getTranslations.bind(QRSupabaseClient);
export const getCachedQR = QRSupabaseClient.getCachedQR.bind(QRSupabaseClient);
export const saveToCache = QRSupabaseClient.saveToCache.bind(QRSupabaseClient);
export const logDownload = QRSupabaseClient.logDownload.bind(QRSupabaseClient);
export const getDownloadHistory = QRSupabaseClient.getDownloadHistory.bind(QRSupabaseClient);
export const getStore = QRSupabaseClient.getStore.bind(QRSupabaseClient);
export const updateStoreQRVersion = QRSupabaseClient.updateStoreQRVersion.bind(QRSupabaseClient);
export const getBusinessStores = QRSupabaseClient.getBusinessStores.bind(QRSupabaseClient);
export const cleanExpiredCache = QRSupabaseClient.cleanExpiredCache.bind(QRSupabaseClient);
export const uploadFile = QRSupabaseClient.uploadFile.bind(QRSupabaseClient);
export const getSignedUrl = QRSupabaseClient.getSignedUrl.bind(QRSupabaseClient);
export const deleteFile = QRSupabaseClient.deleteFile.bind(QRSupabaseClient);
export const ensureStorageBucket = QRSupabaseClient.ensureStorageBucket.bind(QRSupabaseClient);