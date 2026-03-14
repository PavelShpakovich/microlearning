export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_identities: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          provider: string;
          provider_email: string | null;
          provider_user_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          provider: string;
          provider_email?: string | null;
          provider_user_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          provider?: string;
          provider_email?: string | null;
          provider_user_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      bookmarked_cards: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookmarked_cards_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
        ];
      };
      cards: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_public: boolean | null;
          source_id: string | null;
          theme_id: string | null;
          title: string;
          topic: string | null;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_public?: boolean | null;
          source_id?: string | null;
          theme_id?: string | null;
          title: string;
          topic?: string | null;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_public?: boolean | null;
          source_id?: string | null;
          theme_id?: string | null;
          title?: string;
          topic?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cards_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'data_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cards_theme_id_fkey';
            columns: ['theme_id'];
            isOneToOne: false;
            referencedRelation: 'themes';
            referencedColumns: ['id'];
          },
        ];
      };
      data_sources: {
        Row: {
          created_at: string;
          extracted_text: string | null;
          id: string;
          name: string;
          raw_url: string | null;
          status: string;
          storage_path: string | null;
          theme_id: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          extracted_text?: string | null;
          id?: string;
          name: string;
          raw_url?: string | null;
          status?: string;
          storage_path?: string | null;
          theme_id: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          extracted_text?: string | null;
          id?: string;
          name?: string;
          raw_url?: string | null;
          status?: string;
          storage_path?: string | null;
          theme_id?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'data_sources_theme_id_fkey';
            columns: ['theme_id'];
            isOneToOne: false;
            referencedRelation: 'themes';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          external_transaction_id: string;
          id: string;
          kind: string;
          period_end: string | null;
          period_start: string | null;
          plan_id: string | null;
          provider: string;
          raw_payload: Json;
          status: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          external_transaction_id: string;
          id?: string;
          kind?: string;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          provider: string;
          raw_payload?: Json;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          external_transaction_id?: string;
          id?: string;
          kind?: string;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          provider?: string;
          raw_payload?: Json;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_transactions_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'user_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      telegram_link_tokens: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          token: string;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          token: string;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email_unverified: boolean;
          id: string;
          is_admin: boolean | null;
          last_study_date: string | null;
          streak_count: number | null;
          telegram_id: string | null;
          ui_language: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email_unverified?: boolean;
          id: string;
          is_admin?: boolean | null;
          last_study_date?: string | null;
          streak_count?: number | null;
          telegram_id?: string | null;
          ui_language?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email_unverified?: boolean;
          id?: string;
          is_admin?: boolean | null;
          last_study_date?: string | null;
          streak_count?: number | null;
          telegram_id?: string | null;
          ui_language?: string | null;
        };
        Relationships: [];
      };
      session_cards: {
        Row: {
          card_id: string;
          seen_at: string;
          session_id: string;
        };
        Insert: {
          card_id: string;
          seen_at?: string;
          session_id: string;
        };
        Update: {
          card_id?: string;
          seen_at?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'session_cards_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_cards_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          id: string;
          theme_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          theme_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          theme_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_theme_id_fkey';
            columns: ['theme_id'];
            isOneToOne: false;
            referencedRelation: 'themes';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_plans: {
        Row: {
          cards_per_month: number;
          community_themes: boolean;
          currency: string;
          id: string;
          is_public: boolean;
          max_themes: number | null;
          name: string;
          price_minor: number | null;
          sort_order: number;
          webpay_plan_id: string | null;
          webpay_product_id: string | null;
        };
        Insert: {
          cards_per_month: number;
          community_themes?: boolean;
          currency?: string;
          id: string;
          is_public?: boolean;
          max_themes?: number | null;
          name: string;
          price_minor?: number | null;
          sort_order?: number;
          webpay_plan_id?: string | null;
          webpay_product_id?: string | null;
        };
        Update: {
          cards_per_month?: number;
          community_themes?: boolean;
          currency?: string;
          id?: string;
          is_public?: boolean;
          max_themes?: number | null;
          name?: string;
          price_minor?: number | null;
          sort_order?: number;
          webpay_plan_id?: string | null;
          webpay_product_id?: string | null;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          created_at: string;
          description: string | null;
          generation_failed_at: string | null;
          generation_started_at: string | null;
          id: string;
          is_public: boolean | null;
          language: string | null;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          generation_failed_at?: string | null;
          generation_started_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          language?: string | null;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          generation_failed_at?: string | null;
          generation_started_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          language?: string | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null;
          billing_customer_id: string | null;
          billing_provider: string | null;
          billing_subscription_id: string | null;
          created_at: string | null;
          current_period_end: string;
          current_period_start: string;
          id: string;
          plan_id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          auto_renew?: boolean | null;
          billing_customer_id?: string | null;
          billing_provider?: string | null;
          billing_subscription_id?: string | null;
          created_at?: string | null;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          plan_id: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          auto_renew?: boolean | null;
          billing_customer_id?: string | null;
          billing_provider?: string | null;
          billing_subscription_id?: string | null;
          created_at?: string | null;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          plan_id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      user_usage: {
        Row: {
          cards_generated: number | null;
          cards_limit: number;
          created_at: string | null;
          id: string;
          period_end: string;
          period_start: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          cards_generated?: number | null;
          cards_limit: number;
          created_at?: string | null;
          id?: string;
          period_end: string;
          period_start: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          cards_generated?: number | null;
          cards_limit?: number;
          created_at?: string | null;
          id?: string;
          period_end?: string;
          period_start?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_plan: {
        Args: { user_id: string };
        Returns: {
          cards_per_month: number;
          plan_id: string;
        }[];
      };
      get_user_usage: {
        Args: { user_id: string };
        Returns: {
          cards_generated: number;
          cards_limit: number;
          cards_remaining: number;
        }[];
      };
      reset_monthly_usage: { Args: never; Returns: undefined };
      increment_card_usage: {
        Args: { p_user_id: string; p_count: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
// Convenience aliases for common table types
export type CardRow = Tables<'cards'>;
export type ThemeRow = Tables<'themes'>;
export type DataSourceRow = Tables<'data_sources'>;
export type SessionRow = Tables<'sessions'>;
export type SessionCardRow = Tables<'session_cards'>;
export type ProfileRow = Tables<'profiles'>;
export type BookmarkedCardRow = Tables<'bookmarked_cards'>;
export type SubscriptionPlanRow = Tables<'subscription_plans'>;
export type UserSubscriptionRow = Tables<'user_subscriptions'>;
export type UserUsageRow = Tables<'user_usage'>;
export type PaymentTransactionRow = Tables<'payment_transactions'>;
