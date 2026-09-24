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
      accommodation_amenities: {
        Row: {
          accommodation_id: string
          amenity_id: string
        }
        Insert: {
          accommodation_id: string
          amenity_id: string
        }
        Update: {
          accommodation_id?: string
          amenity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_amenities_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_photos: {
        Row: {
          accommodation_id: string
          created_at: string
          id: string
          position: number
          storage_path: string
        }
        Insert: {
          accommodation_id: string
          created_at?: string
          id?: string
          position?: number
          storage_path: string
        }
        Update: {
          accommodation_id?: string
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_photos_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodations: {
        Row: {
          address: string | null
          area: string | null
          business_id: string
          cancellation_policy_id: string | null
          check_in_from: string | null
          check_out_by: string | null
          city: string | null
          created_at: string
          description: string | null
          featured: boolean
          fulfilment: Database["public"]["Enums"]["fulfilment_mode"]
          house_rules: string | null
          id: string
          is_demo: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          published_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          slug: string
          source: Database["public"]["Enums"]["source_kind"]
          star_rating: number | null
          state_code: string | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          business_id: string
          cancellation_policy_id?: string | null
          check_in_from?: string | null
          check_out_by?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fulfilment?: Database["public"]["Enums"]["fulfilment_mode"]
          house_rules?: string | null
          id?: string
          is_demo?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug: string
          source?: Database["public"]["Enums"]["source_kind"]
          star_rating?: number | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          business_id?: string
          cancellation_policy_id?: string | null
          check_in_from?: string | null
          check_out_by?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fulfilment?: Database["public"]["Enums"]["fulfilment_mode"]
          house_rules?: string | null
          id?: string
          is_demo?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug?: string
          source?: Database["public"]["Enums"]["source_kind"]
          star_rating?: number | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_cancellation_policy_id_fkey"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          attempts: number
          cancelled_at: string | null
          completed_at: string | null
          counts: Json
          id: string
          last_error: string | null
          purge_after: string
          requested_at: string
          restore_code_hash: string | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          cancelled_at?: string | null
          completed_at?: string | null
          counts?: Json
          id?: string
          last_error?: string | null
          purge_after: string
          requested_at?: string
          restore_code_hash?: string | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          cancelled_at?: string | null
          completed_at?: string | null
          counts?: Json
          id?: string
          last_error?: string | null
          purge_after?: string
          requested_at?: string
          restore_code_hash?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_identities: {
        Row: {
          canonical_rule: string
          email_canonical: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          canonical_rule: string
          email_canonical: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          canonical_rule?: string
          email_canonical?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_bootstrap: {
        Row: {
          added_by: string | null
          claimed_at: string | null
          created_at: string
          email: string
          note: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          added_by?: string | null
          claimed_at?: string | null
          created_at?: string
          email: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          added_by?: string | null
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
          agency_fee_bps: number | null
          agree_terms: boolean
          area: string | null
          association_proof: string | null
          bank_name: string | null
          business_address: string | null
          business_email: string | null
          business_established_on: string | null
          business_name: string | null
          business_phone: string | null
          business_rc: string | null
          business_tax_id: string | null
          city: string | null
          created_at: string
          email: string | null
          firm_team: Json
          full_name: string | null
          id: string
          id_number: string | null
          id_type: string | null
          lasrera_number: string | null
          legal_fee_bps: number | null
          ownership_document: string | null
          phone: string | null
          principal_email: string | null
          reference: string
          residential_address: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          state_code: string | null
          status: Database["public"]["Enums"]["agent_application_status"]
          submitted_at: string | null
          supply_role: string | null
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
          user_id: string
          years_experience: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          agency_fee_bps?: number | null
          agree_terms?: boolean
          area?: string | null
          association_proof?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_email?: string | null
          business_established_on?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_rc?: string | null
          business_tax_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_team?: Json
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          lasrera_number?: string | null
          legal_fee_bps?: number | null
          ownership_document?: string | null
          phone?: string | null
          principal_email?: string | null
          reference?: string
          residential_address?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          submitted_at?: string | null
          supply_role?: string | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id: string
          years_experience?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          agency_fee_bps?: number | null
          agree_terms?: boolean
          area?: string | null
          association_proof?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_email?: string | null
          business_established_on?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_rc?: string | null
          business_tax_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_team?: Json
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          lasrera_number?: string | null
          legal_fee_bps?: number | null
          ownership_document?: string | null
          phone?: string | null
          principal_email?: string | null
          reference?: string
          residential_address?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          submitted_at?: string | null
          supply_role?: string | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id?: string
          years_experience?: string | null
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
      agent_badges: {
        Row: {
          agent_id: string
          tier: Database["public"]["Enums"]["badge_tier"]
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          agent_id: string
          tier?: Database["public"]["Enums"]["badge_tier"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          agent_id?: string
          tier?: Database["public"]["Enums"]["badge_tier"]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_badges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_documents: {
        Row: {
          application_id: string | null
          id: string
          issued_on: string | null
          kind: string
          listing_id: string | null
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["document_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          subtype: Database["public"]["Enums"]["document_subtype"] | null
          supersedes_id: string | null
          uploaded_at: string
          uploader_id: string | null
        }
        Insert: {
          application_id?: string | null
          id?: string
          issued_on?: string | null
          kind: string
          listing_id?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          subtype?: Database["public"]["Enums"]["document_subtype"] | null
          supersedes_id?: string | null
          uploaded_at?: string
          uploader_id?: string | null
        }
        Update: {
          application_id?: string | null
          id?: string
          issued_on?: string | null
          kind?: string
          listing_id?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          subtype?: Database["public"]["Enums"]["document_subtype"] | null
          supersedes_id?: string | null
          uploaded_at?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "agent_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_documents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "agent_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_suspensions: {
        Row: {
          agent_id: string
          id: string
          lift_note: string | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          restored: Json
          stays_ahead: number
          suspended_at: string
          suspended_by: string | null
          withdrawn: Json
        }
        Insert: {
          agent_id: string
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          restored?: Json
          stays_ahead?: number
          suspended_at?: string
          suspended_by?: string | null
          withdrawn?: Json
        }
        Update: {
          agent_id?: string
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          restored?: Json
          stays_ahead?: number
          suspended_at?: string
          suspended_by?: string | null
          withdrawn?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_suspensions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_verification_checks: {
        Row: {
          agent_id: string
          decided_at: string
          decided_by: string | null
          id: string
          kind: string
          note: string | null
          status: string
        }
        Insert: {
          agent_id: string
          decided_at?: string
          decided_by?: string | null
          id?: string
          kind: string
          note?: string | null
          status: string
        }
        Update: {
          agent_id?: string
          decided_at?: string
          decided_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_verification_checks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          application_id: string | null
          created_at: string
          display_name: string
          firm_id: string | null
          id: string
          is_demo: boolean
          role: Database["public"]["Enums"]["supply_role"]
          status: Database["public"]["Enums"]["agent_application_status"]
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
          user_id: string
          verification_tier: number
          verified: boolean
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          display_name: string
          firm_id?: string | null
          id?: string
          is_demo?: boolean
          role?: Database["public"]["Enums"]["supply_role"]
          status?: Database["public"]["Enums"]["agent_application_status"]
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id: string
          verification_tier?: number
          verified?: boolean
        }
        Update: {
          application_id?: string | null
          created_at?: string
          display_name?: string
          firm_id?: string | null
          id?: string
          is_demo?: boolean
          role?: Database["public"]["Enums"]["supply_role"]
          status?: Database["public"]["Enums"]["agent_application_status"]
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id?: string
          verification_tier?: number
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
          {
            foreignKeyName: "agents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
          lga_code: string | null
          member_count: number
          name: string
          opened_at: string | null
          post_count: number
          slow_mode: boolean
          slug: string
          state_code: string
          status: Database["public"]["Enums"]["area_status"]
          within_lga_code: string | null
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
          lga_code?: string | null
          member_count?: number
          name: string
          opened_at?: string | null
          post_count?: number
          slow_mode?: boolean
          slug: string
          state_code: string
          status?: Database["public"]["Enums"]["area_status"]
          within_lga_code?: string | null
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
          lga_code?: string | null
          member_count?: number
          name?: string
          opened_at?: string | null
          post_count?: number
          slow_mode?: boolean
          slug?: string
          state_code?: string
          status?: Database["public"]["Enums"]["area_status"]
          within_lga_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "areas_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "areas_within_lga_code_fkey"
            columns: ["within_lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
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
      bank_accounts: {
        Row: {
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          recipient_code: string | null
          resolved_account_name: string
          resolved_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          recipient_code?: string | null
          resolved_account_name: string
          resolved_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          recipient_code?: string | null
          resolved_account_name?: string
          resolved_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_terms: {
        Row: {
          category: string
          created_at: string
          reason: string
          severity: Database["public"]["Enums"]["alert_severity"]
          term: string
        }
        Insert: {
          category: string
          created_at?: string
          reason: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          term: string
        }
        Update: {
          category?: string
          created_at?: string
          reason?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          term?: string
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
      booking_refunds: {
        Row: {
          booking_id: string
          created_at: string
          decided_by: string | null
          guest_id: string
          id: string
          note: string | null
          paid_minor: number
          reason: string
          refund_minor: number
          retained_minor: number
          wallet_entry_id: string | null
          wallet_reference: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          decided_by?: string | null
          guest_id: string
          id?: string
          note?: string | null
          paid_minor: number
          reason: string
          refund_minor: number
          retained_minor: number
          wallet_entry_id?: string | null
          wallet_reference?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          decided_by?: string | null
          guest_id?: string
          id?: string
          note?: string | null
          paid_minor?: number
          reason?: string
          refund_minor?: number
          retained_minor?: number
          wallet_entry_id?: string | null
          wallet_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_refunds_wallet_entry_id_fkey"
            columns: ["wallet_entry_id"]
            isOneToOne: false
            referencedRelation: "wallet_entries"
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
          guest_email: string | null
          guest_id: string
          guest_name: string | null
          guest_phone: string | null
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
          guest_email?: string | null
          guest_id: string
          guest_name?: string | null
          guest_phone?: string | null
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
          guest_email?: string | null
          guest_id?: string
          guest_name?: string | null
          guest_phone?: string | null
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
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
      bot_settings: {
        Row: {
          daily_ceiling_minor: number
          enabled: boolean
          id: boolean
          model: string
          monthly_ceiling_minor: number
          per_person_daily: number
          updated_at: string
        }
        Insert: {
          daily_ceiling_minor?: number
          enabled?: boolean
          id?: boolean
          model?: string
          monthly_ceiling_minor?: number
          per_person_daily?: number
          updated_at?: string
        }
        Update: {
          daily_ceiling_minor?: number
          enabled?: boolean
          id?: boolean
          model?: string
          monthly_ceiling_minor?: number
          per_person_daily?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_documents: {
        Row: {
          business_id: string
          id: string
          kind: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          business_id: string
          id?: string
          kind: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          business_id?: string
          id?: string
          kind?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          business_id: string
          created_at: string
          id: string
          position: number
          storage_path: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          position?: number
          storage_path: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_transfers: {
        Row: {
          business_id: string
          expires_at: string
          from_user_id: string
          id: string
          note: string | null
          offered_at: string
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          business_id: string
          expires_at: string
          from_user_id: string
          id?: string
          note?: string | null
          offered_at?: string
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          business_id?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          note?: string | null
          offered_at?: string
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_verification_checks: {
        Row: {
          business_id: string
          decided_at: string
          id: string
          note: string | null
          reviewer_id: string | null
          rung: string
          status: string
        }
        Insert: {
          business_id: string
          decided_at?: string
          id?: string
          note?: string | null
          reviewer_id?: string | null
          rung: string
          status: string
        }
        Update: {
          business_id?: string
          decided_at?: string
          id?: string
          note?: string | null
          reviewer_id?: string | null
          rung?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_verification_checks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          agent_id: string | null
          area: string | null
          cac_number: string | null
          city: string | null
          consents: Json
          created_at: string
          description: string | null
          email: string | null
          host_type: string | null
          hygiene_attested_at: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["business_kind"]
          latitude: number | null
          licence_attested_at: string | null
          location: unknown
          longitude: number | null
          name: string
          owner_id: string | null
          phone: string | null
          published_at: string | null
          registered_name: string | null
          representative_name: string | null
          representative_phone: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          slug: string
          source: Database["public"]["Enums"]["source_kind"]
          state_code: string | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          tin: string | null
          updated_at: string
          verification_tier: number
          verified: boolean
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          area?: string | null
          cac_number?: string | null
          city?: string | null
          consents?: Json
          created_at?: string
          description?: string | null
          email?: string | null
          host_type?: string | null
          hygiene_attested_at?: string | null
          id?: string
          is_demo?: boolean
          kind: Database["public"]["Enums"]["business_kind"]
          latitude?: number | null
          licence_attested_at?: string | null
          location?: unknown
          longitude?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          published_at?: string | null
          registered_name?: string | null
          representative_name?: string | null
          representative_phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug: string
          source?: Database["public"]["Enums"]["source_kind"]
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          tin?: string | null
          updated_at?: string
          verification_tier?: number
          verified?: boolean
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          area?: string | null
          cac_number?: string | null
          city?: string | null
          consents?: Json
          created_at?: string
          description?: string | null
          email?: string | null
          host_type?: string | null
          hygiene_attested_at?: string | null
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["business_kind"]
          latitude?: number | null
          licence_attested_at?: string | null
          location?: unknown
          longitude?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          published_at?: string | null
          registered_name?: string | null
          representative_name?: string | null
          representative_phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          slug?: string
          source?: Database["public"]["Enums"]["source_kind"]
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          tin?: string | null
          updated_at?: string
          verification_tier?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "businesses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          id: string
          is_free_until_hours: number | null
          name: string
          refund_to: string
          rules: Json
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_free_until_hours?: number | null
          name: string
          refund_to?: string
          rules?: Json
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_free_until_hours?: number | null
          name?: string
          refund_to?: string
          rules?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalogue_entries: {
        Row: {
          amenity_codes: string[]
          area: string | null
          city: string | null
          cover_path: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["catalogue_entity_kind"]
          featured: boolean
          has_breakfast: boolean
          has_free_cancellation: boolean
          headline_price_minor: number | null
          headline_price_period: string | null
          id: string
          is_demo: boolean
          kind: string
          latitude: number | null
          location: unknown
          longitude: number | null
          max_sleeps: number | null
          price_band: number | null
          published_at: string | null
          rating_avg: number | null
          rating_count: number
          room_categories: Database["public"]["Enums"]["room_category"][]
          search: unknown
          source: Database["public"]["Enums"]["source_kind"]
          state_code: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          amenity_codes?: string[]
          area?: string | null
          city?: string | null
          cover_path?: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["catalogue_entity_kind"]
          featured?: boolean
          has_breakfast?: boolean
          has_free_cancellation?: boolean
          headline_price_minor?: number | null
          headline_price_period?: string | null
          id?: string
          is_demo?: boolean
          kind: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          max_sleeps?: number | null
          price_band?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          room_categories?: Database["public"]["Enums"]["room_category"][]
          search?: unknown
          source: Database["public"]["Enums"]["source_kind"]
          state_code?: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          amenity_codes?: string[]
          area?: string | null
          city?: string | null
          cover_path?: string | null
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["catalogue_entity_kind"]
          featured?: boolean
          has_breakfast?: boolean
          has_free_cancellation?: boolean
          headline_price_minor?: number | null
          headline_price_period?: string | null
          id?: string
          is_demo?: boolean
          kind?: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          max_sleeps?: number | null
          price_band?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          room_categories?: Database["public"]["Enums"]["room_category"][]
          search?: unknown
          source?: Database["public"]["Enums"]["source_kind"]
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          booking_id: string | null
          context_kind: Database["public"]["Enums"]["thread_context"]
          created_at: string
          guest_id: string
          id: string
          last_message_at: string
          listing_id: string | null
          reservation_id: string | null
        }
        Insert: {
          agent_id: string
          booking_id?: string | null
          context_kind?: Database["public"]["Enums"]["thread_context"]
          created_at?: string
          guest_id: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          reservation_id?: string | null
        }
        Update: {
          agent_id?: string
          booking_id?: string | null
          context_kind?: Database["public"]["Enums"]["thread_context"]
          created_at?: string
          guest_id?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          available_at: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string
          id: string
          last_error: string | null
          payload: Json
          settled_at: string | null
          status: string
          template: string
          user_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          last_error?: string | null
          payload?: Json
          settled_at?: string | null
          status?: string
          template: string
          user_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          last_error?: string | null
          payload?: Json
          settled_at?: string | null
          status?: string
          template?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_evidence: {
        Row: {
          amount_minor: number | null
          author_id: string
          caption: string | null
          created_at: string
          escrow_id: string
          fact: Database["public"]["Enums"]["escrow_fact"] | null
          file_name: string | null
          happened_on: string | null
          id: string
          kind: Database["public"]["Enums"]["escrow_evidence_kind"]
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          amount_minor?: number | null
          author_id: string
          caption?: string | null
          created_at?: string
          escrow_id: string
          fact?: Database["public"]["Enums"]["escrow_fact"] | null
          file_name?: string | null
          happened_on?: string | null
          id?: string
          kind: Database["public"]["Enums"]["escrow_evidence_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          amount_minor?: number | null
          author_id?: string
          caption?: string | null
          created_at?: string
          escrow_id?: string
          fact?: Database["public"]["Enums"]["escrow_fact"] | null
          file_name?: string | null
          happened_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["escrow_evidence_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_evidence_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_float_snapshots: {
        Row: {
          as_of: string
          commission_booked_minor: number
          components: Json
          created_at: string
          currency: string
          difference_minor: number
          escrow_count: number
          float_minor: number
          id: string
          ledger_float_minor: number
          taken_at: string
        }
        Insert: {
          as_of: string
          commission_booked_minor: number
          components?: Json
          created_at?: string
          currency?: string
          difference_minor: number
          escrow_count: number
          float_minor: number
          id?: string
          ledger_float_minor: number
          taken_at?: string
        }
        Update: {
          as_of?: string
          commission_booked_minor?: number
          components?: Json
          created_at?: string
          currency?: string
          difference_minor?: number
          escrow_count?: number
          float_minor?: number
          id?: string
          ledger_float_minor?: number
          taken_at?: string
        }
        Relationships: []
      }
      escrows: {
        Row: {
          amount_minor: number
          auto_release_at: string | null
          commission_minor: number | null
          commission_rate_id: string | null
          conversation_id: string | null
          created_at: string
          currency: string
          dispute_reason: string | null
          disputed_at: string | null
          disputed_by: string | null
          funded_at: string | null
          held_at: string | null
          id: string
          initiated_at: string
          inspection_confirmation_id: string | null
          listing_id: string | null
          opened_by: string | null
          payee_confirmed_at: string | null
          payee_id: string
          payer_confirmed_at: string | null
          payer_id: string
          purpose: Database["public"]["Enums"]["escrow_purpose"]
          refunded_at: string | null
          release_requested_at: string | null
          release_requested_by: string | null
          released_at: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          state: Database["public"]["Enums"]["escrow_state"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          auto_release_at?: string | null
          commission_minor?: number | null
          commission_rate_id?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          funded_at?: string | null
          held_at?: string | null
          id?: string
          initiated_at?: string
          inspection_confirmation_id?: string | null
          listing_id?: string | null
          opened_by?: string | null
          payee_confirmed_at?: string | null
          payee_id: string
          payer_confirmed_at?: string | null
          payer_id: string
          purpose: Database["public"]["Enums"]["escrow_purpose"]
          refunded_at?: string | null
          release_requested_at?: string | null
          release_requested_by?: string | null
          released_at?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: Database["public"]["Enums"]["escrow_state"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          auto_release_at?: string | null
          commission_minor?: number | null
          commission_rate_id?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          funded_at?: string | null
          held_at?: string | null
          id?: string
          initiated_at?: string
          inspection_confirmation_id?: string | null
          listing_id?: string | null
          opened_by?: string | null
          payee_confirmed_at?: string | null
          payee_id?: string
          payer_confirmed_at?: string | null
          payer_id?: string
          purpose?: Database["public"]["Enums"]["escrow_purpose"]
          refunded_at?: string | null
          release_requested_at?: string | null
          release_requested_by?: string | null
          released_at?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: Database["public"]["Enums"]["escrow_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_commission_rate_id_fkey"
            columns: ["commission_rate_id"]
            isOneToOne: false
            referencedRelation: "fee_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_inspection_confirmation_id_fkey"
            columns: ["inspection_confirmation_id"]
            isOneToOne: false
            referencedRelation: "inspection_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "escrows_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          decided_at: string | null
          event_id: string
          joined_at: string
          state: Database["public"]["Enums"]["event_attendance"]
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          event_id: string
          joined_at?: string
          state?: Database["public"]["Enums"]["event_attendance"]
          user_id: string
        }
        Update: {
          decided_at?: string | null
          event_id?: string
          joined_at?: string
          state?: Database["public"]["Enums"]["event_attendance"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          area_id: string
          attending_count: number
          blurb: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          capacity: number | null
          created_at: string
          edited_at: string | null
          ends_at: string | null
          hidden_by: string | null
          hold_reason: string | null
          host_id: string
          id: string
          post_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          venue_kind: Database["public"]["Enums"]["event_venue_kind"]
          venue_label: string
        }
        Insert: {
          area_id: string
          attending_count?: number
          blurb?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity?: number | null
          created_at?: string
          edited_at?: string | null
          ends_at?: string | null
          hidden_by?: string | null
          hold_reason?: string | null
          host_id: string
          id?: string
          post_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          venue_kind: Database["public"]["Enums"]["event_venue_kind"]
          venue_label: string
        }
        Update: {
          area_id?: string
          attending_count?: number
          blurb?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity?: number | null
          created_at?: string
          edited_at?: string | null
          ends_at?: string | null
          hidden_by?: string | null
          hold_reason?: string | null
          host_id?: string
          id?: string
          post_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          venue_kind?: Database["public"]["Enums"]["event_venue_kind"]
          venue_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
      fee_rates: {
        Row: {
          basis_points: number
          created_at: string
          created_by: string | null
          effective_from: string
          flat_minor: number
          id: string
          kind: Database["public"]["Enums"]["fee_kind"]
          note: string | null
        }
        Insert: {
          basis_points?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          flat_minor?: number
          id?: string
          kind: Database["public"]["Enums"]["fee_kind"]
          note?: string | null
        }
        Update: {
          basis_points?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          flat_minor?: number
          id?: string
          kind?: Database["public"]["Enums"]["fee_kind"]
          note?: string | null
        }
        Relationships: []
      }
      firm_members: {
        Row: {
          admitted_at: string
          admitted_by: string | null
          agent_id: string
          firm_id: string
          id: string
          member_role: string
          revoke_note: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
        }
        Insert: {
          admitted_at?: string
          admitted_by?: string | null
          agent_id: string
          firm_id: string
          id?: string
          member_role?: string
          revoke_note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Update: {
          admitted_at?: string
          admitted_by?: string | null
          agent_id?: string
          firm_id?: string
          id?: string
          member_role?: string
          revoke_note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
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
      inspection_report_items: {
        Row: {
          checked: boolean
          checked_at: string | null
          inspection_id: string
          item: string
          note: string | null
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          inspection_id: string
          item: string
          note?: string | null
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          inspection_id?: string
          item?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_report_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["inspection_id"]
          },
        ]
      }
      inspection_report_photos: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          item: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          item?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          item?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_report_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["inspection_id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          author_id: string
          created_at: string
          inspection_id: string
          notes: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          inspection_id: string
          notes?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          inspection_id?: string
          notes?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_requests: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          lister_id: string
          lister_note: string | null
          listing_id: string
          note: string | null
          outcome: string | null
          requested_at: string
          requester_id: string
          responded_at: string | null
          slot_at: string | null
          state: Database["public"]["Enums"]["inspection_state"]
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          lister_id: string
          lister_note?: string | null
          listing_id: string
          note?: string | null
          outcome?: string | null
          requested_at: string
          requester_id: string
          responded_at?: string | null
          slot_at?: string | null
          state?: Database["public"]["Enums"]["inspection_state"]
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          lister_id?: string
          lister_note?: string | null
          listing_id?: string
          note?: string | null
          outcome?: string | null
          requested_at?: string
          requester_id?: string
          responded_at?: string | null
          slot_at?: string | null
          state?: Database["public"]["Enums"]["inspection_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "inspection_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      known_devices: {
        Row: {
          device_words: string | null
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          device_words?: string | null
          fingerprint: string
          first_seen_at?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          device_words?: string | null
          fingerprint?: string
          first_seen_at?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landmarks: {
        Row: {
          aliases: string[]
          city: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["landmark_kind"]
          latitude: number
          location: unknown
          longitude: number
          name: string
          slug: string
          source: Database["public"]["Enums"]["source_kind"]
          state_code: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          city: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["landmark_kind"]
          latitude: number
          location?: unknown
          longitude: number
          name: string
          slug: string
          source?: Database["public"]["Enums"]["source_kind"]
          state_code: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          city?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["landmark_kind"]
          latitude?: number
          location?: unknown
          longitude?: number
          name?: string
          slug?: string
          source?: Database["public"]["Enums"]["source_kind"]
          state_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landmarks_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
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
      listing_access: {
        Row: {
          access_code: string | null
          estate_name: string | null
          gate_directions: string | null
          listing_id: string
          security_phone: string | null
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          estate_name?: string | null
          gate_directions?: string | null
          listing_id: string
          security_phone?: string | null
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          estate_name?: string | null
          gate_directions?: string | null
          listing_id?: string
          security_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_access_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_access_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
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
      listing_mandates: {
        Row: {
          created_at: string
          document_id: string | null
          exclusive: boolean | null
          expires_on: string | null
          id: string
          kind: string
          listing_id: string
          principal_name: string
          principal_phone: string | null
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["document_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          signed_on: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          exclusive?: boolean | null
          expires_on?: string | null
          id?: string
          kind: string
          listing_id: string
          principal_name: string
          principal_phone?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_on?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          exclusive?: boolean | null
          expires_on?: string | null
          id?: string
          kind?: string
          listing_id?: string
          principal_name?: string
          principal_phone?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_mandates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_mandates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_mandates_listing_id_fkey"
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          listing_id: string
          position: number
          poster_path: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          listing_id: string
          position?: number
          poster_path?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          listing_id?: string
          position?: number
          poster_path?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_videos_listing_id_fkey"
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
          address_verified_at: string | null
          agency_fee_minor: number | null
          agent_id: string
          agreement_fee_minor: number | null
          area: string | null
          available_from: string | null
          bathrooms: number
          bedrooms: number
          caution_deposit_minor: number | null
          city: string | null
          condition: Database["public"]["Enums"]["build_condition"] | null
          created_at: string
          demo_retire_after: string | null
          description: string | null
          featured: boolean
          firm_id: string | null
          floor: number | null
          furnished: Database["public"]["Enums"]["furnishing"] | null
          governors_consent_fee_minor: number | null
          has_estate_access: boolean
          id: string
          is_demo: boolean
          landmark: string | null
          latitude: number | null
          legal_fee_minor: number | null
          listing_fee_charged_at: string | null
          listing_fee_minor: number | null
          listing_fee_rate_id: string | null
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          listing_role: Database["public"]["Enums"]["listing_role"]
          location: unknown
          longitude: number | null
          mandate_verified_at: string | null
          minimum_tenancy_months: number | null
          ownership_verified_at: string | null
          parking_spaces: number | null
          physically_inspected_at: string | null
          power_backup: Database["public"]["Enums"]["power_backup"] | null
          power_backup_hours: number | null
          power_grid: Database["public"]["Enums"]["power_grid"] | null
          prepaid_meter: boolean | null
          price_negotiable: boolean
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          rate_minor: number
          rate_period: Database["public"]["Enums"]["rate_period"] | null
          reference: string | null
          rent_amount_minor: number | null
          rent_negotiable: boolean
          rent_period: Database["public"]["Enums"]["rent_period"] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          sale_agency_fee_minor: number | null
          sale_legal_fee_minor: number | null
          sale_price_minor: number | null
          sale_status: Database["public"]["Enums"]["sale_status"] | null
          service_charge_minor: number | null
          service_charge_period:
            | Database["public"]["Enums"]["rent_period"]
            | null
          size_sqm: number | null
          stamp_duty_minor: number | null
          state_code: string | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          supply_verified_by: string | null
          survey_registration_fee_minor: number | null
          tenure: Database["public"]["Enums"]["land_tenure"] | null
          title: string
          toilets: number | null
          total_floors: number | null
          total_move_in_cost_minor: number | null
          total_purchase_cost_minor: number | null
          updated_at: string
          verified_by: string | null
          water_supply: Database["public"]["Enums"]["water_supply"] | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          address_verified_at?: string | null
          agency_fee_minor?: number | null
          agent_id: string
          agreement_fee_minor?: number | null
          area?: string | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          caution_deposit_minor?: number | null
          city?: string | null
          condition?: Database["public"]["Enums"]["build_condition"] | null
          created_at?: string
          demo_retire_after?: string | null
          description?: string | null
          featured?: boolean
          firm_id?: string | null
          floor?: number | null
          furnished?: Database["public"]["Enums"]["furnishing"] | null
          governors_consent_fee_minor?: number | null
          has_estate_access?: boolean
          id?: string
          is_demo?: boolean
          landmark?: string | null
          latitude?: number | null
          legal_fee_minor?: number | null
          listing_fee_charged_at?: string | null
          listing_fee_minor?: number | null
          listing_fee_rate_id?: string | null
          listing_intent?: Database["public"]["Enums"]["listing_intent"]
          listing_role: Database["public"]["Enums"]["listing_role"]
          location?: unknown
          longitude?: number | null
          mandate_verified_at?: string | null
          minimum_tenancy_months?: number | null
          ownership_verified_at?: string | null
          parking_spaces?: number | null
          physically_inspected_at?: string | null
          power_backup?: Database["public"]["Enums"]["power_backup"] | null
          power_backup_hours?: number | null
          power_grid?: Database["public"]["Enums"]["power_grid"] | null
          prepaid_meter?: boolean | null
          price_negotiable?: boolean
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rate_minor?: number
          rate_period?: Database["public"]["Enums"]["rate_period"] | null
          reference?: string | null
          rent_amount_minor?: number | null
          rent_negotiable?: boolean
          rent_period?: Database["public"]["Enums"]["rent_period"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sale_agency_fee_minor?: number | null
          sale_legal_fee_minor?: number | null
          sale_price_minor?: number | null
          sale_status?: Database["public"]["Enums"]["sale_status"] | null
          service_charge_minor?: number | null
          service_charge_period?:
            | Database["public"]["Enums"]["rent_period"]
            | null
          size_sqm?: number | null
          stamp_duty_minor?: number | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          supply_verified_by?: string | null
          survey_registration_fee_minor?: number | null
          tenure?: Database["public"]["Enums"]["land_tenure"] | null
          title: string
          toilets?: number | null
          total_floors?: number | null
          total_move_in_cost_minor?: number | null
          total_purchase_cost_minor?: number | null
          updated_at?: string
          verified_by?: string | null
          water_supply?: Database["public"]["Enums"]["water_supply"] | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          address_verified_at?: string | null
          agency_fee_minor?: number | null
          agent_id?: string
          agreement_fee_minor?: number | null
          area?: string | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          caution_deposit_minor?: number | null
          city?: string | null
          condition?: Database["public"]["Enums"]["build_condition"] | null
          created_at?: string
          demo_retire_after?: string | null
          description?: string | null
          featured?: boolean
          firm_id?: string | null
          floor?: number | null
          furnished?: Database["public"]["Enums"]["furnishing"] | null
          governors_consent_fee_minor?: number | null
          has_estate_access?: boolean
          id?: string
          is_demo?: boolean
          landmark?: string | null
          latitude?: number | null
          legal_fee_minor?: number | null
          listing_fee_charged_at?: string | null
          listing_fee_minor?: number | null
          listing_fee_rate_id?: string | null
          listing_intent?: Database["public"]["Enums"]["listing_intent"]
          listing_role?: Database["public"]["Enums"]["listing_role"]
          location?: unknown
          longitude?: number | null
          mandate_verified_at?: string | null
          minimum_tenancy_months?: number | null
          ownership_verified_at?: string | null
          parking_spaces?: number | null
          physically_inspected_at?: string | null
          power_backup?: Database["public"]["Enums"]["power_backup"] | null
          power_backup_hours?: number | null
          power_grid?: Database["public"]["Enums"]["power_grid"] | null
          prepaid_meter?: boolean | null
          price_negotiable?: boolean
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rate_minor?: number
          rate_period?: Database["public"]["Enums"]["rate_period"] | null
          reference?: string | null
          rent_amount_minor?: number | null
          rent_negotiable?: boolean
          rent_period?: Database["public"]["Enums"]["rent_period"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sale_agency_fee_minor?: number | null
          sale_legal_fee_minor?: number | null
          sale_price_minor?: number | null
          sale_status?: Database["public"]["Enums"]["sale_status"] | null
          service_charge_minor?: number | null
          service_charge_period?:
            | Database["public"]["Enums"]["rent_period"]
            | null
          size_sqm?: number | null
          stamp_duty_minor?: number | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          supply_verified_by?: string | null
          survey_registration_fee_minor?: number | null
          tenure?: Database["public"]["Enums"]["land_tenure"] | null
          title?: string
          toilets?: number | null
          total_floors?: number | null
          total_move_in_cost_minor?: number | null
          total_purchase_cost_minor?: number | null
          updated_at?: string
          verified_by?: string | null
          water_supply?: Database["public"]["Enums"]["water_supply"] | null
          year_built?: number | null
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
            foreignKeyName: "listings_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_listing_fee_rate_id_fkey"
            columns: ["listing_fee_rate_id"]
            isOneToOne: false
            referencedRelation: "fee_rates"
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
      local_governments: {
        Row: {
          code: string
          name: string
          state_code: string
        }
        Insert: {
          code: string
          name: string
          state_code: string
        }
        Update: {
          code?: string
          name?: string
          state_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_governments_state_code_fkey"
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
          reviewed_by: string | null
          status: Database["public"]["Enums"]["message_flag_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          matched: string
          message_id: string
          reason: Database["public"]["Enums"]["message_flag_reason"]
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["message_flag_status"]
        }
        Update: {
          created_at?: string
          id?: string
          matched?: string
          message_id?: string
          reason?: Database["public"]["Enums"]["message_flag_reason"]
          reviewed_by?: string | null
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
      occupations: {
        Row: {
          category: string
          code: string
          common_rank: number | null
          name: string
          sort_order: number
        }
        Insert: {
          category: string
          code: string
          common_rank?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          code?: string
          common_rank?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          authorization_code: string
          bank: string | null
          bin: string | null
          card_type: string | null
          channel: string | null
          created_at: string
          deleted_at: string | null
          email_used: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          provider: string
          reusable: boolean
          signature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authorization_code: string
          bank?: string | null
          bin?: string | null
          card_type?: string | null
          channel?: string | null
          created_at?: string
          deleted_at?: string | null
          email_used: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          reusable: boolean
          signature: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authorization_code?: string
          bank?: string | null
          bin?: string | null
          card_type?: string | null
          channel?: string | null
          created_at?: string
          deleted_at?: string | null
          email_used?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          reusable?: boolean
          signature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_name: string
          account_number: string
          agent_id: string
          bank_code: string | null
          bank_name: string
          created_at: string
          id: string
          is_default: boolean
          recipient_code: string | null
          resolved_account_name: string | null
          resolved_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          agent_id: string
          bank_code?: string | null
          bank_name: string
          created_at?: string
          id?: string
          is_default?: boolean
          recipient_code?: string | null
          resolved_account_name?: string | null
          resolved_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          agent_id?: string
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          is_default?: boolean
          recipient_code?: string | null
          resolved_account_name?: string | null
          resolved_at?: string | null
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
      platform_revenue: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          escrow_id: string | null
          id: string
          listing_id: string | null
          metadata: Json
          rate_id: string | null
          reference: string
          source: Database["public"]["Enums"]["revenue_source"]
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          escrow_id?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json
          rate_id?: string | null
          reference: string
          source: Database["public"]["Enums"]["revenue_source"]
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          escrow_id?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json
          rate_id?: string | null
          reference?: string
          source?: Database["public"]["Enums"]["revenue_source"]
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "platform_revenue_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "fee_rates"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
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
      price_check_events: {
        Row: {
          bedrooms: number | null
          check_id: string
          comparable_count: number | null
          confidence: string | null
          created_at: string
          dispersion: number | null
          entry_point: string | null
          geohash5: string | null
          id: string
          intent_chosen: string | null
          lga_code: string | null
          listing_id: string | null
          listing_intent: Database["public"]["Enums"]["listing_intent"] | null
          outcome: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          radius_m: number | null
          refusal_code: string | null
          size_stated: boolean | null
          stage: string
          state_code: string | null
          user_id: string | null
        }
        Insert: {
          bedrooms?: number | null
          check_id: string
          comparable_count?: number | null
          confidence?: string | null
          created_at?: string
          dispersion?: number | null
          entry_point?: string | null
          geohash5?: string | null
          id?: string
          intent_chosen?: string | null
          lga_code?: string | null
          listing_id?: string | null
          listing_intent?: Database["public"]["Enums"]["listing_intent"] | null
          outcome?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          radius_m?: number | null
          refusal_code?: string | null
          size_stated?: boolean | null
          stage: string
          state_code?: string | null
          user_id?: string | null
        }
        Update: {
          bedrooms?: number | null
          check_id?: string
          comparable_count?: number | null
          confidence?: string | null
          created_at?: string
          dispersion?: number | null
          entry_point?: string | null
          geohash5?: string | null
          id?: string
          intent_chosen?: string | null
          lga_code?: string | null
          listing_id?: string | null
          listing_intent?: Database["public"]["Enums"]["listing_intent"] | null
          outcome?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          radius_m?: number | null
          refusal_code?: string | null
          size_stated?: boolean | null
          stage?: string
          state_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_check_events_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "price_check_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "price_check_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_check_events_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      price_check_shares: {
        Row: {
          area: string | null
          bedrooms: number | null
          created_at: string
          created_by: string | null
          high_minor: number
          id: string
          lga_code: string | null
          listing_count: number
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          low_minor: number
          mid_minor: number
          newest_at: string | null
          oldest_at: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          scope: Database["public"]["Enums"]["price_check_share_scope"]
          state_code: string
        }
        Insert: {
          area?: string | null
          bedrooms?: number | null
          created_at?: string
          created_by?: string | null
          high_minor: number
          id?: string
          lga_code?: string | null
          listing_count: number
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          low_minor: number
          mid_minor: number
          newest_at?: string | null
          oldest_at?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          scope: Database["public"]["Enums"]["price_check_share_scope"]
          state_code: string
        }
        Update: {
          area?: string | null
          bedrooms?: number | null
          created_at?: string
          created_by?: string | null
          high_minor?: number
          id?: string
          lga_code?: string | null
          listing_count?: number
          listing_intent?: Database["public"]["Enums"]["listing_intent"]
          low_minor?: number
          mid_minor?: number
          newest_at?: string | null
          oldest_at?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          scope?: Database["public"]["Enums"]["price_check_share_scope"]
          state_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_check_shares_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "price_check_shares_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      price_check_watches: {
        Row: {
          answered_at: string | null
          area: string | null
          bedrooms: number | null
          checked_at: string | null
          created_at: string
          id: string
          lat: number
          lga_code: string | null
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          lng: number
          notified_at: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          state_code: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          area?: string | null
          bedrooms?: number | null
          checked_at?: string | null
          created_at?: string
          id?: string
          lat: number
          lga_code?: string | null
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          lng: number
          notified_at?: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          state_code?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          area?: string | null
          bedrooms?: number | null
          checked_at?: string | null
          created_at?: string
          id?: string
          lat?: number
          lga_code?: string | null
          listing_intent?: Database["public"]["Enums"]["listing_intent"]
          lng?: number
          notified_at?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          state_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_check_watches_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "price_check_watches_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
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
          interests: Database["public"]["Enums"]["property_type"][]
          lga_code: string | null
          locale: Database["public"]["Enums"]["locale"]
          nickname: string | null
          occupation_code: string | null
          phone: string | null
          settings: Json
          signup_role: Database["public"]["Enums"]["signup_role"] | null
          state_code: string | null
          surname: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          welcomed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          interests?: Database["public"]["Enums"]["property_type"][]
          lga_code?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          nickname?: string | null
          occupation_code?: string | null
          phone?: string | null
          settings?: Json
          signup_role?: Database["public"]["Enums"]["signup_role"] | null
          state_code?: string | null
          surname?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          welcomed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          interests?: Database["public"]["Enums"]["property_type"][]
          lga_code?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          nickname?: string | null
          occupation_code?: string | null
          phone?: string | null
          settings?: Json
          signup_role?: Database["public"]["Enums"]["signup_role"] | null
          state_code?: string | null
          surname?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          welcomed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "local_governments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_occupation_code_fkey"
            columns: ["occupation_code"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      push_deliveries: {
        Row: {
          attempted_at: string
          attempts: number
          device_ref: string
          id: string
          platform: Database["public"]["Enums"]["push_platform"]
          provider_error: string | null
          provider_message_id: string | null
          provider_status: number | null
          queue_id: string
          settled_at: string | null
          state: Database["public"]["Enums"]["push_delivery_state"]
          token_id: string
        }
        Insert: {
          attempted_at?: string
          attempts?: number
          device_ref: string
          id?: string
          platform: Database["public"]["Enums"]["push_platform"]
          provider_error?: string | null
          provider_message_id?: string | null
          provider_status?: number | null
          queue_id: string
          settled_at?: string | null
          state?: Database["public"]["Enums"]["push_delivery_state"]
          token_id: string
        }
        Update: {
          attempted_at?: string
          attempts?: number
          device_ref?: string
          id?: string
          platform?: Database["public"]["Enums"]["push_platform"]
          provider_error?: string | null
          provider_message_id?: string | null
          provider_status?: number | null
          queue_id?: string
          settled_at?: string | null
          state?: Database["public"]["Enums"]["push_delivery_state"]
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "push_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "push_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      push_queue: {
        Row: {
          attempts: number
          claim_token: string | null
          claimed_at: string | null
          collapsed_into: string | null
          created_at: string
          expires_at: string
          id: string
          last_error: string | null
          not_before: string
          notification_id: string
          outcome: Database["public"]["Enums"]["push_queue_outcome"] | null
          settled_at: string | null
          state: Database["public"]["Enums"]["push_queue_state"]
          user_id: string
        }
        Insert: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          collapsed_into?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_error?: string | null
          not_before?: string
          notification_id: string
          outcome?: Database["public"]["Enums"]["push_queue_outcome"] | null
          settled_at?: string | null
          state?: Database["public"]["Enums"]["push_queue_state"]
          user_id: string
        }
        Update: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          collapsed_into?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_error?: string | null
          not_before?: string
          notification_id?: string
          outcome?: Database["public"]["Enums"]["push_queue_outcome"] | null
          settled_at?: string | null
          state?: Database["public"]["Enums"]["push_queue_state"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_queue_collapsed_into_fkey"
            columns: ["collapsed_into"]
            isOneToOne: false
            referencedRelation: "push_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app_version: string | null
          auth: string | null
          created_at: string
          device_label: string | null
          device_ref: string
          failure_streak: number
          id: string
          last_seen_at: string
          p256dh: string | null
          platform: Database["public"]["Enums"]["push_platform"]
          revoked_at: string | null
          revoked_reason:
            | Database["public"]["Enums"]["push_revoked_reason"]
            | null
          token: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          auth?: string | null
          created_at?: string
          device_label?: string | null
          device_ref?: string
          failure_streak?: number
          id?: string
          last_seen_at?: string
          p256dh?: string | null
          platform: Database["public"]["Enums"]["push_platform"]
          revoked_at?: string | null
          revoked_reason?:
            | Database["public"]["Enums"]["push_revoked_reason"]
            | null
          token: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          auth?: string | null
          created_at?: string
          device_label?: string | null
          device_ref?: string
          failure_streak?: number
          id?: string
          last_seen_at?: string
          p256dh?: string | null
          platform?: Database["public"]["Enums"]["push_platform"]
          revoked_at?: string | null
          revoked_reason?:
            | Database["public"]["Enums"]["push_revoked_reason"]
            | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_accounts: {
        Row: {
          added_at: string
          label: string
          reason: string
          user_id: string
        }
        Insert: {
          added_at?: string
          label: string
          reason: string
          user_id: string
        }
        Update: {
          added_at?: string
          label?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_calendar: {
        Row: {
          closed: boolean
          date: string
          rate_minor: number | null
          rate_plan_id: string
        }
        Insert: {
          closed?: boolean
          date: string
          rate_minor?: number | null
          rate_plan_id: string
        }
        Update: {
          closed?: boolean
          date?: string
          rate_minor?: number | null
          rate_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_calendar_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "rate_plans"
            referencedColumns: ["id"]
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
      rate_plans: {
        Row: {
          active: boolean
          cancellation_policy_id: string
          created_at: string
          currency: string
          id: string
          max_stay_nights: number | null
          meal_plan: Database["public"]["Enums"]["meal_plan"]
          min_stay_nights: number
          name: string
          rate_minor: number
          room_type_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cancellation_policy_id: string
          created_at?: string
          currency?: string
          id?: string
          max_stay_nights?: number | null
          meal_plan?: Database["public"]["Enums"]["meal_plan"]
          min_stay_nights?: number
          name: string
          rate_minor: number
          room_type_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cancellation_policy_id?: string
          created_at?: string
          currency?: string
          id?: string
          max_stay_nights?: number | null
          meal_plan?: Database["public"]["Enums"]["meal_plan"]
          min_stay_nights?: number
          name?: string
          rate_minor?: number
          room_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_cancellation_policy_id_fkey"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_plans_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          agency_minor: number | null
          agreement_minor: number | null
          booking_id: string
          caution_minor: number | null
          created_at: string
          currency: string
          id: string
          inspection_id: string
          legal_minor: number | null
          lister_id: string
          listing_id: string
          move_in: string
          rent_minor: number | null
          rent_period: Database["public"]["Enums"]["rent_period"]
          service_minor: number | null
          tenant_id: string
          total_minor: number
          total_stated: boolean
          updated_at: string
        }
        Insert: {
          agency_minor?: number | null
          agreement_minor?: number | null
          booking_id: string
          caution_minor?: number | null
          created_at?: string
          currency?: string
          id?: string
          inspection_id: string
          legal_minor?: number | null
          lister_id: string
          listing_id: string
          move_in: string
          rent_minor?: number | null
          rent_period?: Database["public"]["Enums"]["rent_period"]
          service_minor?: number | null
          tenant_id: string
          total_minor: number
          total_stated?: boolean
          updated_at?: string
        }
        Update: {
          agency_minor?: number | null
          agreement_minor?: number | null
          booking_id?: string
          caution_minor?: number | null
          created_at?: string
          currency?: string
          id?: string
          inspection_id?: string
          legal_minor?: number | null
          lister_id?: string
          listing_id?: string
          move_in?: string
          rent_minor?: number | null
          rent_period?: Database["public"]["Enums"]["rent_period"]
          service_minor?: number | null
          tenant_id?: string
          total_minor?: number
          total_stated?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspection_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "rent_payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
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
          resolved_by?: string | null
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
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          business_id: string | null
          conversation_id: string | null
          created_at: string
          guest_id: string
          id: string
          listing_id: string | null
          note: string | null
          party_size: number
          reserved_for: string
          responded_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          conversation_id?: string | null
          created_at?: string
          guest_id: string
          id?: string
          listing_id?: string | null
          note?: string | null
          party_size: number
          reserved_for: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          conversation_id?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          listing_id?: string | null
          note?: string | null
          party_size?: number
          reserved_for?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_profiles: {
        Row: {
          business_id: string
          created_at: string
          cuisines: string[]
          dress_code: string | null
          menu_url: string | null
          outdoor: boolean
          parking: boolean
          power_backup: boolean
          price_band: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          cuisines?: string[]
          dress_code?: string | null
          menu_url?: string | null
          outdoor?: boolean
          parking?: boolean
          power_backup?: boolean
          price_band?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          cuisines?: string[]
          dress_code?: string | null
          menu_url?: string | null
          outdoor?: boolean
          parking?: boolean
          power_backup?: boolean
          price_band?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
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
          resolved_by: string | null
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
          resolved_by?: string | null
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
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
        }
        Relationships: []
      }
      room_inventory: {
        Row: {
          date: string
          room_type_id: string
          units_booked: number
          units_open: number
          updated_at: string
        }
        Insert: {
          date: string
          room_type_id: string
          units_booked?: number
          units_open: number
          updated_at?: string
        }
        Update: {
          date?: string
          room_type_id?: string
          units_booked?: number
          units_open?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_inventory_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          accommodation_id: string
          base_rate_minor: number
          bedrooms: number | null
          beds: Json
          category: Database["public"]["Enums"]["room_category"]
          created_at: string
          currency: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          size_sqm: number | null
          sleeps: number
          status: Database["public"]["Enums"]["listing_status"]
          units_total: number
          updated_at: string
        }
        Insert: {
          accommodation_id: string
          base_rate_minor: number
          bedrooms?: number | null
          beds?: Json
          category: Database["public"]["Enums"]["room_category"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          size_sqm?: number | null
          sleeps: number
          status?: Database["public"]["Enums"]["listing_status"]
          units_total: number
          updated_at?: string
        }
        Update: {
          accommodation_id?: string
          base_rate_minor?: number
          bedrooms?: number | null
          beds?: Json
          category?: Database["public"]["Enums"]["room_category"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          size_sqm?: number | null
          sleeps?: number
          status?: Database["public"]["Enums"]["listing_status"]
          units_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "saved_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_places: {
        Row: {
          created_at: string
          entity_id: string
          entity_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alert_checked_at: string | null
          alert_cursor_at: string | null
          alert_enabled: boolean
          alert_notified_at: string | null
          created_at: string
          id: string
          label: string | null
          query: Json
          query_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_checked_at?: string | null
          alert_cursor_at?: string | null
          alert_enabled?: boolean
          alert_notified_at?: string | null
          created_at?: string
          id?: string
          label?: string | null
          query?: Json
          query_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_checked_at?: string | null
          alert_cursor_at?: string | null
          alert_enabled?: boolean
          alert_notified_at?: string | null
          created_at?: string
          id?: string
          label?: string | null
          query?: Json
          query_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_windows: {
        Row: {
          business_id: string
          closes: string
          covers: number
          created_at: string
          id: string
          last_seating: string
          opens: string
          updated_at: string
          weekday: number
        }
        Insert: {
          business_id: string
          closes: string
          covers: number
          created_at?: string
          id?: string
          last_seating: string
          opens: string
          updated_at?: string
          weekday: number
        }
        Update: {
          business_id?: string
          closes?: string
          covers?: number
          created_at?: string
          id?: string
          last_seating?: string
          opens?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_windows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          agent_id: string | null
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
          lga_code: string | null
          link: string | null
          occupation_code: string | null
          pidgin_ok: boolean
          post_count: number
          pronouns: string | null
          state_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
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
          lga_code?: string | null
          link?: string | null
          occupation_code?: string | null
          pidgin_ok?: boolean
          post_count?: number
          pronouns?: string | null
          state_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
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
          lga_code?: string | null
          link?: string | null
          occupation_code?: string | null
          pidgin_ok?: boolean
          post_count?: number
          pronouns?: string | null
          state_code?: string | null
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
      stories: {
        Row: {
          area_id: string | null
          author_id: string
          comment_count: number
          created_at: string
          edited_at: string | null
          headline: string
          hidden_by: string | null
          hold_reason: string | null
          id: string
          image_path: string
          like_count: number
          listing_id: string | null
          place_label: string | null
          removed_at: string | null
          save_count: number
          standfirst: string | null
          status: Database["public"]["Enums"]["social_status"]
          view_count: number
        }
        Insert: {
          area_id?: string | null
          author_id: string
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          headline: string
          hidden_by?: string | null
          hold_reason?: string | null
          id?: string
          image_path: string
          like_count?: number
          listing_id?: string | null
          place_label?: string | null
          removed_at?: string | null
          save_count?: number
          standfirst?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          view_count?: number
        }
        Update: {
          area_id?: string | null
          author_id?: string
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          headline?: string
          hidden_by?: string | null
          hold_reason?: string | null
          id?: string
          image_path?: string
          like_count?: number
          listing_id?: string | null
          place_label?: string | null
          removed_at?: string | null
          save_count?: number
          standfirst?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_lister"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "stories_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          edited_at: string | null
          hold_reason: string | null
          id: string
          like_count: number
          parent_id: string | null
          status: Database["public"]["Enums"]["social_status"]
          story_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          edited_at?: string | null
          hold_reason?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          story_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          hold_reason?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          mark: Database["public"]["Enums"]["post_mark"]
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mark: Database["public"]["Enums"]["post_mark"]
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mark?: Database["public"]["Enums"]["post_mark"]
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          seen_on: string
          story_id: string
          viewer_bucket: string
        }
        Insert: {
          seen_on?: string
          story_id: string
          viewer_bucket: string
        }
        Update: {
          seen_on?: string
          story_id?: string
          viewer_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
      terms_acceptances: {
        Row: {
          accepted_at: string
          document: string
          id: string
          source: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          source?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          source?: string
          user_id?: string
          version?: string
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
      units: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          room_type_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          room_type_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          room_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
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
      wallet_pots: {
        Row: {
          archived_at: string | null
          balance_minor: number
          created_at: string
          id: string
          name: string
          target_minor: number | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance_minor?: number
          created_at?: string
          id?: string
          name: string
          target_minor?: number | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance_minor?: number
          created_at?: string
          id?: string
          name?: string
          target_minor?: number | null
          user_id?: string
        }
        Relationships: []
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
      listing_lister: {
        Row: {
          lister_name: string | null
          listing_id: string | null
        }
        Relationships: []
      }
      person_badge: {
        Row: {
          tier: Database["public"]["Enums"]["badge_tier"] | null
          user_id: string | null
        }
        Relationships: []
      }
      push_queue_health: {
        Row: {
          dead: number | null
          delivered_last_hour: number | null
          failed: number | null
          gave_up_last_hour: number | null
          held: number | null
          oldest_due_seconds: number | null
          pending: number | null
          sending: number | null
          stale_claims: number | null
        }
        Relationships: []
      }
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
      account_deletion_blockers: { Args: { p_user: string }; Returns: Json }
      admin_expire_stale_withdrawal_holds: {
        Args: { p_older_than_minutes?: number }
        Returns: Json
      }
      admin_payment_health: {
        Args: { p_stale_minutes?: number }
        Returns: Json
      }
      admin_retire_demo_listings: {
        Args: { p_listing_ids: string[] }
        Returns: Json
      }
      admin_revenue_summary: { Args: { p_days?: number }; Returns: Json }
      admin_user_id_by_email: { Args: { p_email: string }; Returns: string }
      agent_trust: {
        Args: { p_user: string }
        Returns: {
          average_rating: number
          completed_deals: number
          response_minutes: number
          review_count: number
          trust_score: number
        }[]
      }
      area_asking_summary: {
        Args: {
          p_area?: string
          p_bedrooms?: number
          p_city?: string
          p_intent?: Database["public"]["Enums"]["listing_intent"]
          p_max_age_days?: number
          p_property_type?: Database["public"]["Enums"]["property_type"]
          p_state_code: string
        }
        Returns: {
          bedrooms: number
          listing_count: number
          median_minor: number
          median_per_sqm_minor: number
          newest_at: string
          oldest_at: string
          p25_minor: number
          p75_minor: number
          property_type: Database["public"]["Enums"]["property_type"]
          scope: string
          sized_count: number
        }[]
      }
      area_suggestions: {
        Args: { p_limit?: number; p_query?: string; p_state_code: string }
        Returns: {
          area: string
          city: string
          listing_count: number
        }[]
      }
      area_supply_census: {
        Args: {
          p_area?: string
          p_city?: string
          p_intent?: Database["public"]["Enums"]["listing_intent"]
          p_state_code: string
        }
        Returns: {
          demo_count: number
          located_count: number
          real_count: number
          sized_count: number
        }[]
      }
      area_utility_facts: {
        Args: { p_area?: string; p_city?: string; p_state_code: string }
        Returns: {
          estate_access_count: number
          estate_access_known: number
          listing_count: number
          power_backup: Database["public"]["Enums"]["power_backup"]
          power_backup_count: number
          power_grid: Database["public"]["Enums"]["power_grid"]
          power_grid_count: number
          prepaid_meter_count: number
          prepaid_meter_known: number
          water_supply: Database["public"]["Enums"]["water_supply"]
          water_supply_count: number
        }[]
      }
      badge_tier: {
        Args: { is_checked: boolean; is_staff: boolean }
        Returns: Database["public"]["Enums"]["badge_tier"]
      }
      bot_may_run: { Args: { p_user: string }; Returns: string }
      business_transfer_board: { Args: { p_user: string }; Returns: Json }
      cancel_account_deletion: {
        Args: { p_restore_code_hash: string; p_user: string }
        Returns: Json
      }
      claim_idempotency: {
        Args: {
          key: string
          scope: string
          subject: string
          ttl_seconds: number
        }
        Returns: Json
      }
      close_future_commitments: { Args: { p_request: string }; Returns: Json }
      comparable_listings: {
        Args: {
          p_bedrooms: number
          p_exclude_id?: string
          p_intent: Database["public"]["Enums"]["listing_intent"]
          p_lat: number
          p_limit?: number
          p_lng: number
          p_max_age_days?: number
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_radius_m?: number
        }
        Returns: {
          age_days: number
          area: string
          bathrooms: number
          bedrooms: number
          city: string
          condition: Database["public"]["Enums"]["build_condition"]
          distance_m: number
          furnished: Database["public"]["Enums"]["furnishing"]
          id: string
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          price_basis: string
          price_minor: number
          price_per_sqm_minor: number
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string
          size_sqm: number
          state_code: string
          title: string
          toilets: number
        }[]
      }
      comparable_supply_near: {
        Args: {
          p_bedrooms: number
          p_intent: Database["public"]["Enums"]["listing_intent"]
          p_lat: number
          p_lng: number
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_radius_m?: number
        }
        Returns: {
          demo_count: number
          real_count: number
          stale_real_count: number
        }[]
      }
      complete_ended_stays: { Args: { p_limit?: number }; Returns: Json }
      confidence_band: {
        Args: {
          p_count: number
          p_dispersion: number
          p_median_age: number
          p_radius_m: number
        }
        Returns: string
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
      create_price_check_share: {
        Args: {
          p_area: string
          p_bedrooms: number
          p_created_by?: string
          p_high_minor: number
          p_lga_code: string
          p_listing_count: number
          p_listing_intent: Database["public"]["Enums"]["listing_intent"]
          p_low_minor: number
          p_mid_minor: number
          p_newest_at?: string
          p_oldest_at?: string
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_scope: Database["public"]["Enums"]["price_check_share_scope"]
          p_state_code: string
        }
        Returns: string
      }
      cron_job_failures: {
        Args: { p_limit?: number; p_since?: string }
        Returns: Json
      }
      current_agent_id: { Args: never; Returns: string }
      due_account_purges: { Args: { p_limit: number }; Returns: Json }
      email_outbox_claim: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string
          id: string
          last_error: string | null
          payload: Json
          settled_at: string | null
          status: string
          template: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      email_outbox_enqueue_welcome: {
        Args: { p_user: string }
        Returns: string
      }
      email_outbox_health: { Args: { p_stuck_minutes?: number }; Returns: Json }
      email_outbox_settle: {
        Args: {
          p_error?: string
          p_id: string
          p_max_attempts?: number
          p_result: string
          p_retry_seconds?: number
        }
        Returns: string
      }
      end_other_sessions: { Args: never; Returns: Json }
      end_session: { Args: { p_session: string }; Returns: Json }
      enter_place: {
        Args: { p_lga_code: string }
        Returns: {
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["area_status"]
        }[]
      }
      escrow_admin_resolve: {
        Args: { p_direction: string; p_escrow: string; p_note: string }
        Returns: Json
      }
      escrow_cancel_as: {
        Args: { p_actor: string; p_escrow: string; p_reason?: string }
        Returns: Json
      }
      escrow_confirm: { Args: { p_escrow: string }; Returns: Json }
      escrow_confirm_as: {
        Args: { p_actor: string; p_escrow: string }
        Returns: Json
      }
      escrow_file_evidence_as: {
        Args: {
          p_actor: string
          p_amount_minor?: number
          p_caption?: string
          p_escrow: string
          p_fact?: Database["public"]["Enums"]["escrow_fact"]
          p_file_name?: string
          p_happened_on?: string
          p_kind: Database["public"]["Enums"]["escrow_evidence_kind"]
          p_mime_type?: string
          p_size_bytes?: number
          p_storage_path?: string
        }
        Returns: Json
      }
      escrow_fund_from_wallet: {
        Args: {
          p_amount_minor: number
          p_hold_days?: number
          p_listing: string
          p_payee: string
          p_purpose: Database["public"]["Enums"]["escrow_purpose"]
          p_reference: string
        }
        Returns: Json
      }
      escrow_fund_from_wallet_as: {
        Args: {
          p_actor: string
          p_amount_minor: number
          p_hold_days?: number
          p_listing: string
          p_payee: string
          p_purpose: Database["public"]["Enums"]["escrow_purpose"]
          p_reference: string
        }
        Returns: Json
      }
      escrow_fund_proposal_as: {
        Args: { p_actor: string; p_escrow: string; p_hold_days?: number }
        Returns: Json
      }
      escrow_hold: {
        Args: {
          amount: number
          escrow_id: string
          hold_days?: number
          hold_reference: string
          note?: string
          payer_user: string
        }
        Returns: Json
      }
      escrow_open: {
        Args: {
          amount: number
          listing: string
          payee_user: string
          payer_user: string
          purpose: Database["public"]["Enums"]["escrow_purpose"]
        }
        Returns: Json
      }
      escrow_propose_as: {
        Args: {
          p_actor: string
          p_actor_pays: boolean
          p_amount_minor: number
          p_conversation: string
          p_counterparty: string
          p_purpose: Database["public"]["Enums"]["escrow_purpose"]
        }
        Returns: Json
      }
      escrow_raise_dispute: {
        Args: { p_escrow: string; p_reason: string }
        Returns: Json
      }
      escrow_reverse_ruling: {
        Args: { p_note: string; p_ruling: string }
        Returns: Json
      }
      escrow_raise_dispute_as: {
        Args: { p_actor: string; p_escrow: string; p_reason: string }
        Returns: Json
      }
      escrow_refund: {
        Args: {
          escrow_id: string
          note?: string
          payer_user: string
          refund_reference: string
        }
        Returns: Json
      }
      escrow_release: {
        Args: {
          beneficiary_user: string
          escrow_id: string
          note?: string
          release_reference: string
        }
        Returns: Json
      }
      escrow_request_release: { Args: { p_escrow: string }; Returns: Json }
      escrow_request_release_as: {
        Args: { p_actor: string; p_escrow: string }
        Returns: Json
      }
      estimate_value: {
        Args: {
          p_bedrooms: number
          p_exclude_id?: string
          p_intent: Database["public"]["Enums"]["listing_intent"]
          p_lat: number
          p_lng: number
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_size_sqm?: number
        }
        Returns: {
          basis: string
          comparable_count: number
          comparable_ids: string[]
          confidence: string
          dispersion: number
          high_minor: number
          low_minor: number
          median_age_days: number
          median_distance_m: number
          mid_minor: number
          outcome: string
          radius_m: number
          refusal_code: string
        }[]
      }
      expire_booking_holds: {
        Args: { p_limit?: number; p_ttl?: string }
        Returns: Json
      }
      expire_stale_withdrawal_holds: {
        Args: { older_than_minutes?: number }
        Returns: Json
      }
      fail_account_purge: {
        Args: { p_reason: string; p_request: string }
        Returns: Json
      }
      fee_rate_at: {
        Args: { p_at?: string; p_kind: Database["public"]["Enums"]["fee_kind"] }
        Returns: {
          basis_points: number
          effective_from: string
          flat_minor: number
          rate_id: string
        }[]
      }
      finish_account_purge: {
        Args: { p_request: string; p_storage: Json }
        Returns: Json
      }
      grant_staff_role: {
        Args: {
          acting_admin: string
          new_role: Database["public"]["Enums"]["app_role"]
          target_email: string
        }
        Returns: Json
      }
      hold_wallet_withdrawal: {
        Args: {
          amount: number
          hold_metadata?: Json
          hold_reference: string
          owner_user: string
        }
        Returns: Json
      }
      inventory_drift: { Args: { p_limit?: number }; Returns: Json }
      is_checked_person: { Args: { check_user_id: string }; Returns: boolean }
      is_platform_staff: { Args: { check_user_id: string }; Returns: boolean }
      join_text_array: { Args: { items: string[] }; Returns: string }
      landmarks_resolve: {
        Args: { p_limit?: number; p_state?: string; p_term: string }
        Returns: {
          city: string
          id: string
          kind: Database["public"]["Enums"]["landmark_kind"]
          latitude: number
          longitude: number
          name: string
          score: number
          slug: string
          state_code: string
        }[]
      }
      listings_in_bounds: {
        Args: {
          p_bedrooms?: number
          p_east: number
          p_intent?: Database["public"]["Enums"]["listing_intent"]
          p_limit?: number
          p_max_price_minor?: number
          p_min_price_minor?: number
          p_north: number
          p_property_type?: Database["public"]["Enums"]["property_type"]
          p_south: number
          p_west: number
        }
        Returns: {
          area: string
          bathrooms: number
          bedrooms: number
          city: string
          id: string
          is_demo: boolean
          latitude: number
          listing_intent: Database["public"]["Enums"]["listing_intent"]
          longitude: number
          price_minor: number
          property_type: Database["public"]["Enums"]["property_type"]
          state_code: string
          title: string
        }[]
      }
      move_into_pot: {
        Args: {
          amount: number
          move_reference: string
          owner_user: string
          pot: string
        }
        Returns: Json
      }
      move_out_of_pot: {
        Args: {
          amount: number
          move_reference: string
          owner_user: string
          pot: string
        }
        Returns: Json
      }
      my_sessions: {
        Args: never
        Returns: {
          aal: string
          is_current: boolean
          last_seen_at: string
          session_id: string
          signed_in_at: string
          user_agent: string
        }[]
      }
      offer_business_transfer: {
        Args: {
          p_business: string
          p_from: string
          p_note: string
          p_to: string
        }
        Returns: Json
      }
      open_account_deletion: { Args: { p_user: string }; Returns: Json }
      open_rent_charge: {
        Args: { p_inspection: string; p_move_in: string; p_tenant: string }
        Returns: Json
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
        Args: never
        Returns: {
          agents: number
          cities: number
          listings: number
          states: number
        }[]
      }
      purge_account_rows: { Args: { p_request: string }; Returns: Json }
      record_booking_no_show: {
        Args: { p_actor: string; p_booking: string; p_note?: string }
        Returns: Json
      }
      record_idempotency_result: {
        Args: { key: string; result: Json; scope: string; subject: string }
        Returns: boolean
      }
      record_price_check_event: {
        Args: {
          p_bedrooms?: number
          p_check_id: string
          p_comparable_count?: number
          p_confidence?: string
          p_dispersion?: number
          p_entry_point?: string
          p_geohash5?: string
          p_intent_chosen?: string
          p_lga_code?: string
          p_listing_id?: string
          p_listing_intent?: Database["public"]["Enums"]["listing_intent"]
          p_outcome?: string
          p_property_type?: Database["public"]["Enums"]["property_type"]
          p_radius_m?: number
          p_refusal_code?: string
          p_size_stated?: boolean
          p_stage: string
          p_state_code?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      refund_and_cancel_booking: {
        Args: {
          acting_admin: string
          decision_note?: string
          reason_code: string
          refund_amount: number
          refund_reference: string
          target_booking: string
        }
        Returns: Json
      }
      refund_booking_payment: {
        Args: {
          acting_admin: string
          decision_note?: string
          reason_code: string
          refund_amount: number
          refund_reference: string
          target_booking: string
        }
        Returns: Json
      }
      reinstate_agent: {
        Args: { acting_admin: string; note?: string; target_agent: string }
        Returns: Json
      }
      release_idempotency: {
        Args: { key: string; scope: string; subject: string }
        Returns: boolean
      }
      release_room_nights: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_room_type: string
          p_rooms: number
        }
        Returns: number
      }
      reserve_room_nights: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_rate_plan?: string
          p_room_type: string
          p_rooms: number
        }
        Returns: number
      }
      respond_to_business_transfer: {
        Args: { p_accept: boolean; p_transfer: string; p_user: string }
        Returns: Json
      }
      review_kyc_document: {
        Args: { p_approve: boolean; p_document: string; p_reason: string }
        Returns: Json
      }
      revoke_staff_role: {
        Args: {
          acting_admin: string
          old_role: Database["public"]["Enums"]["app_role"]
          target_user: string
        }
        Returns: Json
      }
      schedule_account_deletion: {
        Args: { p_days: number; p_restore_code_hash: string; p_user: string }
        Returns: Json
      }
      settle_booking_charge: {
        Args: {
          p_amount_minor: number
          p_fallback_booking?: string
          p_processor_fee_minor?: number
          p_reference: string
        }
        Returns: Json
      }
      set_fee_rate: {
        Args: {
          p_basis_points: number
          p_effective_from: string
          p_flat_minor: number
          p_kind: Database["public"]["Enums"]["fee_kind"]
          p_note: string
        }
        Returns: Json
      }
      signup_method_for_email: { Args: { p_email: string }; Returns: string }
      stale_withdrawal_holds: {
        Args: { older_than_minutes?: number }
        Returns: {
          amount_minor: number
          created_at: string
          reference: string
          wallet_id: string
        }[]
      }
      stays_search: {
        Args: {
          p_amenities?: string[]
          p_area?: string
          p_breakfast?: boolean
          p_check_in?: string
          p_check_out?: string
          p_city?: string
          p_entity_kinds?: Database["public"]["Enums"]["catalogue_entity_kind"][]
          p_free_cancellation?: boolean
          p_guests?: number
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_max_price_minor?: number
          p_min_price_minor?: number
          p_min_rating?: number
          p_offset?: number
          p_q?: string
          p_radius_m?: number
          p_room_categories?: Database["public"]["Enums"]["room_category"][]
          p_rooms?: number
          p_sort?: string
          p_state_code?: string
          p_verified?: boolean
        }
        Returns: {
          amenity_codes: string[]
          area: string
          city: string
          cover_path: string
          distance_m: number
          entity_id: string
          entity_kind: Database["public"]["Enums"]["catalogue_entity_kind"]
          featured: boolean
          has_breakfast: boolean
          has_free_cancellation: boolean
          headline_price_minor: number
          headline_price_period: string
          id: string
          is_demo: boolean
          kind: string
          latitude: number
          longitude: number
          max_sleeps: number
          nightly_minor: number
          nights: number
          price_band: number
          rate_plan_id: string
          rating_avg: number
          rating_count: number
          room_categories: Database["public"]["Enums"]["room_category"][]
          room_type_id: string
          source: Database["public"]["Enums"]["source_kind"]
          state_code: string
          title: string
          total_count: number
          total_minor: number
          verified: boolean
        }[]
      }
      story_count: { Args: { p_author: string }; Returns: number }
      suspend_agent: {
        Args: {
          acting_admin: string
          stop_reason: string
          target_agent: string
        }
        Returns: Json
      }
      transfer_between_wallets: {
        Args: {
          amount: number
          in_reference: string
          note?: string
          out_reference: string
          recipient_user: string
          sender_user: string
        }
        Returns: string
      }
      unaccent_immutable: { Args: { input: string }; Returns: string }
      user_id_by_email_for_transfer: {
        Args: { p_email: string }
        Returns: string
      }
      verification_is_required: { Args: { p_user: string }; Returns: boolean }
      verify_payout_account: {
        Args: {
          p_account: string
          p_identity_name: string
          p_resolved_name: string
        }
        Returns: Json
      }
      wallets_overdrawn: {
        Args: never
        Returns: {
          balance_minor: number
          user_id: string
          wallet_id: string
        }[]
      }
      withdraw_business_transfer: {
        Args: { p_transfer: string; p_user: string }
        Returns: Json
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
      badge_tier: "none" | "gold" | "platinum"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "NO_SHOW"
        | "CANCELLED"
      build_condition: "newly_built" | "renovated" | "old" | "off_plan"
      business_kind:
        | "hotel"
        | "serviced_apartments"
        | "guest_house"
        | "resort"
        | "shortlet_operator"
        | "restaurant"
        | "agency"
      catalogue_entity_kind: "listing" | "accommodation" | "restaurant"
      document_review_status: "pending" | "approved" | "rejected"
      document_subtype:
        | "passport"
        | "drivers_licence"
        | "nin_card"
        | "voters_card"
        | "utility_bill"
        | "bank_statement"
        | "tenancy_agreement"
        | "cac_certificate"
        | "tax_certificate"
        | "business_address_proof"
        | "certificate_of_occupancy"
        | "deed_of_assignment"
        | "governors_consent"
        | "survey_plan"
        | "land_use_charge_receipt"
        | "gazette"
        | "mandate_letter"
        | "lasrera_certificate"
        | "esvarbon_certificate"
      escrow_evidence_kind: "file" | "fact"
      escrow_fact:
        | "viewing_attended"
        | "viewing_missed"
        | "keys_received"
        | "keys_not_received"
        | "agreement_signed"
        | "agreement_not_signed"
        | "service_delivered"
        | "service_not_delivered"
        | "property_matched_listing"
        | "property_differed_from_listing"
        | "contacted_on"
        | "no_reply_since"
        | "amount_agreed"
      escrow_purpose:
        | "rent_deposit"
        | "first_rent"
        | "purchase_deposit"
        | "purchase_balance"
        | "agency_fee"
      escrow_state:
        | "INITIATED"
        | "FUNDED"
        | "HELD"
        | "RELEASE_REQUESTED"
        | "RELEASED"
        | "REFUNDED"
        | "DISPUTED"
        | "RESOLVED"
        | "CANCELLED"
      event_attendance: "GOING" | "WAITLIST" | "WITHDRAWN"
      event_status: "DRAFT" | "LIVE" | "HELD" | "CANCELLED" | "REMOVED"
      event_venue_kind: "PUBLIC_VENUE" | "ESTATE_COMMON" | "ONLINE"
      fee_kind: "commission" | "listing_fee"
      fulfilment_mode: "vallo" | "external_completion" | "partner_handoff"
      furnishing: "unfurnished" | "semi_furnished" | "fully_furnished"
      geopolitical_zone:
        | "north_central"
        | "north_east"
        | "north_west"
        | "south_east"
        | "south_south"
        | "south_west"
      inspection_state:
        | "REQUESTED"
        | "CONFIRMED"
        | "PROPOSED"
        | "DECLINED"
        | "COMPLETED"
        | "WITHDRAWN"
      land_tenure:
        | "certificate_of_occupancy"
        | "governors_consent"
        | "deed_of_assignment"
        | "gazette"
        | "freehold"
        | "leasehold"
      landmark_kind:
        | "airport"
        | "business_district"
        | "market"
        | "mall"
        | "stadium"
        | "beach"
        | "park"
        | "transport"
        | "education"
        | "hospital"
        | "worship"
        | "other"
      listing_intent: "rent" | "sale"
      listing_role: "owner" | "agent" | "firm"
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
      meal_plan: "room_only" | "breakfast" | "half_board" | "full_board"
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
      post_kind: "GIST" | "ASK" | "REPLY" | "SHOWCASE" | "SYSTEM" | "STORY"
      post_mark: "LIKE" | "SAVE"
      power_backup:
        | "NONE"
        | "GENERATOR"
        | "INVERTER"
        | "SOLAR"
        | "GENERATOR_INVERTER"
      power_grid: "BAND_A" | "MOSTLY_ON" | "PATCHY" | "RARELY" | "NONE"
      price_check_share_scope: "area" | "area_and_type"
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
        | "restaurant"
      push_delivery_state: "sending" | "sent" | "failed" | "gone"
      push_platform: "web" | "ios" | "android"
      push_queue_outcome:
        | "delivered"
        | "suppressed_preference"
        | "suppressed_no_device"
        | "suppressed_expired"
        | "collapsed"
        | "gave_up"
      push_queue_state:
        | "pending"
        | "held"
        | "sending"
        | "done"
        | "failed"
        | "dead"
      push_revoked_reason:
        | "by_person"
        | "provider_gone"
        | "provider_invalid"
        | "repeated_failure"
        | "signed_out"
      rate_period: "night" | "guest"
      rent_period: "month" | "quarter" | "year"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      revenue_source: "escrow_commission" | "listing_fee"
      room_category:
        | "entire_flat"
        | "whole_house"
        | "private_room"
        | "single"
        | "double"
        | "twin"
        | "suite"
        | "family"
        | "dorm"
      sale_status: "available" | "under_offer" | "sold"
      signup_role: "renter" | "buyer" | "landlord" | "seller" | "agent"
      social_status: "LIVE" | "HELD" | "REMOVED"
      source_kind: "first_party" | "partner" | "licensed_data"
      supply_role: "owner" | "agent"
      support_ticket_status: "open" | "pending" | "resolved" | "closed"
      thread_context: "listing" | "reservation" | "booking"
      transaction_status: "SUCCESSFUL" | "PENDING" | "FAILED" | "REFUNDED"
      wallet_entry_direction: "credit" | "debit"
      wallet_entry_kind:
        | "deposit"
        | "withdrawal"
        | "payment"
        | "refund"
        | "transfer_in"
        | "transfer_out"
        | "escrow_hold"
        | "escrow_release"
        | "escrow_refund"
        | "pot_hold"
        | "pot_release"
        | "payment_in"
        | "payment_in_return"
      wallet_entry_status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED"
      water_supply:
        | "TREATED_MAINS"
        | "BOREHOLE"
        | "PUMPED_STORAGE"
        | "TANKER"
        | "NONE"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      badge_tier: ["none", "gold", "platinum"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "NO_SHOW",
        "CANCELLED",
      ],
      build_condition: ["newly_built", "renovated", "old", "off_plan"],
      business_kind: [
        "hotel",
        "serviced_apartments",
        "guest_house",
        "resort",
        "shortlet_operator",
        "restaurant",
        "agency",
      ],
      catalogue_entity_kind: ["listing", "accommodation", "restaurant"],
      document_review_status: ["pending", "approved", "rejected"],
      document_subtype: [
        "passport",
        "drivers_licence",
        "nin_card",
        "voters_card",
        "utility_bill",
        "bank_statement",
        "tenancy_agreement",
        "cac_certificate",
        "tax_certificate",
        "business_address_proof",
        "certificate_of_occupancy",
        "deed_of_assignment",
        "governors_consent",
        "survey_plan",
        "land_use_charge_receipt",
        "gazette",
        "mandate_letter",
        "lasrera_certificate",
        "esvarbon_certificate",
      ],
      escrow_evidence_kind: ["file", "fact"],
      escrow_fact: [
        "viewing_attended",
        "viewing_missed",
        "keys_received",
        "keys_not_received",
        "agreement_signed",
        "agreement_not_signed",
        "service_delivered",
        "service_not_delivered",
        "property_matched_listing",
        "property_differed_from_listing",
        "contacted_on",
        "no_reply_since",
        "amount_agreed",
      ],
      escrow_purpose: [
        "rent_deposit",
        "first_rent",
        "purchase_deposit",
        "purchase_balance",
        "agency_fee",
      ],
      escrow_state: [
        "INITIATED",
        "FUNDED",
        "HELD",
        "RELEASE_REQUESTED",
        "RELEASED",
        "REFUNDED",
        "DISPUTED",
        "RESOLVED",
        "CANCELLED",
      ],
      event_attendance: ["GOING", "WAITLIST", "WITHDRAWN"],
      event_status: ["DRAFT", "LIVE", "HELD", "CANCELLED", "REMOVED"],
      event_venue_kind: ["PUBLIC_VENUE", "ESTATE_COMMON", "ONLINE"],
      fee_kind: ["commission", "listing_fee"],
      fulfilment_mode: ["vallo", "external_completion", "partner_handoff"],
      furnishing: ["unfurnished", "semi_furnished", "fully_furnished"],
      geopolitical_zone: [
        "north_central",
        "north_east",
        "north_west",
        "south_east",
        "south_south",
        "south_west",
      ],
      inspection_state: [
        "REQUESTED",
        "CONFIRMED",
        "PROPOSED",
        "DECLINED",
        "COMPLETED",
        "WITHDRAWN",
      ],
      land_tenure: [
        "certificate_of_occupancy",
        "governors_consent",
        "deed_of_assignment",
        "gazette",
        "freehold",
        "leasehold",
      ],
      landmark_kind: [
        "airport",
        "business_district",
        "market",
        "mall",
        "stadium",
        "beach",
        "park",
        "transport",
        "education",
        "hospital",
        "worship",
        "other",
      ],
      listing_intent: ["rent", "sale"],
      listing_role: ["owner", "agent", "firm"],
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
      meal_plan: ["room_only", "breakfast", "half_board", "full_board"],
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
      post_kind: ["GIST", "ASK", "REPLY", "SHOWCASE", "SYSTEM", "STORY"],
      post_mark: ["LIKE", "SAVE"],
      power_backup: [
        "NONE",
        "GENERATOR",
        "INVERTER",
        "SOLAR",
        "GENERATOR_INVERTER",
      ],
      power_grid: ["BAND_A", "MOSTLY_ON", "PATCHY", "RARELY", "NONE"],
      price_check_share_scope: ["area", "area_and_type"],
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
        "restaurant",
      ],
      push_delivery_state: ["sending", "sent", "failed", "gone"],
      push_platform: ["web", "ios", "android"],
      push_queue_outcome: [
        "delivered",
        "suppressed_preference",
        "suppressed_no_device",
        "suppressed_expired",
        "collapsed",
        "gave_up",
      ],
      push_queue_state: [
        "pending",
        "held",
        "sending",
        "done",
        "failed",
        "dead",
      ],
      push_revoked_reason: [
        "by_person",
        "provider_gone",
        "provider_invalid",
        "repeated_failure",
        "signed_out",
      ],
      rate_period: ["night", "guest"],
      rent_period: ["month", "quarter", "year"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      revenue_source: ["escrow_commission", "listing_fee"],
      room_category: [
        "entire_flat",
        "whole_house",
        "private_room",
        "single",
        "double",
        "twin",
        "suite",
        "family",
        "dorm",
      ],
      sale_status: ["available", "under_offer", "sold"],
      signup_role: ["renter", "buyer", "landlord", "seller", "agent"],
      social_status: ["LIVE", "HELD", "REMOVED"],
      source_kind: ["first_party", "partner", "licensed_data"],
      supply_role: ["owner", "agent"],
      support_ticket_status: ["open", "pending", "resolved", "closed"],
      thread_context: ["listing", "reservation", "booking"],
      transaction_status: ["SUCCESSFUL", "PENDING", "FAILED", "REFUNDED"],
      wallet_entry_direction: ["credit", "debit"],
      wallet_entry_kind: [
        "deposit",
        "withdrawal",
        "payment",
        "refund",
        "transfer_in",
        "transfer_out",
        "escrow_hold",
        "escrow_release",
        "escrow_refund",
        "pot_hold",
        "pot_release",
        "payment_in",
        "payment_in_return",
      ],
      wallet_entry_status: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      water_supply: [
        "TREATED_MAINS",
        "BOREHOLE",
        "PUMPED_STORAGE",
        "TANKER",
        "NONE",
      ],
    },
  },
} as const
