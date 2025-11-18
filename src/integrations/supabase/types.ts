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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      behavioral_risk_scores: {
        Row: {
          alert_threshold_reached: boolean | null
          id: string
          last_alert_sent: string | null
          last_updated: string
          overall_risk_score: number | null
          professional_id: string
          risk_factors: Json | null
        }
        Insert: {
          alert_threshold_reached?: boolean | null
          id?: string
          last_alert_sent?: string | null
          last_updated?: string
          overall_risk_score?: number | null
          professional_id: string
          risk_factors?: Json | null
        }
        Update: {
          alert_threshold_reached?: boolean | null
          id?: string
          last_alert_sent?: string | null
          last_updated?: string
          overall_risk_score?: number | null
          professional_id?: string
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_risk_scores_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          city: string
          country: string
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          location_details: string | null
          meeting_schedule: string | null
          member_count: number | null
          name: string
          state: string
          updated_at: string | null
        }
        Insert: {
          city: string
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location_details?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name: string
          state: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location_details?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          professional_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          professional_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          professional_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ethics_committee_decisions: {
        Row: {
          created_at: string | null
          decision: string
          id: string
          report_id: string
          resolution_notes: string | null
          reviewed_by: string
        }
        Insert: {
          created_at?: string | null
          decision: string
          id?: string
          report_id: string
          resolution_notes?: string | null
          reviewed_by: string
        }
        Update: {
          created_at?: string | null
          decision?: string
          id?: string
          report_id?: string
          resolution_notes?: string | null
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ethics_committee_decisions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "user_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ethics_committee_decisions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_date: string | null
          meeting_link: string | null
          meeting_type: string | null
          notes: string | null
          recipient_id: string
          recipient_notes: string | null
          requester_id: string
          requester_notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          recipient_id: string
          recipient_notes?: string | null
          requester_id: string
          requester_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          recipient_id?: string
          recipient_notes?: string | null
          requester_id?: string
          requester_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_violations: {
        Row: {
          auto_detected: boolean | null
          blocked: boolean | null
          categories: string[] | null
          content_context: string | null
          created_at: string
          detection_confidence: number | null
          id: string
          professional_id: string | null
          reason: string
          severity: string
          user_id: string | null
          violation_type: string
        }
        Insert: {
          auto_detected?: boolean | null
          blocked?: boolean | null
          categories?: string[] | null
          content_context?: string | null
          created_at?: string
          detection_confidence?: number | null
          id?: string
          professional_id?: string | null
          reason: string
          severity: string
          user_id?: string | null
          violation_type: string
        }
        Update: {
          auto_detected?: boolean | null
          blocked?: boolean | null
          categories?: string[] | null
          content_context?: string | null
          created_at?: string
          detection_confidence?: number | null
          id?: string
          professional_id?: string | null
          reason?: string
          severity?: string
          user_id?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_violations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      offer_contacts: {
        Row: {
          created_at: string
          id: string
          interested_professional_id: string
          message: string | null
          offer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          interested_professional_id: string
          message?: string | null
          offer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          interested_professional_id?: string
          message?: string | null
          offer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_contacts_interested_professional_id_fkey"
            columns: ["interested_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_contacts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category_id: number
          contact_preference: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          price_amount: number | null
          price_type: string
          professional_id: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          category_id: number
          contact_preference: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_amount?: number | null
          price_type: string
          professional_id: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          category_id?: number
          contact_preference?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_amount?: number | null
          price_type?: string
          professional_id?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_appeals: {
        Row: {
          additional_context: string | null
          admin_response: string | null
          appeal_reason: string
          created_at: string
          id: string
          penalty_id: string
          professional_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          additional_context?: string | null
          admin_response?: string | null
          appeal_reason: string
          created_at?: string
          id?: string
          penalty_id: string
          professional_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          additional_context?: string | null
          admin_response?: string | null
          appeal_reason?: string
          created_at?: string
          id?: string
          penalty_id?: string
          professional_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_appeals_penalty_id_fkey"
            columns: ["penalty_id"]
            isOneToOne: false
            referencedRelation: "user_penalties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_appeals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      point_levels: {
        Row: {
          badge_color: string
          created_at: string | null
          id: number
          level_number: number
          max_points: number | null
          min_points: number
          name: string
        }
        Insert: {
          badge_color: string
          created_at?: string | null
          id?: number
          level_number: number
          max_points?: number | null
          min_points: number
          name: string
        }
        Update: {
          badge_color?: string
          created_at?: string | null
          id?: number
          level_number?: number
          max_points?: number | null
          min_points?: number
          name?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          created_at: string | null
          id: string
          points: number
          professional_id: string
          reason: string
          referral_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          professional_id: string
          reason: string
          referral_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          professional_id?: string
          reason?: string
          referral_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          professional_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          professional_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          address: string | null
          ai_messages_count: number | null
          ai_messages_reset_at: string | null
          bio: string | null
          business_description: string | null
          business_name: string | null
          business_verified: boolean | null
          chapter_id: string | null
          city: string
          company_address: string | null
          company_cif: string | null
          company_name: string | null
          contact_person_name: string | null
          contact_person_phone: string | null
          contact_person_position: string | null
          country: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string
          id: string
          linkedin: string | null
          linkedin_url: string | null
          logo_url: string | null
          moderation_block_reason: string | null
          moderation_blocked: boolean | null
          nif_cif: string | null
          nif_verified: boolean | null
          phone: string
          photo_url: string | null
          position: string | null
          postal_code: string | null
          referral_code: string | null
          referred_by_code: string | null
          registration_type: string | null
          sector_id: number
          specialization_id: number
          state: string
          status: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at: string | null
          subscription_plan_id: string | null
          subscription_starts_at: string | null
          subscription_status: string | null
          total_points: number
          updated_at: string
          user_id: string
          verification_documents_url: string[] | null
          verification_requested_at: string | null
          video_url: string | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          ai_messages_count?: number | null
          ai_messages_reset_at?: string | null
          bio?: string | null
          business_description?: string | null
          business_name?: string | null
          business_verified?: boolean | null
          chapter_id?: string | null
          city: string
          company_address?: string | null
          company_cif?: string | null
          company_name?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          contact_person_position?: string | null
          country?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name: string
          id?: string
          linkedin?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          moderation_block_reason?: string | null
          moderation_blocked?: boolean | null
          nif_cif?: string | null
          nif_verified?: boolean | null
          phone: string
          photo_url?: string | null
          position?: string | null
          postal_code?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          registration_type?: string | null
          sector_id: number
          specialization_id: number
          state: string
          status?: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
          verification_documents_url?: string[] | null
          verification_requested_at?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          ai_messages_count?: number | null
          ai_messages_reset_at?: string | null
          bio?: string | null
          business_description?: string | null
          business_name?: string | null
          business_verified?: boolean | null
          chapter_id?: string | null
          city?: string
          company_address?: string | null
          company_cif?: string | null
          company_name?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          contact_person_position?: string | null
          country?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string
          id?: string
          linkedin?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          moderation_block_reason?: string | null
          moderation_blocked?: boolean | null
          nif_cif?: string | null
          nif_verified?: boolean | null
          phone?: string
          photo_url?: string | null
          position?: string | null
          postal_code?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          registration_type?: string | null
          sector_id?: number
          specialization_id?: number
          state?: string
          status?: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
          verification_documents_url?: string[] | null
          verification_requested_at?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referred_email: string
          referred_id: string | null
          referrer_id: string
          reward_points: number | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_email: string
          referred_id?: string | null
          referrer_id: string
          reward_points?: number | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_email?: string
          referred_id?: string | null
          referrer_id?: string
          reward_points?: number | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      specializations: {
        Row: {
          created_at: string
          id: number
          name: string
          sector_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          sector_id: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          sector_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "specializations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ai_messages_limit: number | null
          chapter_access_level: string
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          ai_messages_limit?: number | null
          chapter_access_level: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          ai_messages_limit?: number | null
          chapter_access_level?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_ai_context: {
        Row: {
          context_data: Json | null
          id: string
          last_interaction: string | null
          professional_id: string
        }
        Insert: {
          context_data?: Json | null
          id?: string
          last_interaction?: string | null
          professional_id: string
        }
        Update: {
          context_data?: Json | null
          id?: string
          last_interaction?: string | null
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_context_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_events: {
        Row: {
          context_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          professional_id: string
          risk_score: number | null
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          professional_id: string
          risk_score?: number | null
        }
        Update: {
          context_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          professional_id?: string
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_events_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_penalties: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          penalty_type: string
          points_deducted: number | null
          professional_id: string
          reason: string
          restriction_until: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          penalty_type: string
          points_deducted?: number | null
          professional_id: string
          reason: string
          restriction_until?: string | null
          severity: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          penalty_type?: string
          points_deducted?: number | null
          professional_id?: string
          reason?: string
          restriction_until?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_penalties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_penalties_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          context: string | null
          context_id: string | null
          created_at: string
          description: string
          escalated_to_admin: boolean | null
          escalation_reason: string | null
          ethics_committee_resolution: string | null
          ethics_committee_reviewed_at: string | null
          ethics_committee_reviewed_by: string | null
          id: string
          report_type: string
          reported_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          context?: string | null
          context_id?: string | null
          created_at?: string
          description: string
          escalated_to_admin?: boolean | null
          escalation_reason?: string | null
          ethics_committee_resolution?: string | null
          ethics_committee_reviewed_at?: string | null
          ethics_committee_reviewed_by?: string | null
          id?: string
          report_type: string
          reported_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          context?: string | null
          context_id?: string | null
          created_at?: string
          description?: string
          escalated_to_admin?: boolean | null
          escalation_reason?: string | null
          ethics_committee_resolution?: string | null
          ethics_committee_reviewed_at?: string | null
          ethics_committee_reviewed_by?: string | null
          id?: string
          report_type?: string
          reported_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_ethics_committee_reviewed_by_fkey"
            columns: ["ethics_committee_reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
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
      verification_logs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          professional_id: string
          status: string
          verification_type: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          professional_id: string
          status: string
          verification_type: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          professional_id?: string
          status?: string
          verification_type?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_send_ai_message: {
        Args: { _professional_id: string }
        Returns: boolean
      }
      deduct_points: {
        Args: { points: number; prof_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_completed_meetings_count: {
        Args: { professional_uuid: string }
        Returns: number
      }
      get_ethics_committee_members: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          photo_url: string
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_subscription_access: {
        Args: { _professional_id: string; _required_level: string }
        Returns: boolean
      }
      increment_ai_messages: {
        Args: { _professional_id: string }
        Returns: undefined
      }
      is_ethics_committee_member: {
        Args: { _professional_id: string }
        Returns: boolean
      }
      validate_spanish_nif_cif: { Args: { nif_cif: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      professional_status:
        | "waiting_approval"
        | "approved"
        | "rejected"
        | "inactive"
      referral_status: "pending" | "completed" | "approved"
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
      app_role: ["admin", "user"],
      professional_status: [
        "waiting_approval",
        "approved",
        "rejected",
        "inactive",
      ],
      referral_status: ["pending", "completed", "approved"],
    },
  },
} as const
