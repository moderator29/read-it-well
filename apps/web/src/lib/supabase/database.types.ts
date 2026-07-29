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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_applications: {
        Row: {
          account_name: string | null
          account_number: string | null
          agree_terms: boolean
          bank_name: string | null
          business_name: string | null
          business_rc: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          id_number: string | null
          id_type: string | null
          phone: string | null
          reference: string
          residential_address: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          state_code: string | null
          status: Database["public"]["Enums"]["agent_application_status"]
          submitted_at: string | null
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          agree_terms?: boolean
          bank_name?: string | null
          business_name?: string | null
          business_rc?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          phone?: string | null
          reference?: string
          residential_address?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          submitted_at?: string | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          agree_terms?: boolean
          bank_name?: string | null
          business_name?: string | null
          business_rc?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          phone?: string | null
          reference?: string
          residential_address?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          submitted_at?: string | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      agent_documents: {
        Row: {
          application_id: string
          id: string
          kind: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          application_id: string
          id?: string
          kind: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          id?: string
          kind?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          application_id: string | null
          created_at: string
          display_name: string
          id: string
          status: Database["public"]["Enums"]["agent_application_status"]
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          status?: Database["public"]["Enums"]["agent_application_status"]
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          application_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          status?: Database["public"]["Enums"]["agent_application_status"]
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
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
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          category: string
          code: string
          id: string
          label: string
        }
        Insert: {
          category?: string
          code: string
          id?: string
          label: string
        }
        Update: {
          category?: string
          code?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      availability: {
        Row: {
          date: string
          listing_id: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          date: string
          listing_id: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          date?: string
          listing_id?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_state_events: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_state_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          children: number
          cleaning_fee_minor: number
          created_at: string
          currency: string
          during: unknown
          guest_id: string
          id: string
          listing_id: string
          nights: number
          price_per_night_minor: number
          service_fee_minor: number
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          adults?: number
          check_in: string
          check_out: string
          children?: number
          cleaning_fee_minor?: number
          created_at?: string
          currency?: string
          during?: unknown
          guest_id: string
          id?: string
          listing_id: string
          nights: number
          price_per_night_minor: number
          service_fee_minor?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_minor: number
          total_minor: number
          updated_at?: string
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          children?: number
          cleaning_fee_minor?: number
          created_at?: string
          currency?: string
          during?: unknown
          guest_id?: string
          id?: string
          listing_id?: string
          nights?: number
          price_per_night_minor?: number
          service_fee_minor?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string
          guest_id: string
          id: string
          last_message_at: string
          listing_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          guest_id: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          note: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inspection_confirmations: {
        Row: {
          confirmed_at: string
          conversation_id: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          conversation_id: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          conversation_id?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_confirmations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_confirmations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          agent_share_minor: number
          booking_id: string
          created_at: string
          gross_minor: number
          id: string
          net_settlement_minor: number
          platform_fee_minor: number
          processor_fee_minor: number
          transaction_id: string | null
        }
        Insert: {
          agent_share_minor?: number
          booking_id: string
          created_at?: string
          gross_minor: number
          id?: string
          net_settlement_minor: number
          platform_fee_minor?: number
          processor_fee_minor?: number
          transaction_id?: string | null
        }
        Update: {
          agent_share_minor?: number
          booking_id?: string
          created_at?: string
          gross_minor?: number
          id?: string
          net_settlement_minor?: number
          platform_fee_minor?: number
          processor_fee_minor?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_amenities: {
        Row: {
          amenity_id: string
          listing_id: string
        }
        Insert: {
          amenity_id: string
          listing_id: string
        }
        Update: {
          amenity_id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_amenities_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          agent_id: string
          area: string | null
          bathrooms: number
          bedrooms: number
          beds: number
          city: string | null
          cleaning_fee_minor: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          instant_book: boolean
          landmark: string | null
          latitude: number | null
          longitude: number | null
          max_guests: number
          min_stay_nights: number
          price_per_night_minor: number
          price_period: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          service_fee_minor: number
          state_code: string | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_id: string
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          beds?: number
          city?: string | null
          cleaning_fee_minor?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          instant_book?: boolean
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          min_stay_nights?: number
          price_per_night_minor?: number
          price_period?: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          service_fee_minor?: number
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_id?: string
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          beds?: number
          city?: string | null
          cleaning_fee_minor?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          instant_book?: boolean
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          min_stay_nights?: number
          price_per_night_minor?: number
          price_period?: Database["public"]["Enums"]["price_period"]
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          service_fee_minor?: number
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          height: number | null
          id: string
          message_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          message_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          message_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_flags: {
        Row: {
          created_at: string
          id: string
          matched: string
          message_id: string
          reason: Database["public"]["Enums"]["message_flag_reason"]
          status: Database["public"]["Enums"]["message_flag_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          matched: string
          message_id: string
          reason: Database["public"]["Enums"]["message_flag_reason"]
          status?: Database["public"]["Enums"]["message_flag_status"]
        }
        Update: {
          created_at?: string
          id?: string
          matched?: string
          message_id?: string
          reason?: Database["public"]["Enums"]["message_flag_reason"]
          status?: Database["public"]["Enums"]["message_flag_status"]
        }
        Relationships: [
          {
            foreignKeyName: "message_flags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_name: string
          account_number: string
          agent_id: string
          bank_name: string
          created_at: string
          id: string
          is_default: boolean
        }
        Insert: {
          account_name: string
          account_number: string
          agent_id: string
          bank_name: string
          created_at?: string
          id?: string
          is_default?: boolean
        }
        Update: {
          account_name?: string
          account_number?: string
          agent_id?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_default?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          phone: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: Database["public"]["Enums"]["locale"]
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          booking_id: string
          created_at: string
          id: string
          listing_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          booking_id: string
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_enabled: boolean
          created_at: string
          id: string
          label: string | null
          query: Json
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          id?: string
          label?: string | null
          query?: Json
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          id?: string
          label?: string | null
          query?: Json
          user_id?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          created_at: string
          name: string
          zone: Database["public"]["Enums"]["geopolitical_zone"]
        }
        Insert: {
          code: string
          created_at?: string
          name: string
          zone: Database["public"]["Enums"]["geopolitical_zone"]
        }
        Update: {
          code?: string
          created_at?: string
          name?: string
          zone?: Database["public"]["Enums"]["geopolitical_zone"]
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string
          created_at: string
          email: string
          id: string
          name: string
          reference: string
          status: Database["public"]["Enums"]["support_ticket_status"]
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          id?: string
          name: string
          reference: string
          status?: Database["public"]["Enums"]["support_ticket_status"]
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          reference?: string
          status?: Database["public"]["Enums"]["support_ticket_status"]
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_entries: {
        Row: {
          amount_minor: number
          created_at: string
          direction: Database["public"]["Enums"]["wallet_entry_direction"]
          id: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          metadata: Json
          reference: string
          status: Database["public"]["Enums"]["wallet_entry_status"]
          wallet_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          direction: Database["public"]["Enums"]["wallet_entry_direction"]
          id?: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          metadata?: Json
          reference: string
          status?: Database["public"]["Enums"]["wallet_entry_status"]
          wallet_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          direction?: Database["public"]["Enums"]["wallet_entry_direction"]
          id?: string
          kind?: Database["public"]["Enums"]["wallet_entry_kind"]
          metadata?: Json
          reference?: string
          status?: Database["public"]["Enums"]["wallet_entry_status"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_balances"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "wallet_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      wallet_balances: {
        Row: {
          balance_minor: number | null
          currency: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          balance_minor?: never
          currency?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          balance_minor?: never
          currency?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_application_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "MORE_INFO_REQUIRED"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      agent_type: "individual" | "business"
      alert_severity: "low" | "medium" | "high"
      alert_status: "open" | "resolved"
      app_role: "user" | "agent" | "admin" | "super_admin"
      availability_status: "available" | "booked" | "unavailable"
      booking_status: "PENDING" | "CONFIRMED" | "CANCELLED"
      geopolitical_zone:
        | "north_central"
        | "north_east"
        | "north_west"
        | "south_east"
        | "south_south"
        | "south_west"
      listing_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "MORE_INFO_REQUIRED"
        | "APPROVED"
        | "PUBLISHED"
        | "REJECTED"
        | "SUSPENDED"
      locale: "en" | "yo" | "ha" | "ig"
      message_flag_reason: "account_number" | "payment_keyword"
      message_flag_status: "open" | "reviewed"
      notification_kind:
        | "booking"
        | "message"
        | "wallet"
        | "listing"
        | "agent"
        | "support"
        | "system"
      price_period: "night" | "year"
      property_type:
        | "apartment"
        | "hotel"
        | "home"
        | "villa"
        | "shortlet"
        | "rental"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      support_ticket_status: "open" | "pending" | "resolved" | "closed"
      transaction_status: "SUCCESSFUL" | "PENDING" | "FAILED" | "REFUNDED"
      wallet_entry_direction: "credit" | "debit"
      wallet_entry_kind:
        | "deposit"
        | "withdrawal"
        | "payment"
        | "refund"
        | "transfer_in"
        | "transfer_out"
      wallet_entry_status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED"
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
      agent_application_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "MORE_INFO_REQUIRED",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      agent_type: ["individual", "business"],
      alert_severity: ["low", "medium", "high"],
      alert_status: ["open", "resolved"],
      app_role: ["user", "agent", "admin", "super_admin"],
      availability_status: ["available", "booked", "unavailable"],
      booking_status: ["PENDING", "CONFIRMED", "CANCELLED"],
      geopolitical_zone: [
        "north_central",
        "north_east",
        "north_west",
        "south_east",
        "south_south",
        "south_west",
      ],
      listing_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "MORE_INFO_REQUIRED",
        "APPROVED",
        "PUBLISHED",
        "REJECTED",
        "SUSPENDED",
      ],
      locale: ["en", "yo", "ha", "ig"],
      message_flag_reason: ["account_number", "payment_keyword"],
      message_flag_status: ["open", "reviewed"],
      notification_kind: [
        "booking",
        "message",
        "wallet",
        "listing",
        "agent",
        "support",
        "system",
      ],
      price_period: ["night", "year"],
      property_type: [
        "apartment",
        "hotel",
        "home",
        "villa",
        "shortlet",
        "rental",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      support_ticket_status: ["open", "pending", "resolved", "closed"],
      transaction_status: ["SUCCESSFUL", "PENDING", "FAILED", "REFUNDED"],
      wallet_entry_direction: ["credit", "debit"],
      wallet_entry_kind: [
        "deposit",
        "withdrawal",
        "payment",
        "refund",
        "transfer_in",
        "transfer_out",
      ],
      wallet_entry_status: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
    },
  },
} as const
