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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          photographer_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photographer_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          canonical_url: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          featured: boolean
          footer: string | null
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          mid_image_1: string | null
          mid_image_2: string | null
          og_image_url: string | null
          photographer_id: string
          published: boolean
          published_at: string | null
          reading_time_min: number
          scheduled_at: string | null
          slug: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          canonical_url?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          footer?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          mid_image_1?: string | null
          mid_image_2?: string | null
          og_image_url?: string | null
          photographer_id: string
          published?: boolean
          published_at?: string | null
          reading_time_min?: number
          scheduled_at?: string | null
          slug?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          author?: string
          canonical_url?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          footer?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          mid_image_1?: string | null
          mid_image_2?: string | null
          og_image_url?: string | null
          photographer_id?: string
          published?: boolean
          published_at?: string | null
          reading_time_min?: number
          scheduled_at?: string | null
          slug?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_settings: {
        Row: {
          id: string
          key: string
          photographer_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          photographer_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          photographer_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_settings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_themes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          photographer_id: string
          status: string
          theme: string
          used_by_post_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photographer_id: string
          status?: string
          theme: string
          used_by_post_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photographer_id?: string
          status?: string
          theme?: string
          used_by_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_themes_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_themes_used_by_post_id_fkey"
            columns: ["used_by_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          availability_id: string
          booked_date: string | null
          client_email: string
          client_name: string
          created_at: string
          id: string
          payment_status: string
          photographer_id: string
          session_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          availability_id: string
          booked_date?: string | null
          client_email: string
          client_name: string
          created_at?: string
          id?: string
          payment_status?: string
          photographer_id: string
          session_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          availability_id?: string
          booked_date?: string | null
          client_email?: string
          client_name?: string
          created_at?: string
          id?: string
          payment_status?: string
          photographer_id?: string
          session_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "session_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      galleries: {
        Row: {
          access_code: string | null
          booking_id: string | null
          category: string
          cover_focal_x: number | null
          cover_focal_y: number | null
          cover_image_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          photographer_id: string
          slug: string | null
          status: string
          title: string
          updated_at: string
          watermark_id: string | null
          watermark_url: string | null
        }
        Insert: {
          access_code?: string | null
          booking_id?: string | null
          category?: string
          cover_focal_x?: number | null
          cover_focal_y?: number | null
          cover_image_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          photographer_id: string
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
          watermark_id?: string | null
          watermark_url?: string | null
        }
        Update: {
          access_code?: string | null
          booking_id?: string | null
          category?: string
          cover_focal_x?: number | null
          cover_focal_y?: number | null
          cover_image_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          photographer_id?: string
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
          watermark_id?: string | null
          watermark_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "galleries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galleries_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galleries_watermark_id_fkey"
            columns: ["watermark_id"]
            isOneToOne: false
            referencedRelation: "watermarks"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_favorites: {
        Row: {
          client_token: string
          created_at: string
          gallery_id: string
          id: string
          photo_id: string
        }
        Insert: {
          client_token: string
          created_at?: string
          gallery_id: string
          id?: string
          photo_id: string
        }
        Update: {
          client_token?: string
          created_at?: string
          gallery_id?: string
          id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          bio: string | null
          business_address: string | null
          business_city: string | null
          business_country: string | null
          business_currency: string | null
          business_name: string | null
          business_phone: string | null
          business_tax_id: string | null
          created_at: string
          custom_domain: string | null
          email: string
          full_name: string | null
          hero_image_url: string | null
          id: string
          store_slug: string | null
          watermark_url: string | null
        }
        Insert: {
          bio?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_currency?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_tax_id?: string | null
          created_at?: string
          custom_domain?: string | null
          email: string
          full_name?: string | null
          hero_image_url?: string | null
          id: string
          store_slug?: string | null
          watermark_url?: string | null
        }
        Update: {
          bio?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_currency?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_tax_id?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string
          full_name?: string | null
          hero_image_url?: string | null
          id?: string
          store_slug?: string | null
          watermark_url?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          filename: string
          gallery_id: string
          id: string
          order_index: number
          photographer_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          filename?: string
          gallery_id: string
          id?: string
          order_index?: number
          photographer_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          gallery_id?: string
          id?: string
          order_index?: number
          photographer_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_availability: {
        Row: {
          created_at: string
          date: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_booked: boolean
          photographer_id: string
          session_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_booked?: boolean
          photographer_id: string
          session_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_booked?: boolean
          photographer_id?: string
          session_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_availability_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_availability_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_day_config: {
        Row: {
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          day_of_week: number
          hours_end: string | null
          hours_start: string | null
          id: string
          photographer_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          day_of_week: number
          hours_end?: string | null
          hours_start?: string | null
          id?: string
          photographer_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          day_of_week?: number
          hours_end?: string | null
          hours_start?: string | null
          id?: string
          photographer_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_day_config_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_day_config_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_extras: {
        Row: {
          created_at: string
          description: string
          id: string
          photographer_id: string
          price: number
          quantity: number
          session_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          photographer_id: string
          price?: number
          quantity?: number
          session_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          photographer_id?: string
          price?: number
          quantity?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_extras_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_extras_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_photo_tiers: {
        Row: {
          created_at: string
          id: string
          max_photos: number | null
          min_photos: number
          photographer_id: string
          price_per_photo: number
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_photos?: number | null
          min_photos?: number
          photographer_id: string
          price_per_photo?: number
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_photos?: number | null
          min_photos?: number
          photographer_id?: string
          price_per_photo?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_photo_tiers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_photo_tiers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_types: {
        Row: {
          created_at: string
          id: string
          name: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_types_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          allow_tip: boolean
          booking_notice_days: number
          booking_window_days: number
          break_after_minutes: number
          confirmation_email_body: string
          contract_text: string | null
          cover_image_url: string | null
          created_at: string
          deposit_amount: number
          deposit_enabled: boolean
          deposit_type: string
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          num_photos: number
          photographer_id: string
          price: number
          reminder_days: number[]
          session_type_id: string | null
          slug: string | null
          status: string
          tax_rate: number
          title: string
          updated_at: string
        }
        Insert: {
          allow_tip?: boolean
          booking_notice_days?: number
          booking_window_days?: number
          break_after_minutes?: number
          confirmation_email_body?: string
          contract_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_enabled?: boolean
          deposit_type?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id: string
          price?: number
          reminder_days?: number[]
          session_type_id?: string | null
          slug?: string | null
          status?: string
          tax_rate?: number
          title?: string
          updated_at?: string
        }
        Update: {
          allow_tip?: boolean
          booking_notice_days?: number
          booking_window_days?: number
          break_after_minutes?: number
          confirmation_email_body?: string
          contract_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_enabled?: boolean
          deposit_type?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id?: string
          price?: number
          reminder_days?: number[]
          session_type_id?: string | null
          slug?: string | null
          status?: string
          tax_rate?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "session_types"
            referencedColumns: ["id"]
          },
        ]
      }
      watermarks: {
        Row: {
          created_at: string
          id: string
          image_enabled: boolean
          image_opacity: number
          image_position: string
          image_scale: number
          image_url: string | null
          name: string
          photographer_id: string
          text_color: string
          text_content: string | null
          text_enabled: boolean
          text_font: string
          text_opacity: number
          text_position: string
          text_scale: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_enabled?: boolean
          image_opacity?: number
          image_position?: string
          image_scale?: number
          image_url?: string | null
          name?: string
          photographer_id: string
          text_color?: string
          text_content?: string | null
          text_enabled?: boolean
          text_font?: string
          text_opacity?: number
          text_position?: string
          text_scale?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_enabled?: boolean
          image_opacity?: number
          image_position?: string
          image_scale?: number
          image_url?: string | null
          name?: string
          photographer_id?: string
          text_color?: string
          text_content?: string | null
          text_enabled?: boolean
          text_font?: string
          text_opacity?: number
          text_position?: string
          text_scale?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      slugify: { Args: { input: string }; Returns: string }
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
