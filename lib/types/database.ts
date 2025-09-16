// Database types for Supabase store code validation
// Auto-generated types based on database schema
// Created: 2025-09-16

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          store_code: string;
          location?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          store_code: string;
          location?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          store_code?: string;
          location?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_code_validations: {
        Row: {
          id: string;
          store_code_attempt: string;
          ip_address: string;
          user_agent?: string;
          is_valid: boolean;
          store_id?: string;
          attempted_at: string;
          error_type?: string;
        };
        Insert: {
          id?: string;
          store_code_attempt: string;
          ip_address: string;
          user_agent?: string;
          is_valid: boolean;
          store_id?: string;
          attempted_at?: string;
          error_type?: string;
        };
        Update: {
          id?: string;
          store_code_attempt?: string;
          ip_address?: string;
          user_agent?: string;
          is_valid?: boolean;
          store_id?: string;
          attempted_at?: string;
          error_type?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      validate_store_code: {
        Args: {
          code: string;
        };
        Returns: Json;
      };
      check_rate_limit: {
        Args: {
          client_ip: string;
          window_minutes?: number;
          max_attempts?: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type aliases for easier usage
export type Store = Database['public']['Tables']['stores']['Row'];
export type StoreInsert = Database['public']['Tables']['stores']['Insert'];
export type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export type StoreCodeValidation = Database['public']['Tables']['store_code_validations']['Row'];
export type StoreCodeValidationInsert = Database['public']['Tables']['store_code_validations']['Insert'];
export type StoreCodeValidationUpdate = Database['public']['Tables']['store_code_validations']['Update'];

// API Response Types
export interface ValidateStoreCodeRequest {
  code: string;
}

export interface ValidateStoreCodeResponse {
  success: boolean;
  redirect_url?: string;
  error?: {
    code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'RATE_LIMITED' | 'NETWORK_ERROR';
    message: string;
    retry_after?: number;
  };
}

// Form State Types
export interface StoreCodeFormState {
  input_value: string;
  sanitized_value: string;
  is_valid_format: boolean;
  is_submitting: boolean;
  error_message?: string;
  attempts_count: number;
  last_attempt?: Date;
}

// Error Types
export type ValidationErrorType = 'invalid_format' | 'not_found' | 'inactive' | 'rate_limited';
export type ErrorType = 'INVALID_FORMAT' | 'NOT_FOUND' | 'RATE_LIMITED' | 'NETWORK_ERROR';

// Rate Limiting Types
export interface RateLimitState {
  attempts: number;
  window_start: Date;
  blocked_until?: Date;
}

// Utility Types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Function return types
export interface ValidationResult {
  valid: boolean;
  store_id?: string;
  redirect_url?: string;
  error?: string;
  message?: string;
}

// Constants
export const VALIDATION_CONSTANTS = {
  STORE_CODE_LENGTH: 6,
  STORE_CODE_PATTERN: /^[0-9]{6}$/,
  RATE_LIMIT_WINDOW_MINUTES: 1,
  RATE_LIMIT_MAX_ATTEMPTS: 5,
  VALIDATION_RETENTION_DAYS: 30,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_FORMAT: 'Please enter exactly 6 digits',
  NOT_FOUND: 'This code is not recognized. Please check and try again',
  RATE_LIMITED: 'Too many attempts. Please wait a minute and try again',
  NETWORK_ERROR: 'Connection issue. Please check your internet and try again',
} as const;