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
      ai_agents: {
        Row: {
          auto_reply: boolean
          category: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          knowledge_base: Json
          model: string
          name: string
          photographer_id: string
          review_mode: boolean
          slug: string
          system_prompt: string
          temperature: number
          user_id: string
        }
        Insert: {
          auto_reply?: boolean
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          knowledge_base?: Json
          model?: string
          name?: string
          photographer_id: string
          review_mode?: boolean
          slug?: string
          system_prompt?: string
          temperature?: number
          user_id: string
        }
        Update: {
          auto_reply?: boolean
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          knowledge_base?: Json
          model?: string
          name?: string
          photographer_id?: string
          review_mode?: boolean
          slug?: string
          system_prompt?: string
          temperature?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_blog_config: {
        Row: {
          company_name: string
          created_at: string
          default_article_size: string | null
          default_cta: string | null
          default_image_prompt: string | null
          default_language: string | null
          default_tone: string | null
          id: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          default_article_size?: string | null
          default_cta?: string | null
          default_image_prompt?: string | null
          default_language?: string | null
          default_tone?: string | null
          id?: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          default_article_size?: string | null
          default_cta?: string | null
          default_image_prompt?: string | null
          default_language?: string | null
          default_tone?: string | null
          id?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_blog_images: {
        Row: {
          alt_text: string | null
          blog_id: string
          created_at: string
          id: string
          image_url: string
          photographer_id: string
          position: string
          prompt_used: string | null
          selected: boolean | null
        }
        Insert: {
          alt_text?: string | null
          blog_id: string
          created_at?: string
          id?: string
          image_url?: string
          photographer_id: string
          position?: string
          prompt_used?: string | null
          selected?: boolean | null
        }
        Update: {
          alt_text?: string | null
          blog_id?: string
          created_at?: string
          id?: string
          image_url?: string
          photographer_id?: string
          position?: string
          prompt_used?: string | null
          selected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_blog_images_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_blog_seo: {
        Row: {
          blog_id: string
          cannibalization_conflict_id: string | null
          cannibalization_warning: boolean | null
          checklist: Json | null
          created_at: string
          id: string
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_title: string | null
          photographer_id: string
          score: number | null
          secondary_keywords: string[] | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          blog_id: string
          cannibalization_conflict_id?: string | null
          cannibalization_warning?: boolean | null
          checklist?: Json | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_title?: string | null
          photographer_id: string
          score?: number | null
          secondary_keywords?: string[] | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          blog_id?: string
          cannibalization_conflict_id?: string | null
          cannibalization_warning?: boolean | null
          checklist?: Json | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_title?: string | null
          photographer_id?: string
          score?: number | null
          secondary_keywords?: string[] | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_blog_seo_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: true
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_themes: {
        Row: {
          blog_id: string | null
          created_at: string
          generated_at: string
          id: string
          intent: string | null
          keyword: string
          language: string | null
          photographer_id: string
          secondary_keywords: string[] | null
          status: string
          title: string
          tone: string | null
          used_at: string | null
        }
        Insert: {
          blog_id?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          intent?: string | null
          keyword?: string
          language?: string | null
          photographer_id: string
          secondary_keywords?: string[] | null
          status?: string
          title?: string
          tone?: string | null
          used_at?: string | null
        }
        Update: {
          blog_id?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          intent?: string | null
          keyword?: string
          language?: string | null
          photographer_id?: string
          secondary_keywords?: string[] | null
          status?: string
          title?: string
          tone?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      analytics_pageviews: {
        Row: {
          action: string
          created_at: string
          id: string
          page_path: string
          photographer_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          page_path: string
          photographer_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          page_path?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          all_day: boolean
          created_at: string
          date: string
          end_time: string
          id: string
          photographer_id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          date: string
          end_time?: string
          id?: string
          photographer_id: string
          reason?: string | null
          start_time?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          photographer_id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
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
      blogs: {
        Row: {
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          cta_text: string | null
          id: string
          keyword: string | null
          middle_image_alt: string | null
          middle_image_url: string | null
          mode: string
          photographer_id: string
          published_at: string | null
          reading_time_minutes: number | null
          secondary_keywords: string[] | null
          slug: string | null
          status: string
          theme_id: string | null
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          keyword?: string | null
          middle_image_alt?: string | null
          middle_image_url?: string | null
          mode?: string
          photographer_id: string
          published_at?: string | null
          reading_time_minutes?: number | null
          secondary_keywords?: string[] | null
          slug?: string | null
          status?: string
          theme_id?: string | null
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          keyword?: string | null
          middle_image_alt?: string | null
          middle_image_url?: string | null
          mode?: string
          photographer_id?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          secondary_keywords?: string[] | null
          slug?: string | null
          status?: string
          theme_id?: string | null
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      booking_briefing_responses: {
        Row: {
          answers: Json
          booking_id: string
          briefing_id: string
          id: string
          submitted_at: string
        }
        Insert: {
          answers?: Json
          booking_id: string
          briefing_id: string
          id?: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          booking_id?: string
          briefing_id?: string
          id?: string
          submitted_at?: string
        }
        Relationships: []
      }
      booking_invoice_items: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          photographer_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          description?: string
          id?: string
          photographer_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          photographer_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_invoice_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
          consent_given_at: string | null
          created_at: string
          extras_total: number
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
          consent_given_at?: string | null
          created_at?: string
          extras_total?: number
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
          consent_given_at?: string | null
          created_at?: string
          extras_total?: number
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
      brand_assets: {
        Row: {
          category: string
          created_at: string
          file_url: string
          height: number | null
          id: string
          name: string
          photographer_id: string
          width: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_url: string
          height?: number | null
          id?: string
          name?: string
          photographer_id: string
          width?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          file_url?: string
          height?: number | null
          id?: string
          name?: string
          photographer_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          created_at: string
          id: string
          name: string
          photographer_id: string
          questions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          photographer_id: string
          questions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
          questions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      bug_report_messages: {
        Row: {
          bug_report_id: string
          content: string
          created_at: string
          id: string
          is_admin: boolean
          sender_email: string
          sender_id: string
        }
        Insert: {
          bug_report_id: string
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_email?: string
          sender_id: string
        }
        Update: {
          bug_report_id?: string
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_email?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_messages_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          reporter_email: string
          reporter_id: string | null
          route: string
          screenshot_urls: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          reporter_email?: string
          reporter_id?: string | null
          route?: string
          screenshot_urls?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          reporter_email?: string
          reporter_id?: string | null
          route?: string
          screenshot_urls?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      carousel_historico: {
        Row: {
          background_config: Json | null
          created_at: string
          id: string
          layout_model: string | null
          nicho: string | null
          photographer_id: string
          slides_json: Json
          tema: string
          tom: string | null
        }
        Insert: {
          background_config?: Json | null
          created_at?: string
          id?: string
          layout_model?: string | null
          nicho?: string | null
          photographer_id: string
          slides_json?: Json
          tema?: string
          tom?: string | null
        }
        Update: {
          background_config?: Json | null
          created_at?: string
          id?: string
          layout_model?: string | null
          nicho?: string | null
          photographer_id?: string
          slides_json?: Json
          tema?: string
          tom?: string | null
        }
        Relationships: []
      }
      carousel_image_library: {
        Row: {
          created_at: string
          file_url: string
          id: string
          is_favorite: boolean
          name: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string
          id?: string
          is_favorite?: boolean
          name?: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          is_favorite?: boolean
          name?: string
          photographer_id?: string
        }
        Relationships: []
      }
      carousel_meta_config: {
        Row: {
          access_token: string
          app_id: string
          created_at: string
          id: string
          ig_account_id: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          app_id?: string
          created_at?: string
          id?: string
          ig_account_id?: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          app_id?: string
          created_at?: string
          id?: string
          ig_account_id?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          booking_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          color: string | null
          created_at: string
          description: string | null
          gallery_deadline: string | null
          id: string
          location: string | null
          notes: string | null
          photographer_id: string
          position: number
          session_type: string | null
          shoot_date: string | null
          shoot_time: string | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          gallery_deadline?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          photographer_id: string
          position?: number
          session_type?: string | null
          shoot_date?: string | null
          shoot_time?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          gallery_deadline?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          photographer_id?: string
          position?: number
          session_type?: string | null
          shoot_date?: string | null
          shoot_time?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          instagram: string | null
          notes: string | null
          phone: string | null
          photographer_id: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          instagram?: string | null
          notes?: string | null
          phone?: string | null
          photographer_id: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          instagram?: string | null
          notes?: string | null
          phone?: string | null
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_custom_fields: {
        Row: {
          created_at: string
          default_value: string
          field_key: string
          field_label: string
          id: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string
          field_key?: string
          field_label?: string
          id?: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          default_value?: string
          field_key?: string
          field_label?: string
          id?: string
          photographer_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      creative_images: {
        Row: {
          created_at: string
          file_url: string
          id: string
          is_favorite: boolean
          name: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          is_favorite?: boolean
          name?: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          is_favorite?: boolean
          name?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_images_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_templates: {
        Row: {
          background_config: Json | null
          category: string
          created_at: string
          elements: Json | null
          footer_config: Json | null
          format: string
          id: string
          name: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          background_config?: Json | null
          category?: string
          created_at?: string
          elements?: Json | null
          footer_config?: Json | null
          format?: string
          id?: string
          name?: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          background_config?: Json | null
          category?: string
          created_at?: string
          elements?: Json | null
          footer_config?: Json | null
          format?: string
          id?: string
          name?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_templates_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_assinaturas: {
        Row: {
          conta_ids: string[]
          conteudo: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          conta_ids?: string[]
          conteudo?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Update: {
          conta_ids?: string[]
          conteudo?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      email_bloqueados: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_contas: {
        Row: {
          assinatura: string
          cor: string
          created_at: string
          email: string
          id: string
          imap_ativo: boolean
          imap_porta: number
          imap_seguranca: string
          imap_senha: string
          imap_servidor: string
          imap_usuario: string
          nome: string
          padrao: boolean
          provedor: string
          smtp_ativo: boolean
          smtp_porta: number
          smtp_seguranca: string
          smtp_senha: string
          smtp_servidor: string
          smtp_usuario: string
          user_id: string
        }
        Insert: {
          assinatura?: string
          cor?: string
          created_at?: string
          email?: string
          id?: string
          imap_ativo?: boolean
          imap_porta?: number
          imap_seguranca?: string
          imap_senha?: string
          imap_servidor?: string
          imap_usuario?: string
          nome?: string
          padrao?: boolean
          provedor?: string
          smtp_ativo?: boolean
          smtp_porta?: number
          smtp_seguranca?: string
          smtp_senha?: string
          smtp_servidor?: string
          smtp_usuario?: string
          user_id?: string
        }
        Update: {
          assinatura?: string
          cor?: string
          created_at?: string
          email?: string
          id?: string
          imap_ativo?: boolean
          imap_porta?: number
          imap_seguranca?: string
          imap_senha?: string
          imap_servidor?: string
          imap_usuario?: string
          nome?: string
          padrao?: boolean
          provedor?: string
          smtp_ativo?: boolean
          smtp_porta?: number
          smtp_seguranca?: string
          smtp_senha?: string
          smtp_servidor?: string
          smtp_usuario?: string
          user_id?: string
        }
        Relationships: []
      }
      email_document_settings: {
        Row: {
          auto_save: boolean
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          auto_save?: boolean
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          auto_save?: boolean
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_documents: {
        Row: {
          created_at: string
          email_id: string
          file_name: string
          file_size: number
          file_url: string | null
          id: string
          mime_type: string
          saved: boolean
          sender_email: string
          sender_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_id: string
          file_name?: string
          file_size?: number
          file_url?: string | null
          id?: string
          mime_type?: string
          saved?: boolean
          sender_email?: string
          sender_name?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email_id?: string
          file_name?: string
          file_size?: number
          file_url?: string | null
          id?: string
          mime_type?: string
          saved?: boolean
          sender_email?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      email_emails: {
        Row: {
          assunto: string
          conta_id: string | null
          corpo: string
          created_at: string
          data: string
          destinatario: string | null
          email_destinatario: string | null
          email_remetente: string
          favorito: boolean
          hora: string
          id: string
          lido: boolean
          motivo_spam: string | null
          pasta: string | null
          preview: string
          prioridade: string
          remetente: string
          status: string | null
          tags: string[]
          tipo: string
          user_id: string
        }
        Insert: {
          assunto?: string
          conta_id?: string | null
          corpo?: string
          created_at?: string
          data?: string
          destinatario?: string | null
          email_destinatario?: string | null
          email_remetente?: string
          favorito?: boolean
          hora?: string
          id?: string
          lido?: boolean
          motivo_spam?: string | null
          pasta?: string | null
          preview?: string
          prioridade?: string
          remetente?: string
          status?: string | null
          tags?: string[]
          tipo?: string
          user_id?: string
        }
        Update: {
          assunto?: string
          conta_id?: string | null
          corpo?: string
          created_at?: string
          data?: string
          destinatario?: string | null
          email_destinatario?: string | null
          email_remetente?: string
          favorito?: boolean
          hora?: string
          id?: string
          lido?: boolean
          motivo_spam?: string | null
          pasta?: string | null
          preview?: string
          prioridade?: string
          remetente?: string
          status?: string | null
          tags?: string[]
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      email_grupo_contatos: {
        Row: {
          created_at: string
          email: string
          grupo_id: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          grupo_id: string
          id?: string
          nome?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          grupo_id?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_grupo_contatos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "email_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_grupos: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      email_pastas: {
        Row: {
          cor: string
          created_at: string
          email_ids: string[]
          icone: string
          id: string
          nome: string
          regras: Json
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          email_ids?: string[]
          icone?: string
          id?: string
          nome?: string
          regras?: Json
          user_id?: string
        }
        Update: {
          cor?: string
          created_at?: string
          email_ids?: string[]
          icone?: string
          id?: string
          nome?: string
          regras?: Json
          user_id?: string
        }
        Relationships: []
      }
      email_preferencias: {
        Row: {
          created_at: string
          emails_por_pagina: number
          id: string
          idioma_ia: string
          marcar_ao_abrir: boolean
          mostrar_preview: boolean
          notificacoes: boolean
          resposta_auto_apenas_conhecidos: boolean
          resposta_auto_assunto: string
          resposta_auto_ate: string
          resposta_auto_ativa: boolean
          resposta_auto_de: string
          resposta_auto_mensagem: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emails_por_pagina?: number
          id?: string
          idioma_ia?: string
          marcar_ao_abrir?: boolean
          mostrar_preview?: boolean
          notificacoes?: boolean
          resposta_auto_apenas_conhecidos?: boolean
          resposta_auto_assunto?: string
          resposta_auto_ate?: string
          resposta_auto_ativa?: boolean
          resposta_auto_de?: string
          resposta_auto_mensagem?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          emails_por_pagina?: number
          id?: string
          idioma_ia?: string
          marcar_ao_abrir?: boolean
          mostrar_preview?: boolean
          notificacoes?: boolean
          resposta_auto_apenas_conhecidos?: boolean
          resposta_auto_assunto?: string
          resposta_auto_ate?: string
          resposta_auto_ativa?: boolean
          resposta_auto_de?: string
          resposta_auto_mensagem?: string
          user_id?: string
        }
        Relationships: []
      }
      email_regras_segmentacao: {
        Row: {
          created_at: string
          entao_tipo: string
          entao_valor: string
          id: string
          se_tipo: string
          se_valor: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entao_tipo?: string
          entao_valor?: string
          id?: string
          se_tipo?: string
          se_valor?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          entao_tipo?: string
          entao_valor?: string
          id?: string
          se_tipo?: string
          se_valor?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          assunto: string
          categoria: string
          corpo: string
          created_at: string
          criado_em: string
          criado_por_ia: boolean
          id: string
          nome: string
          tom: string
          user_id: string
          usos: number
        }
        Insert: {
          assunto?: string
          categoria?: string
          corpo?: string
          created_at?: string
          criado_em?: string
          criado_por_ia?: boolean
          id?: string
          nome?: string
          tom?: string
          user_id?: string
          usos?: number
        }
        Update: {
          assunto?: string
          categoria?: string
          corpo?: string
          created_at?: string
          criado_em?: string
          criado_por_ia?: boolean
          id?: string
          nome?: string
          tom?: string
          user_id?: string
          usos?: number
        }
        Relationships: []
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
          price_per_photo: number
          slug: string | null
          sort_order: number
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
          price_per_photo?: number
          slug?: string | null
          sort_order?: number
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
          price_per_photo?: number
          slug?: string | null
          sort_order?: number
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
      gallery_settings: {
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
        Relationships: []
      }
      help_assistant_config: {
        Row: {
          id: string
          model: string
          system_prompt: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          id?: string
          model?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          id?: string
          model?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      help_conversations: {
        Row: {
          created_at: string
          id: string
          photographer_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          photographer_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          photographer_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "help_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_email_automated: {
        Row: {
          created_at: string
          enabled: boolean
          html_content: string | null
          id: string
          name: string
          photographer_id: string
          sender_email: string
          sender_name: string
          subject: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          html_content?: string | null
          id?: string
          name?: string
          photographer_id: string
          sender_email?: string
          sender_name?: string
          subject?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          html_content?: string | null
          id?: string
          name?: string
          photographer_id?: string
          sender_email?: string
          sender_name?: string
          subject?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_email_automated_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_email_campaign_emails: {
        Row: {
          campaign_id: string
          created_at: string
          delay_days: number
          email_order: number
          html_content: string | null
          id: string
          send_time: string | null
          subject: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delay_days?: number
          email_order?: number
          html_content?: string | null
          id?: string
          send_time?: string | null
          subject?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delay_days?: number
          email_order?: number
          html_content?: string | null
          id?: string
          send_time?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_email_campaign_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_email_campaigns: {
        Row: {
          audience: Json | null
          created_at: string
          html_content: string | null
          id: string
          name: string
          photographer_id: string
          sender_email: string
          sender_name: string
          stats: Json | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          audience?: Json | null
          created_at?: string
          html_content?: string | null
          id?: string
          name?: string
          photographer_id: string
          sender_email?: string
          sender_name?: string
          stats?: Json | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          audience?: Json | null
          created_at?: string
          html_content?: string | null
          id?: string
          name?: string
          photographer_id?: string
          sender_email?: string
          sender_name?: string
          stats?: Json | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_email_campaigns_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_email_oneoff: {
        Row: {
          audience: Json | null
          created_at: string
          html_content: string | null
          id: string
          name: string
          photographer_id: string
          scheduled_at: string | null
          sender_email: string
          sender_name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          audience?: Json | null
          created_at?: string
          html_content?: string | null
          id?: string
          name?: string
          photographer_id: string
          scheduled_at?: string | null
          sender_email?: string
          sender_name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          audience?: Json | null
          created_at?: string
          html_content?: string | null
          id?: string
          name?: string
          photographer_id?: string
          scheduled_at?: string | null
          sender_email?: string
          sender_name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_email_oneoff_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_push_notifications: {
        Row: {
          action_url: string | null
          audience: Json | null
          body: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          photographer_id: string
          scheduled_at: string | null
          status: string
          title: string
        }
        Insert: {
          action_url?: string | null
          audience?: Json | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          photographer_id: string
          scheduled_at?: string | null
          status?: string
          title?: string
        }
        Update: {
          action_url?: string | null
          audience?: Json | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          photographer_id?: string
          scheduled_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_push_notifications_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_social_posts: {
        Row: {
          caption: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          media_urls: Json | null
          name: string
          photographer_id: string
          platform: string
          post_type: string
          status: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          name?: string
          photographer_id: string
          platform?: string
          post_type?: string
          status?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          name?: string
          photographer_id?: string
          platform?: string
          post_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_social_posts_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_push: boolean
          email: boolean
          event: string
          id: string
          in_app: boolean
          photographer_id: string
          updated_at: string
        }
        Insert: {
          browser_push?: boolean
          email?: boolean
          event: string
          id?: string
          in_app?: boolean
          photographer_id: string
          updated_at?: string
        }
        Update: {
          browser_push?: boolean
          email?: boolean
          event?: string
          id?: string
          in_app?: boolean
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          event: string
          id: string
          metadata: Json | null
          photographer_id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          photographer_id: string
          read?: boolean
          title?: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          photographer_id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      page_seo_settings: {
        Row: {
          canonical_url: string | null
          changefreq: string
          created_at: string
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          nofollow: boolean
          noindex: boolean
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_name: string
          page_path: string
          photographer_id: string
          priority: number
          structured_data: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          changefreq?: string
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          nofollow?: boolean
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name: string
          page_path: string
          photographer_id: string
          priority?: number
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          changefreq?: string
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          nofollow?: boolean
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name?: string
          page_path?: string
          photographer_id?: string
          priority?: number
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_seo_settings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
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
      photographer_site: {
        Row: {
          about_bg_color: string | null
          about_image_url: string | null
          about_text_color: string | null
          about_title: string | null
          accent_color: string | null
          contact_bg_color: string | null
          contact_text_color: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          experience_bg_color: string | null
          experience_text: string | null
          experience_text_color: string | null
          experience_title: string | null
          facebook_pixel_id: string | null
          facebook_url: string | null
          favicon_url: string | null
          footer_bg_color: string | null
          footer_preset: string | null
          footer_show_logo: boolean | null
          footer_show_socials: boolean | null
          footer_text: string | null
          footer_text_color: string | null
          footer_visible_socials: Json | null
          google_analytics_id: string | null
          header_bg_color: string | null
          header_text_color: string | null
          header_visible_socials: Json | null
          hero_bg_color: string | null
          hero_text_color: string | null
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          og_image_url: string | null
          photographer_id: string
          pinterest_url: string | null
          portfolio_bg_color: string | null
          portfolio_text_color: string | null
          quote_author: string | null
          quote_bg_color: string | null
          quote_text: string | null
          quote_text_color: string | null
          seo_description: string | null
          seo_title: string | null
          sessions_bg_color: string | null
          sessions_text_color: string | null
          show_about: boolean | null
          show_blog: boolean | null
          show_booking: boolean | null
          show_contact: boolean | null
          show_store: boolean | null
          site_headline: string | null
          site_hero_image_url: string | null
          site_sections_order: Json | null
          site_subheadline: string | null
          site_template: string | null
          tagline: string | null
          testimonials: Json | null
          testimonials_bg_color: string | null
          testimonials_text_color: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          about_bg_color?: string | null
          about_image_url?: string | null
          about_text_color?: string | null
          about_title?: string | null
          accent_color?: string | null
          contact_bg_color?: string | null
          contact_text_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          experience_bg_color?: string | null
          experience_text?: string | null
          experience_text_color?: string | null
          experience_title?: string | null
          facebook_pixel_id?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_bg_color?: string | null
          footer_preset?: string | null
          footer_show_logo?: boolean | null
          footer_show_socials?: boolean | null
          footer_text?: string | null
          footer_text_color?: string | null
          footer_visible_socials?: Json | null
          google_analytics_id?: string | null
          header_bg_color?: string | null
          header_text_color?: string | null
          header_visible_socials?: Json | null
          hero_bg_color?: string | null
          hero_text_color?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          photographer_id: string
          pinterest_url?: string | null
          portfolio_bg_color?: string | null
          portfolio_text_color?: string | null
          quote_author?: string | null
          quote_bg_color?: string | null
          quote_text?: string | null
          quote_text_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sessions_bg_color?: string | null
          sessions_text_color?: string | null
          show_about?: boolean | null
          show_blog?: boolean | null
          show_booking?: boolean | null
          show_contact?: boolean | null
          show_store?: boolean | null
          site_headline?: string | null
          site_hero_image_url?: string | null
          site_sections_order?: Json | null
          site_subheadline?: string | null
          site_template?: string | null
          tagline?: string | null
          testimonials?: Json | null
          testimonials_bg_color?: string | null
          testimonials_text_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_bg_color?: string | null
          about_image_url?: string | null
          about_text_color?: string | null
          about_title?: string | null
          accent_color?: string | null
          contact_bg_color?: string | null
          contact_text_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          experience_bg_color?: string | null
          experience_text?: string | null
          experience_text_color?: string | null
          experience_title?: string | null
          facebook_pixel_id?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_bg_color?: string | null
          footer_preset?: string | null
          footer_show_logo?: boolean | null
          footer_show_socials?: boolean | null
          footer_text?: string | null
          footer_text_color?: string | null
          footer_visible_socials?: Json | null
          google_analytics_id?: string | null
          header_bg_color?: string | null
          header_text_color?: string | null
          header_visible_socials?: Json | null
          hero_bg_color?: string | null
          hero_text_color?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          photographer_id?: string
          pinterest_url?: string | null
          portfolio_bg_color?: string | null
          portfolio_text_color?: string | null
          quote_author?: string | null
          quote_bg_color?: string | null
          quote_text?: string | null
          quote_text_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sessions_bg_color?: string | null
          sessions_text_color?: string | null
          show_about?: boolean | null
          show_blog?: boolean | null
          show_booking?: boolean | null
          show_contact?: boolean | null
          show_store?: boolean | null
          site_headline?: string | null
          site_hero_image_url?: string | null
          site_sections_order?: Json | null
          site_subheadline?: string | null
          site_template?: string | null
          tagline?: string | null
          testimonials?: Json | null
          testimonials_bg_color?: string | null
          testimonials_text_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      photographers: {
        Row: {
          approval_status: string
          bio: string | null
          business_address: string | null
          business_city: string | null
          business_country: string | null
          business_currency: string | null
          business_name: string | null
          business_neighborhood: string | null
          business_phone: string | null
          business_state: string | null
          business_tax_id: string | null
          business_zip: string | null
          created_at: string
          custom_domain: string | null
          email: string
          full_name: string | null
          hero_image_url: string | null
          id: string
          package_name: string | null
          store_slug: string | null
          stripe_account_id: string | null
          stripe_connected_at: string | null
          watermark_url: string | null
        }
        Insert: {
          approval_status?: string
          bio?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_currency?: string | null
          business_name?: string | null
          business_neighborhood?: string | null
          business_phone?: string | null
          business_state?: string | null
          business_tax_id?: string | null
          business_zip?: string | null
          created_at?: string
          custom_domain?: string | null
          email: string
          full_name?: string | null
          hero_image_url?: string | null
          id: string
          package_name?: string | null
          store_slug?: string | null
          stripe_account_id?: string | null
          stripe_connected_at?: string | null
          watermark_url?: string | null
        }
        Update: {
          approval_status?: string
          bio?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_currency?: string | null
          business_name?: string | null
          business_neighborhood?: string | null
          business_phone?: string | null
          business_state?: string | null
          business_tax_id?: string | null
          business_zip?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string
          full_name?: string | null
          hero_image_url?: string | null
          id?: string
          package_name?: string | null
          store_slug?: string | null
          stripe_account_id?: string | null
          stripe_connected_at?: string | null
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
      project_documents: {
        Row: {
          category: string
          created_at: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          name: string
          photographer_id: string
          project_id: string
          storage_path: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          photographer_id: string
          project_id: string
          storage_path?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          photographer_id?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_emails: {
        Row: {
          body: string
          client_email: string
          created_at: string
          id: string
          photographer_id: string
          project_id: string
          status: string
          subject: string
        }
        Insert: {
          body?: string
          client_email: string
          created_at?: string
          id?: string
          photographer_id: string
          project_id: string
          status?: string
          subject?: string
        }
        Update: {
          body?: string
          client_email?: string
          created_at?: string
          id?: string
          photographer_id?: string
          project_id?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_amount: number
          paid_at: string | null
          photographer_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          photographer_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          photographer_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invoices_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          photographer_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          photographer_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          avoid_weekends: boolean
          created_at: string
          department: string | null
          display_order: number
          enabled: boolean
          estimated_minutes: number | null
          id: string
          notes: string | null
          owner_name: string | null
          photographer_id: string
          repeat_count: number | null
          schedule_day_of_month: number | null
          schedule_days_of_week: number[] | null
          schedule_freq: string
          schedule_interval: number
          start_date: string
          started_at: string | null
          state: string
          title: string
          user_id: string
          weekend_policy: string
        }
        Insert: {
          avoid_weekends?: boolean
          created_at?: string
          department?: string | null
          display_order?: number
          enabled?: boolean
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          owner_name?: string | null
          photographer_id: string
          repeat_count?: number | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_freq?: string
          schedule_interval?: number
          start_date?: string
          started_at?: string | null
          state?: string
          title?: string
          user_id: string
          weekend_policy?: string
        }
        Update: {
          avoid_weekends?: boolean
          created_at?: string
          department?: string | null
          display_order?: number
          enabled?: boolean
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          owner_name?: string | null
          photographer_id?: string
          repeat_count?: number | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_freq?: string
          schedule_interval?: number
          start_date?: string
          started_at?: string | null
          state?: string
          title?: string
          user_id?: string
          weekend_policy?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_photographer_id_fkey"
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
          location_override: string | null
          photographer_id: string
          session_id: string
          spots: number
          start_time: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_booked?: boolean
          location_override?: string | null
          photographer_id: string
          session_id: string
          spots?: number
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_booked?: boolean
          location_override?: string | null
          photographer_id?: string
          session_id?: string
          spots?: number
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
      session_bonuses: {
        Row: {
          created_at: string
          id: string
          photographer_id: string
          position: number
          session_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          photographer_id: string
          position?: number
          session_id: string
          text?: string
        }
        Update: {
          created_at?: string
          id?: string
          photographer_id?: string
          position?: number
          session_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_bonuses_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_bonuses_session_id_fkey"
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
          briefing_id: string | null
          campaign_dates: string[] | null
          confirmation_email_body: string
          contract_text: string | null
          cover_image_url: string | null
          created_at: string
          deposit_amount: number
          deposit_enabled: boolean
          deposit_type: string
          description: string | null
          duration_minutes: number
          hide_from_store: boolean
          id: string
          location: string | null
          num_photos: number
          photographer_id: string
          portfolio_photos: string[] | null
          price: number
          reminder_days: number[]
          session_model: string
          session_type_id: string | null
          slug: string | null
          sort_order: number
          status: string
          tagline: string | null
          tax_rate: number
          title: string
          updated_at: string
          virtual_block_percent: number
        }
        Insert: {
          allow_tip?: boolean
          booking_notice_days?: number
          booking_window_days?: number
          break_after_minutes?: number
          briefing_id?: string | null
          campaign_dates?: string[] | null
          confirmation_email_body?: string
          contract_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_enabled?: boolean
          deposit_type?: string
          description?: string | null
          duration_minutes?: number
          hide_from_store?: boolean
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id: string
          portfolio_photos?: string[] | null
          price?: number
          reminder_days?: number[]
          session_model?: string
          session_type_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: string
          tagline?: string | null
          tax_rate?: number
          title?: string
          updated_at?: string
          virtual_block_percent?: number
        }
        Update: {
          allow_tip?: boolean
          booking_notice_days?: number
          booking_window_days?: number
          break_after_minutes?: number
          briefing_id?: string | null
          campaign_dates?: string[] | null
          confirmation_email_body?: string
          contract_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_enabled?: boolean
          deposit_type?: string
          description?: string | null
          duration_minutes?: number
          hide_from_store?: boolean
          id?: string
          location?: string | null
          num_photos?: number
          photographer_id?: string
          portfolio_photos?: string[] | null
          price?: number
          reminder_days?: number[]
          session_model?: string
          session_type_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: string
          tagline?: string | null
          tax_rate?: number
          title?: string
          updated_at?: string
          virtual_block_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
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
      sidebar_favorites: {
        Row: {
          created_at: string
          id: string
          item_key: string
          photographer_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          photographer_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          photographer_id?: string
          position?: number
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          is_home: boolean
          is_visible: boolean
          page_content: Json | null
          parent_id: string | null
          photographer_id: string
          sections_order: Json | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_home?: boolean
          is_visible?: boolean
          page_content?: Json | null
          parent_id?: string | null
          photographer_id: string
          sections_order?: Json | null
          slug: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_home?: boolean
          is_visible?: boolean
          page_content?: Json | null
          parent_id?: string | null
          photographer_id?: string
          sections_order?: Json | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_api_connections: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean
          photographer_id: string
          platform: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          photographer_id: string
          platform?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          photographer_id?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_api_connections_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      ssl_alert_state: {
        Row: {
          bucket: string
          domain: string
          expires_at: string | null
          notified_at: string
          updated_at: string
        }
        Insert: {
          bucket: string
          domain: string
          expires_at?: string | null
          notified_at?: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          domain?: string
          expires_at?: string | null
          notified_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ssl_email_bounces: {
        Row: {
          brevo_event_at: string | null
          created_at: string
          domain: string | null
          email: string
          event: string
          id: string
          message_id: string | null
          raw_payload: Json | null
          reason: string | null
        }
        Insert: {
          brevo_event_at?: string | null
          created_at?: string
          domain?: string | null
          email: string
          event: string
          id?: string
          message_id?: string | null
          raw_payload?: Json | null
          reason?: string | null
        }
        Update: {
          brevo_event_at?: string | null
          created_at?: string
          domain?: string | null
          email?: string
          event?: string
          id?: string
          message_id?: string | null
          raw_payload?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      studio_members: {
        Row: {
          email: string
          full_name: string
          id: string
          invited_at: string
          joined_at: string | null
          photographer_id: string
          role_id: string | null
          status: string
        }
        Insert: {
          email: string
          full_name?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          photographer_id: string
          role_id?: string | null
          status?: string
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          photographer_id?: string
          role_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "studio_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: Json
          photographer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
          photographer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_roles_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          role: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_mode: string
          client_email: string
          client_name: string
          closed_at: string | null
          created_at: string
          id: string
          internal_notes: string | null
          photographer_id: string
          rating: number | null
          rating_comment: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          ai_mode?: string
          client_email?: string
          client_name?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          photographer_id: string
          rating?: number | null
          rating_comment?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          ai_mode?: string
          client_email?: string
          client_name?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          photographer_id?: string
          rating?: number | null
          rating_comment?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      task_occurrences: {
        Row: {
          actual_minutes: number | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          due_date: string
          id: string
          late_by_days: number
          recurring_task_id: string
          status: string
        }
        Insert: {
          actual_minutes?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date: string
          id?: string
          late_by_days?: number
          recurring_task_id: string
          status?: string
        }
        Update: {
          actual_minutes?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string
          id?: string
          late_by_days?: number
          recurring_task_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrences_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      workflow_activity: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_email_templates: {
        Row: {
          auto_send: boolean
          created_at: string
          enabled: boolean
          html_content: string
          id: string
          photographer_id: string
          stage_trigger: string
          subject: string
          updated_at: string
        }
        Insert: {
          auto_send?: boolean
          created_at?: string
          enabled?: boolean
          html_content?: string
          id?: string
          photographer_id: string
          stage_trigger: string
          subject?: string
          updated_at?: string
        }
        Update: {
          auto_send?: boolean
          created_at?: string
          enabled?: boolean
          html_content?: string
          id?: string
          photographer_id?: string
          stage_trigger?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workflow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_projects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          owner_id: string
          photographer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          owner_id: string
          photographer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          owner_id?: string
          photographer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_projects_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_sections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          project_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workflow_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assignee_id: string | null
          attachments: Json | null
          created_at: string
          created_by: string
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          photographer_id: string
          position: number
          priority: string
          project_id: string
          section_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          attachments?: Json | null
          created_at?: string
          created_by: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photographer_id: string
          position?: number
          priority?: string
          project_id: string
          section_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photographer_id?: string
          position?: number
          priority?: string
          project_id?: string
          section_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workflow_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workflow_sections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_photographer_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
