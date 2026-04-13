export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
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
      chart_aspects: {
        Row: {
          applying: boolean | null;
          aspect_key: string;
          body_a: string;
          body_b: string;
          chart_snapshot_id: string;
          created_at: string;
          id: string;
          orb_decimal: number;
        };
        Insert: {
          applying?: boolean | null;
          aspect_key: string;
          body_a: string;
          body_b: string;
          chart_snapshot_id: string;
          created_at?: string;
          id?: string;
          orb_decimal: number;
        };
        Update: {
          applying?: boolean | null;
          aspect_key?: string;
          body_a?: string;
          body_b?: string;
          chart_snapshot_id?: string;
          created_at?: string;
          id?: string;
          orb_decimal?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'chart_aspects_chart_snapshot_id_fkey';
            columns: ['chart_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'chart_snapshots';
            referencedColumns: ['id'];
          },
        ];
      };
      chart_positions: {
        Row: {
          body_key: string;
          chart_snapshot_id: string;
          created_at: string;
          degree_decimal: number;
          house_number: number | null;
          id: string;
          retrograde: boolean;
          sign_key: string;
        };
        Insert: {
          body_key: string;
          chart_snapshot_id: string;
          created_at?: string;
          degree_decimal: number;
          house_number?: number | null;
          id?: string;
          retrograde?: boolean;
          sign_key: string;
        };
        Update: {
          body_key?: string;
          chart_snapshot_id?: string;
          created_at?: string;
          degree_decimal?: number;
          house_number?: number | null;
          id?: string;
          retrograde?: boolean;
          sign_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chart_positions_chart_snapshot_id_fkey';
            columns: ['chart_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'chart_snapshots';
            referencedColumns: ['id'];
          },
        ];
      };
      chart_snapshots: {
        Row: {
          calculation_provider: string;
          chart_id: string;
          computed_chart_json: Json;
          created_at: string;
          id: string;
          raw_input_json: Json;
          snapshot_version: number;
          warnings_json: Json;
        };
        Insert: {
          calculation_provider: string;
          chart_id: string;
          computed_chart_json?: Json;
          created_at?: string;
          id?: string;
          raw_input_json?: Json;
          snapshot_version: number;
          warnings_json?: Json;
        };
        Update: {
          calculation_provider?: string;
          chart_id?: string;
          computed_chart_json?: Json;
          created_at?: string;
          id?: string;
          raw_input_json?: Json;
          snapshot_version?: number;
          warnings_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'chart_snapshots_chart_id_fkey';
            columns: ['chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
        ];
      };
      charts: {
        Row: {
          birth_date: string;
          birth_time: string | null;
          birth_time_known: boolean;
          city: string;
          country: string;
          created_at: string;
          house_system: string;
          id: string;
          label: string;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          person_name: string;
          source: string;
          status: string;
          subject_type: string;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          birth_date: string;
          birth_time?: string | null;
          birth_time_known?: boolean;
          city: string;
          country: string;
          created_at?: string;
          house_system?: string;
          id?: string;
          label: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          person_name: string;
          source?: string;
          status?: string;
          subject_type?: string;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          birth_date?: string;
          birth_time?: string | null;
          birth_time_known?: boolean;
          city?: string;
          country?: string;
          created_at?: string;
          house_system?: string;
          id?: string;
          label?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          person_name?: string;
          source?: string;
          status?: string;
          subject_type?: string;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      compatibility_reports: {
        Row: {
          created_at: string;
          id: string;
          model_name: string | null;
          model_provider: string | null;
          primary_chart_id: string;
          prompt_version: string;
          rendered_content_json: Json;
          secondary_chart_id: string;
          status: string;
          summary: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          primary_chart_id: string;
          prompt_version: string;
          rendered_content_json?: Json;
          secondary_chart_id: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          primary_chart_id?: string;
          prompt_version?: string;
          rendered_content_json?: Json;
          secondary_chart_id?: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compatibility_reports_primary_chart_id_fkey';
            columns: ['primary_chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compatibility_reports_secondary_chart_id_fkey';
            columns: ['secondary_chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
        ];
      };
      email_verification_tokens: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          token_hash: string;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      follow_up_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          model_name: string | null;
          model_provider: string | null;
          role: string;
          thread_id: string;
          usage_tokens: number | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          role: string;
          thread_id: string;
          usage_tokens?: number | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          role?: string;
          thread_id?: string;
          usage_tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_up_messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'follow_up_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      follow_up_threads: {
        Row: {
          chart_id: string | null;
          created_at: string;
          id: string;
          reading_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chart_id?: string | null;
          created_at?: string;
          id?: string;
          reading_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chart_id?: string | null;
          created_at?: string;
          id?: string;
          reading_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_up_threads_chart_id_fkey';
            columns: ['chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follow_up_threads_reading_id_fkey';
            columns: ['reading_id'];
            isOneToOne: false;
            referencedRelation: 'readings';
            referencedColumns: ['id'];
          },
        ];
      };
      forecasts: {
        Row: {
          chart_id: string;
          created_at: string;
          forecast_type: string;
          id: string;
          rendered_content_json: Json;
          target_end_date: string;
          target_start_date: string;
          transit_snapshot_json: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chart_id: string;
          created_at?: string;
          forecast_type: string;
          id?: string;
          rendered_content_json?: Json;
          target_end_date: string;
          target_start_date: string;
          transit_snapshot_json?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chart_id?: string;
          created_at?: string;
          forecast_type?: string;
          id?: string;
          rendered_content_json?: Json;
          target_end_date?: string;
          target_start_date?: string;
          transit_snapshot_json?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forecasts_chart_id_fkey';
            columns: ['chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
        ];
      };
      generation_logs: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          error_message: string | null;
          id: string;
          latency_ms: number | null;
          model: string | null;
          operation_key: string;
          provider: string | null;
          request_payload_json: Json;
          response_payload_json: Json;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model?: string | null;
          operation_key: string;
          provider?: string | null;
          request_payload_json?: Json;
          response_payload_json?: Json;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model?: string | null;
          operation_key?: string;
          provider?: string | null;
          request_payload_json?: Json;
          response_payload_json?: Json;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          birth_data_consent_at: string | null;
          created_at: string;
          display_name: string | null;
          email_unverified: boolean;
          id: string;
          is_admin: boolean;
          locale: string;
          marketing_opt_in: boolean;
          onboarding_completed_at: string | null;
          pending_email: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          birth_data_consent_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_unverified?: boolean;
          id: string;
          is_admin?: boolean;
          locale?: string;
          marketing_opt_in?: boolean;
          onboarding_completed_at?: string | null;
          pending_email?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          birth_data_consent_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_unverified?: boolean;
          id?: string;
          is_admin?: boolean;
          locale?: string;
          marketing_opt_in?: boolean;
          onboarding_completed_at?: string | null;
          pending_email?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_templates: {
        Row: {
          active: boolean;
          created_at: string;
          developer_prompt: string | null;
          id: string;
          key: string;
          locale: string;
          output_schema_json: Json;
          system_prompt: string;
          version: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          developer_prompt?: string | null;
          id?: string;
          key: string;
          locale?: string;
          output_schema_json?: Json;
          system_prompt: string;
          version: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          developer_prompt?: string | null;
          id?: string;
          key?: string;
          locale?: string;
          output_schema_json?: Json;
          system_prompt?: string;
          version?: string;
        };
        Relationships: [];
      };
      reading_sections: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          reading_id: string;
          section_key: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          reading_id: string;
          section_key: string;
          sort_order?: number;
          title: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          reading_id?: string;
          section_key?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_sections_reading_id_fkey';
            columns: ['reading_id'];
            isOneToOne: false;
            referencedRelation: 'readings';
            referencedColumns: ['id'];
          },
        ];
      };
      readings: {
        Row: {
          chart_id: string;
          chart_snapshot_id: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          locale: string;
          model_name: string | null;
          model_provider: string | null;
          plain_text_content: string | null;
          prompt_version: string;
          reading_type: string;
          rendered_content_json: Json;
          schema_version: string;
          status: string;
          summary: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chart_id: string;
          chart_snapshot_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          locale?: string;
          model_name?: string | null;
          model_provider?: string | null;
          plain_text_content?: string | null;
          prompt_version: string;
          reading_type: string;
          rendered_content_json?: Json;
          schema_version: string;
          status?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chart_id?: string;
          chart_snapshot_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          locale?: string;
          model_name?: string | null;
          model_provider?: string | null;
          plain_text_content?: string | null;
          prompt_version?: string;
          reading_type?: string;
          rendered_content_json?: Json;
          schema_version?: string;
          status?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'readings_chart_id_fkey';
            columns: ['chart_id'];
            isOneToOne: false;
            referencedRelation: 'charts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'readings_chart_snapshot_id_fkey';
            columns: ['chart_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'chart_snapshots';
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
      usage_counters: {
        Row: {
          charts_created: number;
          compatibility_reports_used: number;
          created_at: string;
          follow_up_messages_used: number;
          forecasts_generated: number;
          id: string;
          period_end: string;
          period_start: string;
          readings_generated: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          charts_created?: number;
          compatibility_reports_used?: number;
          created_at?: string;
          follow_up_messages_used?: number;
          forecasts_generated?: number;
          id?: string;
          period_end: string;
          period_start: string;
          readings_generated?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          charts_created?: number;
          compatibility_reports_used?: number;
          created_at?: string;
          follow_up_messages_used?: number;
          forecasts_generated?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          readings_generated?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          allow_spiritual_tone: boolean;
          content_focus_career: boolean;
          content_focus_growth: boolean;
          content_focus_love: boolean;
          created_at: string;
          id: string;
          tone_style: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allow_spiritual_tone?: boolean;
          content_focus_career?: boolean;
          content_focus_growth?: boolean;
          content_focus_love?: boolean;
          created_at?: string;
          id?: string;
          tone_style?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allow_spiritual_tone?: boolean;
          content_focus_career?: boolean;
          content_focus_growth?: boolean;
          content_focus_love?: boolean;
          created_at?: string;
          id?: string;
          tone_style?: string;
          updated_at?: string;
          user_id?: string;
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
  public: {
    Enums: {},
  },
} as const;
