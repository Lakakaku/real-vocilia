export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          application_user_id: string | null
          changed_fields: Json | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          operation: string | null
          query: string | null
          row_data: Json | null
          session_user_name: string | null
          table_name: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          application_user_id?: string | null
          changed_fields?: Json | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          operation?: string | null
          query?: string | null
          row_data?: Json | null
          session_user_name?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          application_user_id?: string | null
          changed_fields?: Json | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          operation?: string | null
          query?: string | null
          row_data?: Json | null
          session_user_name?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          allowed_ips: string[] | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          name: string | null
          permissions: Json | null
          role: string | null
          two_factor_enabled: boolean | null
          two_factor_secret_encrypted: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_ips?: string[] | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name?: string | null
          permissions?: Json | null
          role?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret_encrypted?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_ips?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name?: string | null
          permissions?: Json | null
          role?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret_encrypted?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_request_log: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          business_id: string
          cost: number | null
          created_at: string | null
          date: string
          id: string
          last_request_at: string | null
          requests: number | null
          tokens: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          cost?: number | null
          created_at?: string | null
          date: string
          id?: string
          last_request_at?: string | null
          requests?: number | null
          tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          cost?: number | null
          created_at?: string | null
          date?: string
          id?: string
          last_request_at?: string | null
          requests?: number | null
          tokens?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          activity_timestamp: string | null
          business_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          operation: string | null
          record_id: string | null
          request_id: string | null
          session_user_name: string | null
          severity: string | null
          store_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_timestamp?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string | null
          record_id?: string | null
          request_id?: string | null
          session_user_name?: string | null
          severity?: string | null
          store_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_timestamp?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string | null
          record_id?: string | null
          request_id?: string | null
          session_user_name?: string | null
          severity?: string | null
          store_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contexts: {
        Row: {
          ai_conversation_history: Json | null
          business_id: string
          completeness_details: Json | null
          completeness_score: number | null
          context_data: Json
          created_at: string | null
          custom_questions: Json | null
          customer_patterns: Json | null
          draft_data: Json | null
          fraud_indicators: Json | null
          has_unsaved_changes: boolean | null
          id: string
          last_ai_update: string | null
          last_draft_saved_at: string | null
          last_saved_at: string | null
          operational_details: Json | null
          physical_layout: Json | null
          products_services: Json | null
          staff_info: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_conversation_history?: Json | null
          business_id: string
          completeness_details?: Json | null
          completeness_score?: number | null
          context_data?: Json
          created_at?: string | null
          custom_questions?: Json | null
          customer_patterns?: Json | null
          draft_data?: Json | null
          fraud_indicators?: Json | null
          has_unsaved_changes?: boolean | null
          id?: string
          last_ai_update?: string | null
          last_draft_saved_at?: string | null
          last_saved_at?: string | null
          operational_details?: Json | null
          physical_layout?: Json | null
          products_services?: Json | null
          staff_info?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_conversation_history?: Json | null
          business_id?: string
          completeness_details?: Json | null
          completeness_score?: number | null
          context_data?: Json
          created_at?: string | null
          custom_questions?: Json | null
          customer_patterns?: Json | null
          draft_data?: Json | null
          fraud_indicators?: Json | null
          has_unsaved_changes?: boolean | null
          id?: string
          last_ai_update?: string | null
          last_draft_saved_at?: string | null
          last_saved_at?: string | null
          operational_details?: Json | null
          physical_layout?: Json | null
          products_services?: Json | null
          staff_info?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_contexts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          api_keys_encrypted: string | null
          avg_transaction_value: number | null
          business_type: string | null
          created_at: string | null
          email: string
          expected_feedback_volume: string | null
          id: string
          metadata: Json | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          pos_system: string | null
          primary_goals: string[] | null
          quick_context: Json | null
          settings: Json | null
          store_count: number | null
          subscription_ends_at: string | null
          subscription_status: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          verification_preference: string | null
        }
        Insert: {
          api_keys_encrypted?: string | null
          avg_transaction_value?: number | null
          business_type?: string | null
          created_at?: string | null
          email: string
          expected_feedback_volume?: string | null
          id?: string
          metadata?: Json | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          pos_system?: string | null
          primary_goals?: string[] | null
          quick_context?: Json | null
          settings?: Json | null
          store_count?: number | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_preference?: string | null
        }
        Update: {
          api_keys_encrypted?: string | null
          avg_transaction_value?: number | null
          business_type?: string | null
          created_at?: string | null
          email?: string
          expected_feedback_volume?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          pos_system?: string | null
          primary_goals?: string[] | null
          quick_context?: Json | null
          settings?: Json | null
          store_count?: number | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_preference?: string | null
        }
        Relationships: []
      }
      encrypted_columns: {
        Row: {
          column_name: string
          created_at: string | null
          description: string | null
          encryption_type: string
          id: string
          table_name: string
        }
        Insert: {
          column_name: string
          created_at?: string | null
          description?: string | null
          encryption_type: string
          id?: string
          table_name: string
        }
        Update: {
          column_name?: string
          created_at?: string | null
          description?: string | null
          encryption_type?: string
          id?: string
          table_name?: string
        }
        Relationships: []
      }
      failed_access_attempts: {
        Row: {
          attempted_at: string | null
          email: string | null
          endpoint: string | null
          id: string
          ip_address: unknown | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          email?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_rate_limits: {
        Row: {
          created_at: string | null
          feedback_count: number | null
          feedback_date: string
          id: string
          phone_number: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_count?: number | null
          feedback_date: string
          id?: string
          phone_number: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_count?: number | null
          feedback_date?: string
          id?: string
          phone_number?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_rate_limits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          audio_duration: number | null
          categories: string[] | null
          created_at: string | null
          feedback_text: string | null
          fraud_risk_score: number | null
          id: string
          is_fraudulent: boolean | null
          is_verified: boolean | null
          key_insights: Json | null
          payment_id: string | null
          payment_status: string | null
          phone_encrypted: string | null
          phone_hash: string | null
          phone_last_four: string | null
          phone_number: string
          quality_details: Json | null
          quality_score: number | null
          quality_tier: string | null
          reward_amount: number | null
          reward_percentage: number | null
          sentiment_score: number | null
          store_id: string
          transaction_amount: number
          transaction_time: string
          voice_transcript: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          audio_duration?: number | null
          categories?: string[] | null
          created_at?: string | null
          feedback_text?: string | null
          fraud_risk_score?: number | null
          id?: string
          is_fraudulent?: boolean | null
          is_verified?: boolean | null
          key_insights?: Json | null
          payment_id?: string | null
          payment_status?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          phone_last_four?: string | null
          phone_number: string
          quality_details?: Json | null
          quality_score?: number | null
          quality_tier?: string | null
          reward_amount?: number | null
          reward_percentage?: number | null
          sentiment_score?: number | null
          store_id: string
          transaction_amount: number
          transaction_time: string
          voice_transcript?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          audio_duration?: number | null
          categories?: string[] | null
          created_at?: string | null
          feedback_text?: string | null
          fraud_risk_score?: number | null
          id?: string
          is_fraudulent?: boolean | null
          is_verified?: boolean | null
          key_insights?: Json | null
          payment_id?: string | null
          payment_status?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          phone_last_four?: string | null
          phone_number?: string
          quality_details?: Json | null
          quality_score?: number | null
          quality_tier?: string | null
          reward_amount?: number | null
          reward_percentage?: number | null
          sentiment_score?: number | null
          store_id?: string
          transaction_amount?: number
          transaction_time?: string
          voice_transcript?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          created_at: string | null
          customer_rewards_total: number
          due_date: string
          id: string
          invoice_number: string
          invoice_pdf_url: string | null
          line_items: Json | null
          paid_at: string | null
          platform_fee_amount: number
          platform_fee_percentage: number | null
          status: string | null
          total_amount: number
          updated_at: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_rewards_total: number
          due_date: string
          id?: string
          invoice_number: string
          invoice_pdf_url?: string | null
          line_items?: Json | null
          paid_at?: string | null
          platform_fee_amount: number
          platform_fee_percentage?: number | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_rewards_total?: number
          due_date?: string
          id?: string
          invoice_number?: string
          invoice_pdf_url?: string | null
          line_items?: Json | null
          paid_at?: string | null
          platform_fee_amount?: number
          platform_fee_percentage?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          id: string
          payment_count: number | null
          processed_at: string | null
          status: string | null
          success_count: number | null
          total_amount: number | null
          updated_at: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          payment_count?: number | null
          processed_at?: string | null
          status?: string | null
          success_count?: number | null
          total_amount?: number | null
          updated_at?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          payment_count?: number | null
          processed_at?: string | null
          status?: string | null
          success_count?: number | null
          total_amount?: number | null
          updated_at?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          consolidated_feedback_ids: string[] | null
          created_at: string | null
          failure_reason: string | null
          id: string
          paid_at: string | null
          phone_encrypted: string | null
          phone_hash: string | null
          phone_number: string
          retry_count: number | null
          status: string
          swish_payment_id: string | null
          swish_payment_id_encrypted: string | null
          swish_reference: string | null
          updated_at: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          amount: number
          consolidated_feedback_ids?: string[] | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          phone_number: string
          retry_count?: number | null
          status: string
          swish_payment_id?: string | null
          swish_payment_id_encrypted?: string | null
          swish_reference?: string | null
          updated_at?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          amount?: number
          consolidated_feedback_ids?: string[] | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          phone_number?: string
          retry_count?: number | null
          status?: string
          swish_payment_id?: string | null
          swish_payment_id_encrypted?: string | null
          swish_reference?: string | null
          updated_at?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: []
      }
      qr_cache: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          checksum: string
          expires_at: string
          file_path: string
          file_size_kb: number | null
          file_url: string | null
          format: string
          generated_at: string | null
          id: string
          qr_version: number
          store_id: string
          template_id: string
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          checksum: string
          expires_at: string
          file_path: string
          file_size_kb?: number | null
          file_url?: string | null
          format: string
          generated_at?: string | null
          id?: string
          qr_version: number
          store_id: string
          template_id: string
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          checksum?: string
          expires_at?: string
          file_path?: string
          file_size_kb?: number | null
          file_url?: string | null
          format?: string
          generated_at?: string | null
          id?: string
          qr_version?: number
          store_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_cache_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_cache_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qr_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_download_history: {
        Row: {
          business_id: string
          created_at: string | null
          downloaded_at: string | null
          downloaded_by: string | null
          file_size_kb: number | null
          file_url: string | null
          format: string
          id: string
          ip_address: unknown | null
          qr_version: number
          store_id: string
          template_id: string
          user_agent: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          format: string
          id?: string
          ip_address?: unknown | null
          qr_version: number
          store_id: string
          template_id: string
          user_agent?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          format?: string
          id?: string
          ip_address?: unknown | null
          qr_version?: number
          store_id?: string
          template_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_download_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_download_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_download_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qr_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_templates: {
        Row: {
          created_at: string | null
          dpi: number | null
          font_size_code: number
          font_size_instructions: number
          height_cm: number
          id: string
          is_active: boolean | null
          name: string
          padding_px: number | null
          qr_size_px: number
          updated_at: string | null
          width_cm: number
        }
        Insert: {
          created_at?: string | null
          dpi?: number | null
          font_size_code: number
          font_size_instructions: number
          height_cm: number
          id?: string
          is_active?: boolean | null
          name: string
          padding_px?: number | null
          qr_size_px: number
          updated_at?: string | null
          width_cm: number
        }
        Update: {
          created_at?: string | null
          dpi?: number | null
          font_size_code?: number
          font_size_instructions?: number
          height_cm?: number
          id?: string
          is_active?: boolean | null
          name?: string
          padding_px?: number | null
          qr_size_px?: number
          updated_at?: string | null
          width_cm?: number
        }
        Relationships: []
      }
      qr_translations: {
        Row: {
          context: string
          created_at: string | null
          id: string
          key: string
          language_code: string
          updated_at: string | null
          value: string
        }
        Insert: {
          context: string
          created_at?: string | null
          id?: string
          key: string
          language_code: string
          updated_at?: string | null
          value: string
        }
        Update: {
          context?: string
          created_at?: string | null
          id?: string
          key?: string
          language_code?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      quality_scores: {
        Row: {
          ai_reasoning: string | null
          constructiveness_score: number
          context_matches: Json | null
          created_at: string | null
          depth_score: number
          feedback_id: string
          fraud_indicators: Json | null
          id: string
          legitimacy_score: number
          scoring_details: Json | null
          specificity_score: number
          total_score: number
        }
        Insert: {
          ai_reasoning?: string | null
          constructiveness_score: number
          context_matches?: Json | null
          created_at?: string | null
          depth_score: number
          feedback_id: string
          fraud_indicators?: Json | null
          id?: string
          legitimacy_score: number
          scoring_details?: Json | null
          specificity_score: number
          total_score: number
        }
        Update: {
          ai_reasoning?: string | null
          constructiveness_score?: number
          context_matches?: Json | null
          created_at?: string | null
          depth_score?: number
          feedback_id?: string
          fraud_indicators?: Json | null
          id?: string
          legitimacy_score?: number
          scoring_details?: Json | null
          specificity_score?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "quality_scores_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: true
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_configs: {
        Row: {
          burst_limit: number | null
          created_at: string | null
          endpoint_pattern: string
          id: string
          requests_per_hour: number
          requests_per_minute: number
          updated_at: string | null
          user_type: string
        }
        Insert: {
          burst_limit?: number | null
          created_at?: string | null
          endpoint_pattern: string
          id?: string
          requests_per_hour: number
          requests_per_minute: number
          updated_at?: string | null
          user_type: string
        }
        Update: {
          burst_limit?: number | null
          created_at?: string | null
          endpoint_pattern?: string
          id?: string
          requests_per_hour?: number
          requests_per_minute?: number
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          business_id: string
          code_rotated_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_address: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_postal: string | null
          location_region: string | null
          location_validated: boolean | null
          metadata: Json | null
          name: string
          operating_hours: Json | null
          previous_store_codes: Json | null
          qr_code_url: string | null
          qr_generated_at: string | null
          qr_logo_enabled: boolean | null
          qr_version: number | null
          store_code: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          code_rotated_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_postal?: string | null
          location_region?: string | null
          location_validated?: boolean | null
          metadata?: Json | null
          name: string
          operating_hours?: Json | null
          previous_store_codes?: Json | null
          qr_code_url?: string | null
          qr_generated_at?: string | null
          qr_logo_enabled?: boolean | null
          qr_version?: number | null
          store_code: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          code_rotated_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_postal?: string | null
          location_region?: string | null
          location_validated?: boolean | null
          metadata?: Json | null
          name?: string
          operating_hours?: Json | null
          previous_store_codes?: Json | null
          qr_code_url?: string | null
          qr_generated_at?: string | null
          qr_logo_enabled?: boolean | null
          qr_version?: number | null
          store_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_items: {
        Row: {
          business_notes: string | null
          created_at: string | null
          feedback_id: string
          id: string
          is_verified: boolean | null
          phone_last_four: string | null
          transaction_amount: number | null
          transaction_id: string | null
          transaction_time: string | null
          verification_id: string
          verification_status: string | null
        }
        Insert: {
          business_notes?: string | null
          created_at?: string | null
          feedback_id: string
          id?: string
          is_verified?: boolean | null
          phone_last_four?: string | null
          transaction_amount?: number | null
          transaction_id?: string | null
          transaction_time?: string | null
          verification_id: string
          verification_status?: string | null
        }
        Update: {
          business_notes?: string | null
          created_at?: string | null
          feedback_id?: string
          id?: string
          is_verified?: boolean | null
          phone_last_four?: string | null
          transaction_amount?: number | null
          transaction_id?: string | null
          transaction_time?: string | null
          verification_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_items_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_items_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_reminders: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string | null
          verification_id: string | null
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string | null
          verification_id?: string | null
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_reminders_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          admin_notes: string | null
          approved_items: number | null
          auto_approved: boolean | null
          batch_downloaded_at: string | null
          batch_sent_at: string | null
          business_id: string
          completed_at: string | null
          created_at: string | null
          deadline: string
          id: string
          rejected_items: number | null
          status: string
          total_amount: number | null
          total_items: number | null
          updated_at: string | null
          uploaded_at: string | null
          verified_csv_url: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          admin_notes?: string | null
          approved_items?: number | null
          auto_approved?: boolean | null
          batch_downloaded_at?: string | null
          batch_sent_at?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          deadline: string
          id?: string
          rejected_items?: number | null
          status: string
          total_amount?: number | null
          total_items?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          verified_csv_url?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          admin_notes?: string | null
          approved_items?: number | null
          auto_approved?: boolean | null
          batch_downloaded_at?: string | null
          batch_sent_at?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          deadline?: string
          id?: string
          rejected_items?: number | null
          status?: string
          total_amount?: number | null
          total_items?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          verified_csv_url?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_batches: {
        Row: {
          admin_notes: string | null
          batch_released_at: string | null
          created_at: string | null
          id: string
          payments_processed_at: string | null
          status: string
          total_businesses: number | null
          total_feedbacks: number | null
          total_platform_fees: number | null
          total_rewards: number | null
          updated_at: string | null
          week_number: number
          year_number: number
        }
        Insert: {
          admin_notes?: string | null
          batch_released_at?: string | null
          created_at?: string | null
          id?: string
          payments_processed_at?: string | null
          status: string
          total_businesses?: number | null
          total_feedbacks?: number | null
          total_platform_fees?: number | null
          total_rewards?: number | null
          updated_at?: string | null
          week_number: number
          year_number: number
        }
        Update: {
          admin_notes?: string | null
          batch_released_at?: string | null
          created_at?: string | null
          id?: string
          payments_processed_at?: string | null
          status?: string
          total_businesses?: number | null
          total_feedbacks?: number | null
          total_platform_fees?: number | null
          total_rewards?: number | null
          updated_at?: string | null
          week_number?: number
          year_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_weekly_batch: {
        Args: { p_week_number: number; p_year_number: number }
        Returns: Json
      }
      admin_generate_invoices: {
        Args: { p_week_number: number; p_year_number: number }
        Returns: Json
      }
      admin_get_business_metrics: {
        Args: { p_business_id?: string }
        Returns: {
          average_quality_score: number
          business_id: string
          business_name: string
          fraud_rate: number
          subscription_status: string
          total_feedbacks: number
          total_fees: number
          total_rewards: number
          verification_compliance: number
          verified_feedbacks: number
        }[]
      }
      admin_mark_fraudulent: {
        Args: { p_feedback_id: string; p_reason: string }
        Returns: Json
      }
      admin_process_payments: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      admin_release_feedbacks: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      archive_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      auto_approve_expired_verifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_context_completeness: {
        Args: { p_business_type?: string; p_context_data: Json }
        Returns: Json
      }
      calculate_feedback_quality: {
        Args: {
          p_audio_duration: number
          p_customer_phone: string
          p_feedback_text: string
          p_store_id: string
        }
        Returns: Json
      }
      can_submit_verification: {
        Args: { p_verification_id: string }
        Returns: Json
      }
      check_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_table: string
          details: Json
          issue_type: string
        }[]
      }
      check_rate_limit: {
        Args: { p_phone_number: string; p_store_id: string }
        Returns: {
          attempt_count: number
          is_allowed: boolean
          message: string
          remaining_attempts: number
          reset_at: string
        }[]
      }
      cleanup_failed_access_attempts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_request_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consolidate_weekly_payments: {
        Args: { p_week_number: number; p_year_number: number }
        Returns: Json
      }
      decrypt_text: {
        Args: { p_encrypted: string }
        Returns: string
      }
      encrypt_text: {
        Args: { p_data: string }
        Returns: string
      }
      generate_payment_report: {
        Args: {
          p_end_week?: number
          p_end_year?: number
          p_start_week: number
          p_start_year: number
        }
        Returns: Json
      }
      generate_qr_code_url: {
        Args: { p_store_id: string }
        Returns: string
      }
      generate_store_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_store_codes_bulk: {
        Args: { p_count: number }
        Returns: {
          store_code: string
        }[]
      }
      get_ai_usage_stats: {
        Args: { p_business_id: string }
        Returns: {
          cost_this_month: number
          last_request_at: string
          requests_today: number
          tokens_today: number
        }[]
      }
      get_audit_summary: {
        Args: { p_period_days?: number }
        Returns: Json
      }
      get_business_api_keys: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_context_suggestions: {
        Args: { p_business_id?: string }
        Returns: Json
      }
      get_current_user_business: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_decrypted_feedback: {
        Args: { p_feedback_id: string }
        Returns: {
          id: string
          phone_number: string
          quality_score: number
          reward_amount: number
          store_id: string
          transaction_amount: number
        }[]
      }
      get_decrypted_payment: {
        Args: { p_payment_id: string }
        Returns: {
          amount: number
          id: string
          phone_number: string
          status: string
          swish_payment_id: string
        }[]
      }
      get_entity_audit_trail: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          action: string
          changed_at: string
          changed_by: string
          new_values: Json
          old_values: Json
          operation: string
        }[]
      }
      get_feedback_stats: {
        Args: { p_week_number?: number; p_year_number?: number }
        Returns: {
          average_quality_score: number
          tier_distribution: Json
          total_feedbacks: number
          total_rewards: number
          total_transactions: number
          verified_feedbacks: number
        }[]
      }
      get_my_business: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_type: string
          created_at: string
          email: string
          id: string
          name: string
          onboarding_completed: boolean
          onboarding_step: number
          store_count: number
          subscription_ends_at: string
          subscription_status: string
        }[]
      }
      get_my_feedbacks: {
        Args: {
          p_is_verified?: boolean
          p_store_id?: string
          p_week_number?: number
          p_year_number?: number
        }
        Returns: {
          categories: string[]
          created_at: string
          id: string
          is_verified: boolean
          phone_last_four: string
          quality_score: number
          quality_tier: string
          reward_amount: number
          sentiment_score: number
          store_name: string
          transaction_amount: number
          transaction_time: string
        }[]
      }
      get_my_stores: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          location_city: string
          name: string
          qr_code_url: string
          store_code: string
        }[]
      }
      get_pending_verification_reminders: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_email: string
          business_id: string
          deadline: string
          hours_remaining: number
          reminder_type: string
          verification_id: string
        }[]
      }
      get_pending_verifications: {
        Args: Record<PropertyKey, never>
        Returns: {
          deadline: string
          hours_remaining: number
          id: string
          total_amount: number
          total_items: number
          week_number: number
          year_number: number
        }[]
      }
      get_quality_distribution: {
        Args: {
          p_business_id?: string
          p_store_id?: string
          p_week_start?: string
        }
        Returns: Json
      }
      get_recent_admin_activity: {
        Args: { p_admin_id?: string; p_limit?: number }
        Returns: {
          action: string
          admin_email: string
          admin_id: string
          details: Json
          entity_id: string
          log_timestamp: string
          table_name: string
        }[]
      }
      get_store_by_code: {
        Args: { p_code: string }
        Returns: {
          business_id: string
          code_valid_from: string
          is_current: boolean
          store_id: string
          store_name: string
        }[]
      }
      get_store_code_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          available_combinations: number
          codes_in_use: number
          total_stores: number
          usage_percentage: number
        }[]
      }
      get_store_info: {
        Args: { p_client_ip?: string; p_store_code: string }
        Returns: Json
      }
      get_suspicious_activity_report: {
        Args: { p_days_back?: number }
        Returns: {
          activity_timestamp: string
          activity_type: string
          details: Json
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_verification_stats: {
        Args: { p_business_id?: string }
        Returns: {
          auto_approved_verifications: number
          average_completion_hours: number
          completed_verifications: number
          current_pending_value: number
          on_time_rate: number
          pending_verifications: number
          total_verifications: number
        }[]
      }
      get_week_year: {
        Args: { date_input: string }
        Returns: {
          week_number: number
          year_number: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      handle_payment_callback: {
        Args: {
          p_error_message?: string
          p_payment_provider_id: string
          p_status: string
        }
        Returns: Json
      }
      hash_text: {
        Args: { p_data: string }
        Returns: string
      }
      increment_rate_limit: {
        Args: { p_phone_number: string; p_store_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_store_code: {
        Args: { p_code: string }
        Returns: boolean
      }
      log_failed_access: {
        Args: {
          p_email?: string
          p_endpoint?: string
          p_ip_address?: unknown
          p_reason?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      mark_reminder_sent: {
        Args: { p_reminder_type: string; p_verification_id: string }
        Returns: boolean
      }
      process_swish_batch: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      query_audit_logs: {
        Args: {
          p_business_id?: string
          p_end_date?: string
          p_limit?: number
          p_operation?: string
          p_severity?: string
          p_start_date?: string
        }
        Returns: {
          activity_timestamp: string
          business_id: string
          details: Json
          id: string
          operation: string
          record_id: string
          severity: string
          table_name: string
          user_id: string
        }[]
      }
      recalculate_feedback_quality: {
        Args: { p_feedback_id?: string; p_week_start?: string }
        Returns: Json
      }
      retry_failed_payments: {
        Args: { p_week_number?: number; p_year_number?: number }
        Returns: Json
      }
      rotate_store_code: {
        Args: { p_store_id: string }
        Returns: string
      }
      search_feedbacks_by_phone: {
        Args: { p_phone: string }
        Returns: {
          created_at: string
          id: string
          quality_score: number
          store_id: string
          transaction_amount: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      submit_feedback: {
        Args: {
          p_audio_url: string
          p_client_ip?: string
          p_phone: string
          p_store_code: string
        }
        Returns: Json
      }
      track_context_progress: {
        Args: { p_business_id?: string; p_days?: number }
        Returns: Json
      }
      update_business_context: {
        Args: { p_context_data: Json; p_section?: string }
        Returns: Json
      }
      validate_store_code: {
        Args: { p_client_ip?: string; p_store_code: string }
        Returns: Json
      }
      validate_swedish_postal_code: {
        Args: { p_postal_code: string }
        Returns: boolean
      }
      verify_transactions: {
        Args: { p_verification_id: string; p_verified_items: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const