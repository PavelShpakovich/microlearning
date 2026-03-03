import type { DataSourceStatus, DataSourceType } from '@/lib/constants';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── Database type (matches supabase CLI output format) ──────────────────────

export type Database = {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          user_id: string | null;
          theme_id: string | null;
          source_id: string | null;
          title: string;
          body: string;
          topic: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          theme_id?: string | null;
          source_id?: string | null;
          title: string;
          body: string;
          topic?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          theme_id?: string | null;
          source_id?: string | null;
          title?: string;
          body?: string;
          topic?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      data_sources: {
        Row: {
          id: string;
          user_id: string;
          theme_id: string;
          type: DataSourceType;
          name: string;
          storage_path: string | null;
          raw_url: string | null;
          extracted_text: string | null;
          status: DataSourceStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme_id: string;
          type: DataSourceType;
          name: string;
          storage_path?: string | null;
          raw_url?: string | null;
          extracted_text?: string | null;
          status?: DataSourceStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme_id?: string;
          type?: DataSourceType;
          name?: string;
          storage_path?: string | null;
          raw_url?: string | null;
          extracted_text?: string | null;
          status?: DataSourceStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          theme_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      session_cards: {
        Row: {
          session_id: string;
          card_id: string;
          seen_at: string;
        };
        Insert: {
          session_id: string;
          card_id: string;
          seen_at?: string;
        };
        Update: {
          session_id?: string;
          card_id?: string;
          seen_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          telegram_id: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          telegram_id?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─── Convenience helper types (replaces exported *Row interfaces) ─────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Named row aliases for backward-compatibility with existing code
export type CardRow = Tables<'cards'>;
export type ThemeRow = Tables<'themes'>;
export type DataSourceRow = Tables<'data_sources'>;
export type SessionRow = Tables<'sessions'>;
export type SessionCardRow = Tables<'session_cards'>;
export type ProfileRow = Tables<'profiles'>;
