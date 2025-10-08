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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      abcg_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          tokens: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "abcg_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "abcg_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      abcg_documents: {
        Row: {
          asset_class: string | null
          author: string | null
          created_at: string
          doc_sha256: string
          embargo_until: string | null
          id: string
          published_at: string
          region: string | null
          source_url: string | null
          status: string
          storage_path: string
          superseded_by: string | null
          tickers: string[] | null
          title: string
          topics: string[] | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          asset_class?: string | null
          author?: string | null
          created_at?: string
          doc_sha256: string
          embargo_until?: string | null
          id?: string
          published_at: string
          region?: string | null
          source_url?: string | null
          status?: string
          storage_path: string
          superseded_by?: string | null
          tickers?: string[] | null
          title: string
          topics?: string[] | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          asset_class?: string | null
          author?: string | null
          created_at?: string
          doc_sha256?: string
          embargo_until?: string | null
          id?: string
          published_at?: string
          region?: string | null
          source_url?: string | null
          status?: string
          storage_path?: string
          superseded_by?: string | null
          tickers?: string[] | null
          title?: string
          topics?: string[] | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abcg_documents_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "abcg_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          ai_response: Json
          created_at: string
          feature_name: string
          id: string
          job_id: string | null
          user_id: string
          user_query: string
        }
        Insert: {
          ai_response: Json
          created_at?: string
          feature_name: string
          id?: string
          job_id?: string | null
          user_id: string
          user_query: string
        }
        Update: {
          ai_response?: Json
          created_at?: string
          feature_name?: string
          id?: string
          job_id?: string | null
          user_id?: string
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_interactions_job_id"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          is_applied: boolean | null
          portfolio_id: string
          reasoning: string | null
          recommendation_type: string
          symbol: string
          target_price: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_applied?: boolean | null
          portfolio_id: string
          reasoning?: string | null
          recommendation_type: string
          symbol: string
          target_price?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_applied?: boolean | null
          portfolio_id?: string
          reasoning?: string | null
          recommendation_type?: string
          symbol?: string
          target_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_profiles: {
        Row: {
          address: string | null
          beta: number | null
          book_value: number | null
          city: string | null
          country: string | null
          currency: string | null
          debt_to_equity: number | null
          description: string | null
          dividend_rate: number | null
          dividend_yield: number | null
          enterprise_value: number | null
          eps: number | null
          ex_dividend_date: string | null
          exchange: string | null
          forward_eps: number | null
          forward_pe: number | null
          free_cash_flow: number | null
          gross_margins: number | null
          id: number
          inception_date: string | null
          industry: string | null
          last_fiscal_year_end: string | null
          last_updated: string | null
          market: string | null
          market_cap: number | null
          most_recent_quarter: string | null
          name: string | null
          net_income: number | null
          next_fiscal_year_end: string | null
          operating_margins: number | null
          phone: string | null
          price_to_book: number | null
          quote_type: string | null
          return_on_assets: number | null
          return_on_equity: number | null
          revenue: number | null
          revenue_per_share: number | null
          sector: string | null
          short_name: string | null
          state: string | null
          symbol: string
          trailing_pe: number | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          beta?: number | null
          book_value?: number | null
          city?: string | null
          country?: string | null
          currency?: string | null
          debt_to_equity?: number | null
          description?: string | null
          dividend_rate?: number | null
          dividend_yield?: number | null
          enterprise_value?: number | null
          eps?: number | null
          ex_dividend_date?: string | null
          exchange?: string | null
          forward_eps?: number | null
          forward_pe?: number | null
          free_cash_flow?: number | null
          gross_margins?: number | null
          id?: number
          inception_date?: string | null
          industry?: string | null
          last_fiscal_year_end?: string | null
          last_updated?: string | null
          market?: string | null
          market_cap?: number | null
          most_recent_quarter?: string | null
          name?: string | null
          net_income?: number | null
          next_fiscal_year_end?: string | null
          operating_margins?: number | null
          phone?: string | null
          price_to_book?: number | null
          quote_type?: string | null
          return_on_assets?: number | null
          return_on_equity?: number | null
          revenue?: number | null
          revenue_per_share?: number | null
          sector?: string | null
          short_name?: string | null
          state?: string | null
          symbol: string
          trailing_pe?: number | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          beta?: number | null
          book_value?: number | null
          city?: string | null
          country?: string | null
          currency?: string | null
          debt_to_equity?: number | null
          description?: string | null
          dividend_rate?: number | null
          dividend_yield?: number | null
          enterprise_value?: number | null
          eps?: number | null
          ex_dividend_date?: string | null
          exchange?: string | null
          forward_eps?: number | null
          forward_pe?: number | null
          free_cash_flow?: number | null
          gross_margins?: number | null
          id?: number
          inception_date?: string | null
          industry?: string | null
          last_fiscal_year_end?: string | null
          last_updated?: string | null
          market?: string | null
          market_cap?: number | null
          most_recent_quarter?: string | null
          name?: string | null
          net_income?: number | null
          next_fiscal_year_end?: string | null
          operating_margins?: number | null
          phone?: string | null
          price_to_book?: number | null
          quote_type?: string | null
          return_on_assets?: number | null
          return_on_equity?: number | null
          revenue?: number | null
          revenue_per_share?: number | null
          sector?: string | null
          short_name?: string | null
          state?: string | null
          symbol?: string
          trailing_pe?: number | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      brokers: {
        Row: {
          code: string | null
          contact_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      credits_engaged: {
        Row: {
          engaged_at: string | null
          feature: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          engaged_at?: string | null
          feature: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          engaged_at?: string | null
          feature?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      indicators_tv: {
        Row: {
          adx: number | null
          atr: number | null
          id: number
          rsi: number | null
          symbol: string
          ts: string
        }
        Insert: {
          adx?: number | null
          atr?: number | null
          id?: number
          rsi?: number | null
          symbol: string
          ts: string
        }
        Update: {
          adx?: number | null
          atr?: number | null
          id?: number
          rsi?: number | null
          symbol?: string
          ts?: string
        }
        Relationships: []
      }
      instruments: {
        Row: {
          asset_type: string | null
          bloomberg_code: string | null
          country: string | null
          currency: string | null
          description: string | null
          exchange: string | null
          id: number
          inception_date: string | null
          industry: string | null
          isin: string | null
          last_updated: string | null
          name: string | null
          sector: string | null
          symbol: string
          website: string | null
        }
        Insert: {
          asset_type?: string | null
          bloomberg_code?: string | null
          country?: string | null
          currency?: string | null
          description?: string | null
          exchange?: string | null
          id?: number
          inception_date?: string | null
          industry?: string | null
          isin?: string | null
          last_updated?: string | null
          name?: string | null
          sector?: string | null
          symbol: string
          website?: string | null
        }
        Update: {
          asset_type?: string | null
          bloomberg_code?: string | null
          country?: string | null
          currency?: string | null
          description?: string | null
          exchange?: string | null
          id?: number
          inception_date?: string | null
          industry?: string | null
          isin?: string | null
          last_updated?: string | null
          name?: string | null
          sector?: string | null
          symbol?: string
          website?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          feature: string | null
          id: string
          progress_message: string | null
          request_payload: Json
          response_payload: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string | null
          id?: string
          progress_message?: string | null
          request_payload: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string | null
          id?: string
          progress_message?: string | null
          request_payload?: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_parameters: {
        Row: {
          created_at: string
          id: string
          max_ideas: number
          max_queries: number
          max_reports: number
          monthly_price_usd: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          renewal_cycle_days: number | null
          stripe_price_id: string | null
          trial_duration_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_ideas?: number
          max_queries?: number
          max_reports?: number
          monthly_price_usd?: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          renewal_cycle_days?: number | null
          stripe_price_id?: string | null
          trial_duration_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_ideas?: number
          max_queries?: number
          max_reports?: number
          monthly_price_usd?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          renewal_cycle_days?: number | null
          stripe_price_id?: string | null
          trial_duration_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          total_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          total_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          total_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          average_price: number
          created_at: string
          current_price: number | null
          id: string
          market_value: number | null
          portfolio_id: string
          quantity: number
          symbol: string
          updated_at: string
        }
        Insert: {
          average_price?: number
          created_at?: string
          current_price?: number | null
          id?: string
          market_value?: number | null
          portfolio_id: string
          quantity?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          average_price?: number
          created_at?: string
          current_price?: number | null
          id?: string
          market_value?: number | null
          portfolio_id?: string
          quantity?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          close: number | null
          date: string
          high: number | null
          id: number
          low: number | null
          open: number | null
          symbol: string | null
          volume: number | null
        }
        Insert: {
          close?: number | null
          date: string
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          symbol?: string | null
          volume?: number | null
        }
        Update: {
          close?: number | null
          date?: string
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          symbol?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      prices_tv: {
        Row: {
          close: number | null
          high: number | null
          id: number
          low: number | null
          open: number | null
          symbol: string
          ts: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          symbol: string
          ts: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          symbol?: string
          ts?: string
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          broker_id: string | null
          broker_name: string | null
          created_at: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
          user_plan: Database["public"]["Enums"]["plan_type"] | null
        }
        Insert: {
          broker_id?: string | null
          broker_name?: string | null
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          user_plan?: Database["public"]["Enums"]["plan_type"] | null
        }
        Update: {
          broker_id?: string | null
          broker_name?: string | null
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_plan?: Database["public"]["Enums"]["plan_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_ideas_remaining: number
          credits_queries_remaining: number
          credits_reports_remaining: number
          id: string
          last_reset_date: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_ideas_remaining?: number
          credits_queries_remaining?: number
          credits_reports_remaining?: number
          id?: string
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_ideas_remaining?: number
          credits_queries_remaining?: number
          credits_reports_remaining?: number
          id?: string
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          instrument: string
          job_id: string | null
          parameters: Json | null
          request_content: string
          request_type: string
          response_content: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument: string
          job_id?: string | null
          parameters?: Json | null
          request_content: string
          request_type: string
          response_content?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument?: string
          job_id?: string | null
          parameters?: Json | null
          request_content?: string
          request_type?: string
          response_content?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          is_active: boolean
          last_seen: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_seen?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_seen?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      decrement_credit: {
        Args: { credit_type: string; target_user_id: string }
        Returns: boolean
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      initialize_user_credits: {
        Args: {
          target_plan_type: Database["public"]["Enums"]["plan_type"]
          target_user_id: string
        }
        Returns: undefined
      }
      invalidate_previous_sessions: {
        Args: { current_session_id: string; current_user_id: string }
        Returns: undefined
      }
      is_admin_or_super_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      search_chunks_cosine: {
        Args: { match_count: number; query_embedding: string }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_user"
      plan_type: "basic" | "standard" | "premium" | "free_trial" | "broker_free"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "super_user"],
      plan_type: ["basic", "standard", "premium", "free_trial", "broker_free"],
    },
  },
} as const
