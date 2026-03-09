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
          category: string
          created_at: string
          id: string
          photographer_id: string
          slug: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          category?: string
          created_at?: string
          id?: string
          photographer_id: string
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          category?: string
          created_at?: string
          id?: string
          photographer_id?: string
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "galleries_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          store_slug: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          store_slug?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          store_slug?: string | null
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
      sessions: {
        Row: {
          break_after_minutes: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          num_photos: number
          photographer_id: string
          price: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          break_after_minutes?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id: string
          price?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          break_after_minutes?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id?: string
          price?: number
          status?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
