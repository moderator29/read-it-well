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
      admin_bootstrap: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          note: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
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
      area_members: {
        Row: {
          area_id: string
          joined_at: string
          notify_utility: boolean
          residency_source:
            | Database["public"]["Enums"]["area_residency_source"]
            | null
          residency_verified_at: string | null
          role: Database["public"]["Enums"]["area_role"]
          user_id: string
          utility_weight: number
        }
        Insert: {
          area_id: string
          joined_at?: string
          notify_utility?: boolean
          residency_source?:
            | Database["public"]["Enums"]["area_residency_source"]
            | null
          residency_verified_at?: string | null
          role?: Database["public"]["Enums"]["area_role"]
          user_id: string
          utility_weight?: number
        }
        Update: {
          area_id?: string
          joined_at?: string
          notify_utility?: boolean
          residency_source?:
            | Database["public"]["Enums"]["area_residency_source"]
            | null
          residency_verified_at?: string | null
          role?: Database["public"]["Enums"]["area_role"]
          user_id?: string
          utility_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "area_members_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_moderator_applications: {
        Row: {
          area_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          reason: string
          status: Database["public"]["Enums"]["moderator_application_status"]
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["moderator_application_status"]
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["moderator_application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_moderator_applications_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          area: string | null
          blurb: string | null
          centre_lat: number | null
          centre_lng: number | null
          city: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          kind: Database["public"]["Enums"]["area_kind"]
          member_count: number
          name: string
          opened_at: string | null
          post_count: number
          slow_mode: boolean
          slug: string
          state_code: string
          status: Database["public"]["Enums"]["area_status"]
        }
        Insert: {
          area?: string | null
          blurb?: string | null
          centre_lat?: number | null
          centre_lng?: number | null
          city: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["area_kind"]
          member_count?: number
          name: string
          opened_at?: string | null
          post_count?: number
          slow_mode?: boolean
          slug: string
          state_code: string
          status?: Database["public"]["Enums"]["area_status"]
        }
        Update: {
          area?: string | null
          blurb?: string | null
          centre_lat?: number | null
          centre_lng?: number | null
          city?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["area_kind"]
          member_count?: number
          name?: string
          opened_at?: string | null
          post_count?: number
          slow_mode?: boolean
          slug?: string
          state_code?: string
          status?: Database["public"]["Enums"]["area_status"]
        }
        Relationships: [
          {
            foreignKeyName: "areas_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
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
      badges: {
        Row: {
          audience: Database["public"]["Enums"]["badge_audience"]
          code: string
          created_at: string
          description: string
          manual_only: boolean
          name: string
          object_name: string
          tier: number
        }
        Insert: {
          audience: Database["public"]["Enums"]["badge_audience"]
          code: string
          created_at?: string
          description: string
          manual_only?: boolean
          name: string
          object_name: string
          tier?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["badge_audience"]
          code?: string
          created_at?: string
          description?: string
          manual_only?: boolean
          name?: string
          object_name?: string
          tier?: number
        }
        Relationships: []
      }
      blocks: {
        Row: {
          created_at: string
          other_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          other_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          other_id?: string
          user_id?: string
        }
        Relationships: []
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
      bot_invocations: {
        Row: {
          answer: string | null
          area_id: string | null
          cost_minor: number
          created_at: string
          id: string
          input_tokens: number
          output_tokens: number
          post_id: string | null
          prompt: string
          refused_reason: string | null
          reply_post_id: string | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          area_id?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          input_tokens?: number
          output_tokens?: number
          post_id?: string | null
          prompt: string
          refused_reason?: string | null
          reply_post_id?: string | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          area_id?: string | null
          cost_minor?: number
          created_at?: string
          id?: string
          input_tokens?: number
          output_tokens?: number
          post_id?: string | null
          prompt?: string
          refused_reason?: string | null
          reply_post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_invocations_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_invocations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_invocations_reply_post_id_fkey"
            columns: ["reply_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      idempotency_records: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          key: string
          result: Json | null
          scope: string
          subject: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at: string
          key: string
          result?: Json | null
          scope: string
          subject: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          key?: string
          result?: Json | null
          scope?: string
          subject?: string
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
      mutes: {
        Row: {
          created_at: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: []
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
      places_cache: {
        Row: {
          city: string
          first_seen_at: string
          found_for: string
          last_seen_at: string
          place_id: string
        }
        Insert: {
          city: string
          first_seen_at?: string
          found_for: string
          last_seen_at?: string
          place_id: string
        }
        Update: {
          city?: string
          first_seen_at?: string
          found_for?: string
          last_seen_at?: string
          place_id?: string
        }
        Relationships: []
      }
      post_media: {
        Row: {
          created_at: string
          height: number | null
          id: string
          position: number
          post_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          post_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          post_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          mark: Database["public"]["Enums"]["post_mark"]
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mark: Database["public"]["Enums"]["post_mark"]
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mark?: Database["public"]["Enums"]["post_mark"]
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          area_id: string | null
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          post_id: string
          seen_on: string
          viewer_bucket: string
        }
        Insert: {
          post_id: string
          seen_on?: string
          viewer_bucket: string
        }
        Update: {
          post_id?: string
          seen_on?: string
          viewer_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_quotes: boolean
          area_id: string | null
          author_id: string | null
          author_kind: Database["public"]["Enums"]["post_author_kind"]
          body: string | null
          created_at: string
          depth: number
          edited_at: string | null
          hidden_by: string | null
          hold_reason: string | null
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          like_count: number
          listing_id: string | null
          parent_id: string | null
          payload: Json | null
          quoted_post_id: string | null
          removed_at: string | null
          reply_count: number
          repost_count: number
          root_id: string | null
          status: Database["public"]["Enums"]["social_status"]
          view_count: number
        }
        Insert: {
          allow_quotes?: boolean
          area_id?: string | null
          author_id?: string | null
          author_kind?: Database["public"]["Enums"]["post_author_kind"]
          body?: string | null
          created_at?: string
          depth?: number
          edited_at?: string | null
          hidden_by?: string | null
          hold_reason?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          like_count?: number
          listing_id?: string | null
          parent_id?: string | null
          payload?: Json | null
          quoted_post_id?: string | null
          removed_at?: string | null
          reply_count?: number
          repost_count?: number
          root_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          view_count?: number
        }
        Update: {
          allow_quotes?: boolean
          area_id?: string | null
          author_id?: string | null
          author_kind?: Database["public"]["Enums"]["post_author_kind"]
          body?: string | null
          created_at?: string
          depth?: number
          edited_at?: string | null
          hidden_by?: string | null
          hold_reason?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          like_count?: number
          listing_id?: string | null
          parent_id?: string | null
          payload?: Json | null
          quoted_post_id?: string | null
          removed_at?: string | null
          reply_count?: number
          repost_count?: number
          root_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          nickname: string | null
          phone: string | null
          settings: Json
          state_code: string | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          locale?: Database["public"]["Enums"]["locale"]
          nickname?: string | null
          phone?: string | null
          settings?: Json
          state_code?: string | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          nickname?: string | null
          phone?: string | null
          settings?: Json
          state_code?: string | null
          surname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          subject: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          subject: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
          author_label: string | null
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
          author_label?: string | null
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
          author_label?: string | null
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
      review_responses: {
        Row: {
          agent_id: string
          body: string
          created_at: string
          review_id: string
          updated_at: string
        }
        Insert: {
          agent_id?: string
          body: string
          created_at?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          body?: string
          created_at?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
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
      social_profiles: {
        Row: {
          avatar_path: string | null
          banner_path: string | null
          bio: string | null
          bio_status: Database["public"]["Enums"]["social_status"]
          contact_policy: string
          cover_path: string | null
          created_at: string
          display_label: string | null
          follower_count: number
          following_count: number
          handle: string
          handle_claimed_at: string
          home_area_id: string | null
          is_agent: boolean
          link: string | null
          pidgin_ok: boolean
          post_count: number
          pronouns: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          bio_status?: Database["public"]["Enums"]["social_status"]
          contact_policy?: string
          cover_path?: string | null
          created_at?: string
          display_label?: string | null
          follower_count?: number
          following_count?: number
          handle: string
          handle_claimed_at?: string
          home_area_id?: string | null
          is_agent?: boolean
          link?: string | null
          pidgin_ok?: boolean
          post_count?: number
          pronouns?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          bio_status?: Database["public"]["Enums"]["social_status"]
          contact_policy?: string
          cover_path?: string | null
          created_at?: string
          display_label?: string | null
          follower_count?: number
          following_count?: number
          handle?: string
          handle_claimed_at?: string
          home_area_id?: string | null
          is_agent?: boolean
          link?: string | null
          pidgin_ok?: boolean
          post_count?: number
          pronouns?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_home_area_id_fkey"
            columns: ["home_area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_badges: {
        Row: {
          badge_code: string
          evidence: Json | null
          granted_at: string
          granted_by: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          badge_code: string
          evidence?: Json | null
          granted_at?: string
          granted_by?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          badge_code?: string
          evidence?: Json | null
          granted_at?: string
          granted_by?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
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
      claim_idempotency: {
        Args: {
          key: string
          scope: string
          subject: string
          ttl_seconds: number
        }
        Returns: Json
      }
      consume_rate_limit: {
        Args: {
          bucket: string
          limit_count: number
          subject: string
          window_seconds: number
        }
        Returns: boolean
      }
      pay_booking_from_wallet: {
        Args: {
          payer: string
          payment_reference: string
          target_booking: string
        }
        Returns: Json
      }
      platform_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          listings: number
          cities: number
          states: number
          agents: number
        }[]
      }
      record_idempotency_result: {
        Args: { key: string; result: Json; scope: string; subject: string }
        Returns: boolean
      }
      release_idempotency: {
        Args: { key: string; scope: string; subject: string }
        Returns: boolean
      }
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
      area_kind: "CITY" | "AREA" | "ESTATE" | "CAMPUS"
      area_residency_source: "STAY" | "INVITE" | "PRESENCE" | "ADMIN"
      area_role: "MEMBER" | "RESIDENT" | "MODERATOR"
      area_status: "PROPOSED" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "REJECTED"
      availability_status: "available" | "booked" | "unavailable"
      badge_audience: "AGENT" | "MEMBER"
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
      moderator_application_status:
        | "PENDING"
        | "APPROVED"
        | "DECLINED"
        | "WITHDRAWN"
      notification_kind:
        | "booking"
        | "message"
        | "wallet"
        | "listing"
        | "agent"
        | "support"
        | "system"
        | "social"
      post_author_kind: "USER" | "BOT" | "SYSTEM"
      post_kind: "GIST" | "ASK" | "REPLY" | "SHOWCASE" | "SYSTEM"
      post_mark: "LIKE" | "SAVE"
      price_period: "night" | "year"
      property_type:
        | "apartment"
        | "hotel"
        | "home"
        | "villa"
        | "shortlet"
        | "rental"
        | "shop"
        | "office"
        | "land"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      social_status: "LIVE" | "HELD" | "REMOVED"
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
      area_kind: ["CITY", "AREA", "ESTATE", "CAMPUS"],
      area_residency_source: ["STAY", "INVITE", "PRESENCE", "ADMIN"],
      area_role: ["MEMBER", "RESIDENT", "MODERATOR"],
      area_status: ["PROPOSED", "ACTIVE", "PAUSED", "ARCHIVED", "REJECTED"],
      availability_status: ["available", "booked", "unavailable"],
      badge_audience: ["AGENT", "MEMBER"],
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
      moderator_application_status: [
        "PENDING",
        "APPROVED",
        "DECLINED",
        "WITHDRAWN",
      ],
      notification_kind: [
        "booking",
        "message",
        "wallet",
        "listing",
        "agent",
        "support",
        "system",
        "social",
      ],
      post_author_kind: ["USER", "BOT", "SYSTEM"],
      post_kind: ["GIST", "ASK", "REPLY", "SHOWCASE", "SYSTEM"],
      post_mark: ["LIKE", "SAVE"],
      price_period: ["night", "year"],
      property_type: [
        "apartment",
        "hotel",
        "home",
        "villa",
        "shortlet",
        "rental",
        "shop",
        "office",
        "land",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      social_status: ["LIVE", "HELD", "REMOVED"],
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
