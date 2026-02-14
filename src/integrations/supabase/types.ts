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
      badges: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          unlock_condition: Json
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          unlock_condition?: Json
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          unlock_condition?: Json
        }
        Relationships: []
      }
      banner_clicks: {
        Row: {
          banner_id: string
          clicked_at: string
          id: string
          page_location: string
          professional_id: string | null
          session_id: string | null
        }
        Insert: {
          banner_id: string
          clicked_at?: string
          id?: string
          page_location: string
          professional_id?: string | null
          session_id?: string | null
        }
        Update: {
          banner_id?: string
          clicked_at?: string
          id?: string
          page_location?: string
          professional_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_clicks_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "premium_ad_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_clicks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_clicks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_impressions: {
        Row: {
          banner_id: string
          id: string
          page_location: string
          professional_id: string | null
          session_id: string | null
          viewed_at: string
        }
        Insert: {
          banner_id: string
          id?: string
          page_location: string
          professional_id?: string | null
          session_id?: string | null
          viewed_at?: string
        }
        Update: {
          banner_id?: string
          id?: string
          page_location?: string
          professional_id?: string | null
          session_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_impressions_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "premium_ad_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_impressions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banner_impressions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "behavioral_risk_scores_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_spheres: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      chapter_specialization_waitlist: {
        Row: {
          assigned_at: string | null
          chapter_id: string
          created_at: string
          expires_at: string | null
          id: string
          notified_at: string | null
          position_in_queue: number
          profession_specialization_id: number
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          chapter_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position_in_queue?: number
          profession_specialization_id: number
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          chapter_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position_in_queue?: number
          profession_specialization_id?: number
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_specialization_waitli_profession_specialization_id_fkey"
            columns: ["profession_specialization_id"]
            isOneToOne: false
            referencedRelation: "profession_specializations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_specialization_waitlist_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_specialization_waitlist_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_specialization_waitlist_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "chapters_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "chat_conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
      committee_rotations: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          is_founding: boolean | null
          member_1_id: string | null
          member_2_id: string | null
          member_3_id: string | null
          next_rotation_at: string
          rotation_date: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          is_founding?: boolean | null
          member_1_id?: string | null
          member_2_id?: string | null
          member_3_id?: string | null
          next_rotation_at?: string
          rotation_date?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          is_founding?: boolean | null
          member_1_id?: string | null
          member_2_id?: string | null
          member_3_id?: string | null
          next_rotation_at?: string
          rotation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_rotations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_1_id_fkey"
            columns: ["member_1_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_1_id_fkey"
            columns: ["member_1_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_2_id_fkey"
            columns: ["member_2_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_2_id_fkey"
            columns: ["member_2_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_3_id_fkey"
            columns: ["member_3_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_rotations_member_3_id_fkey"
            columns: ["member_3_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_chapter_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          matched_professional_id: string | null
          requested_profession_specialization_id: number | null
          requested_specialization_id: number | null
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          matched_professional_id?: string | null
          requested_profession_specialization_id?: number | null
          requested_specialization_id?: number | null
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          matched_professional_id?: string | null
          requested_profession_specialization_id?: number | null
          requested_specialization_id?: number | null
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_chapter_requests_matched_professional_id_fkey"
            columns: ["matched_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_chapter_requests_matched_professional_id_fkey"
            columns: ["matched_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_chapter_requests_requested_profession_specialization_fkey"
            columns: ["requested_profession_specialization_id"]
            isOneToOne: false
            referencedRelation: "profession_specializations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_chapter_requests_requested_specialization_id_fkey"
            columns: ["requested_specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_chapter_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_chapter_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          commission_amount: number | null
          commission_due_date: string | null
          commission_paid_at: string | null
          commission_status: string
          completed_at: string | null
          created_at: string
          deal_value: number | null
          declared_profit: number | null
          description: string
          id: string
          receiver_id: string
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_due_date?: string | null
          commission_paid_at?: string | null
          commission_status?: string
          completed_at?: string | null
          created_at?: string
          deal_value?: number | null
          declared_profit?: number | null
          description: string
          id?: string
          receiver_id: string
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_due_date?: string | null
          commission_paid_at?: string | null
          commission_status?: string
          completed_at?: string | null
          created_at?: string
          deal_value?: number | null
          declared_profit?: number | null
          description?: string
          id?: string
          receiver_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "ethics_committee_decisions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expulsion_reviews: {
        Row: {
          auto_expire_at: string
          created_at: string
          decided_at: string | null
          id: string
          professional_id: string
          status: string
          trigger_details: Json | null
          trigger_type: string
          votes_against: number
          votes_extend: number
          votes_for_expulsion: number
        }
        Insert: {
          auto_expire_at?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          professional_id: string
          status?: string
          trigger_details?: Json | null
          trigger_type?: string
          votes_against?: number
          votes_extend?: number
          votes_for_expulsion?: number
        }
        Update: {
          auto_expire_at?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          professional_id?: string
          status?: string
          trigger_details?: Json | null
          trigger_type?: string
          votes_against?: number
          votes_extend?: number
          votes_for_expulsion?: number
        }
        Relationships: [
          {
            foreignKeyName: "expulsion_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expulsion_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expulsion_votes: {
        Row: {
          created_at: string
          id: string
          reasoning: string
          review_id: string
          vote: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reasoning: string
          review_id: string
          vote: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reasoning?: string
          review_id?: string
          vote?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expulsion_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "expulsion_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expulsion_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expulsion_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inactivity_warnings: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          last_referral_given_at: string | null
          message: string
          months_inactive: number
          professional_id: string
          warning_level: number
          warning_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          last_referral_given_at?: string | null
          message: string
          months_inactive: number
          professional_id: string
          warning_level?: number
          warning_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          last_referral_given_at?: string | null
          message?: string
          months_inactive?: number
          professional_id?: string
          warning_level?: number
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inactivity_warnings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inactivity_warnings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lovable_interactions: {
        Row: {
          action_taken: string | null
          created_at: string
          ebs_change: number | null
          emotional_state_after: string | null
          emotional_state_before: string | null
          id: string
          interaction_type: string
          message_content: string | null
          outcome: string | null
          professional_id: string
          retention_change: number | null
          reward_id: string | null
          trust_change: number | null
          user_response: Json | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          ebs_change?: number | null
          emotional_state_after?: string | null
          emotional_state_before?: string | null
          id?: string
          interaction_type: string
          message_content?: string | null
          outcome?: string | null
          professional_id: string
          retention_change?: number | null
          reward_id?: string | null
          trust_change?: number | null
          user_response?: Json | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          ebs_change?: number | null
          emotional_state_after?: string | null
          emotional_state_before?: string | null
          id?: string
          interaction_type?: string
          message_content?: string | null
          outcome?: string | null
          professional_id?: string
          retention_change?: number | null
          reward_id?: string | null
          trust_change?: number | null
          user_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lovable_interactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lovable_interactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lovable_interactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "user_micro_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      lovable_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message_type: string
          professional_id: string
          read_at: string | null
          title: string
          tone: string | null
          trigger_action: string | null
          trigger_state: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message_type: string
          professional_id: string
          read_at?: string | null
          title: string
          tone?: string | null
          trigger_action?: string | null
          trigger_state?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message_type?: string
          professional_id?: string
          read_at?: string | null
          title?: string
          tone?: string | null
          trigger_action?: string | null
          trigger_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lovable_messages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lovable_messages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_waitlist: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contacted_at: string | null
          id: string
          is_current_user: boolean | null
          notes: string | null
          position_in_queue: number | null
          professional_id: string | null
          requested_at: string | null
          status: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contacted_at?: string | null
          id?: string
          is_current_user?: boolean | null
          notes?: string | null
          position_in_queue?: number | null
          professional_id?: string | null
          requested_at?: string | null
          status?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          contacted_at?: string | null
          id?: string
          is_current_user?: boolean | null
          notes?: string | null
          position_in_queue?: number | null
          professional_id?: string | null
          requested_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_waitlist_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_waitlist_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "meetings_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_reward_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          duration_hours: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_value: number | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_value?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_value?: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "moderation_violations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "offer_contacts_interested_professional_id_fkey"
            columns: ["interested_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "offers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "penalty_appeals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "point_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_with_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_with_visibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_with_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_with_visibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_ad_banners: {
        Row: {
          banner_image_url: string
          banner_size: string
          campaign_name: string
          click_url: string
          company_logo_url: string | null
          company_name: string
          contract_reference: string | null
          created_at: string
          created_by_admin: string | null
          daily_impression_limit: number | null
          display_priority: number
          end_date: string
          id: string
          is_active: boolean
          monthly_price: number | null
          notes: string | null
          start_date: string
          target_location: string
          total_impression_limit: number | null
          updated_at: string
        }
        Insert: {
          banner_image_url: string
          banner_size: string
          campaign_name: string
          click_url: string
          company_logo_url?: string | null
          company_name: string
          contract_reference?: string | null
          created_at?: string
          created_by_admin?: string | null
          daily_impression_limit?: number | null
          display_priority?: number
          end_date: string
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          notes?: string | null
          start_date: string
          target_location?: string
          total_impression_limit?: number | null
          updated_at?: string
        }
        Update: {
          banner_image_url?: string
          banner_size?: string
          campaign_name?: string
          click_url?: string
          company_logo_url?: string | null
          company_name?: string
          contract_reference?: string | null
          created_at?: string
          created_by_admin?: string | null
          daily_impression_limit?: number | null
          display_priority?: number
          end_date?: string
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          notes?: string | null
          start_date?: string
          target_location?: string
          total_impression_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      premium_marketplace_slots: {
        Row: {
          category_id: number | null
          company_logo_url: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contract_end_date: string
          contract_reference: string | null
          contract_start_date: string
          created_at: string | null
          created_by_admin: string | null
          description: string
          display_order: number | null
          id: string
          is_external_company: boolean
          is_featured: boolean | null
          professional_id: string | null
          slot_number: number
          status: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          category_id?: number | null
          company_logo_url?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contract_end_date: string
          contract_reference?: string | null
          contract_start_date: string
          created_at?: string | null
          created_by_admin?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_external_company?: boolean
          is_featured?: boolean | null
          professional_id?: string | null
          slot_number: number
          status?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          category_id?: number | null
          company_logo_url?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          contract_end_date?: string
          contract_reference?: string | null
          contract_start_date?: string
          created_at?: string | null
          created_by_admin?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_external_company?: boolean
          is_featured?: boolean | null
          professional_id?: string | null
          slot_number?: number
          status?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_marketplace_slots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_marketplace_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_marketplace_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_slot_views: {
        Row: {
          id: string
          ip_address: string | null
          slot_id: string | null
          viewed_at: string | null
          viewed_by_professional_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          slot_id?: string | null
          viewed_at?: string | null
          viewed_by_professional_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          slot_id?: string | null
          viewed_at?: string | null
          viewed_by_professional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_slot_views_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "premium_marketplace_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_slot_views_viewed_by_professional_id_fkey"
            columns: ["viewed_by_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_slot_views_viewed_by_professional_id_fkey"
            columns: ["viewed_by_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profession_specializations: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          specialization_id: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          specialization_id: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          specialization_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "profession_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_badges: {
        Row: {
          badge_id: string
          id: string
          professional_id: string
          unlocked_at: string
        }
        Insert: {
          badge_id: string
          id?: string
          professional_id: string
          unlocked_at?: string
        }
        Update: {
          badge_id?: string
          id?: string
          professional_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_badges_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_badges_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
          birth_date: string | null
          business_description: string | null
          business_name: string | null
          business_sphere_id: number | null
          business_verified: boolean | null
          chapter_id: string | null
          city: string | null
          company_address: string | null
          company_cif: string | null
          company_name: string | null
          contact_person_name: string | null
          contact_person_phone: string | null
          contact_person_position: string | null
          country: string | null
          created_at: string
          deals_completed: number
          email: string
          email_verified: boolean | null
          expulsion_count: number
          full_name: string
          id: string
          is_chapter_founder: boolean | null
          last_expulsion_at: string | null
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
          profession_specialization_id: number | null
          referral_code: string | null
          referred_by_code: string | null
          registration_type: string | null
          sector_id: number | null
          specialization_id: number | null
          state: string | null
          status: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at: string | null
          subscription_plan_id: string | null
          subscription_starts_at: string | null
          subscription_status: string | null
          total_deal_value: number
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
          birth_date?: string | null
          business_description?: string | null
          business_name?: string | null
          business_sphere_id?: number | null
          business_verified?: boolean | null
          chapter_id?: string | null
          city?: string | null
          company_address?: string | null
          company_cif?: string | null
          company_name?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          contact_person_position?: string | null
          country?: string | null
          created_at?: string
          deals_completed?: number
          email: string
          email_verified?: boolean | null
          expulsion_count?: number
          full_name: string
          id?: string
          is_chapter_founder?: boolean | null
          last_expulsion_at?: string | null
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
          profession_specialization_id?: number | null
          referral_code?: string | null
          referred_by_code?: string | null
          registration_type?: string | null
          sector_id?: number | null
          specialization_id?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          total_deal_value?: number
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
          birth_date?: string | null
          business_description?: string | null
          business_name?: string | null
          business_sphere_id?: number | null
          business_verified?: boolean | null
          chapter_id?: string | null
          city?: string | null
          company_address?: string | null
          company_cif?: string | null
          company_name?: string | null
          contact_person_name?: string | null
          contact_person_phone?: string | null
          contact_person_position?: string | null
          country?: string | null
          created_at?: string
          deals_completed?: number
          email?: string
          email_verified?: boolean | null
          expulsion_count?: number
          full_name?: string
          id?: string
          is_chapter_founder?: boolean | null
          last_expulsion_at?: string | null
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
          profession_specialization_id?: number | null
          referral_code?: string | null
          referred_by_code?: string | null
          registration_type?: string | null
          sector_id?: number | null
          specialization_id?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["professional_status"]
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          total_deal_value?: number
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
            foreignKeyName: "professionals_business_sphere_id_fkey"
            columns: ["business_sphere_id"]
            isOneToOne: false
            referencedRelation: "business_spheres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_profession_specialization_id_fkey"
            columns: ["profession_specialization_id"]
            isOneToOne: false
            referencedRelation: "profession_specializations"
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
      push_notification_log: {
        Row: {
          body: string
          clicked_at: string | null
          id: string
          notification_type: string
          professional_id: string
          sent_at: string
          title: string
          url: string | null
        }
        Insert: {
          body: string
          clicked_at?: string | null
          id?: string
          notification_type?: string
          professional_id: string
          sent_at?: string
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          clicked_at?: string | null
          id?: string
          notification_type?: string
          professional_id?: string
          sent_at?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flag_alerts: {
        Row: {
          admin_notes: string | null
          ai_analysis: string
          ai_confidence: number
          alert_type: string
          created_at: string
          evidence: Json
          id: string
          professional_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis: string
          ai_confidence?: number
          alert_type: string
          created_at?: string
          evidence?: Json
          id?: string
          professional_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: string
          ai_confidence?: number
          alert_type?: string
          created_at?: string
          evidence?: Json
          id?: string
          professional_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_flag_alerts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_alerts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reentry_requests: {
        Row: {
          admin_notes: string | null
          committee_review_id: string | null
          created_at: string
          eligible_at: string
          id: string
          professional_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          committee_review_id?: string | null
          created_at?: string
          eligible_at: string
          id?: string
          professional_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          committee_review_id?: string | null
          created_at?: string
          eligible_at?: string
          id?: string
          professional_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reentry_requests_committee_review_id_fkey"
            columns: ["committee_review_id"]
            isOneToOne: false
            referencedRelation: "expulsion_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reentry_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reentry_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reentry_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reentry_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      report_votes: {
        Row: {
          created_at: string
          id: string
          reasoning: string
          report_id: string
          severity: string | null
          vote: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reasoning: string
          report_id: string
          severity?: string | null
          vote: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reasoning?: string
          report_id?: string
          severity?: string | null
          vote?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_votes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "user_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
      sphere_collaborative_projects: {
        Row: {
          business_sphere_id: number
          chapter_id: string
          created_at: string
          creator_id: string
          description: string
          id: string
          required_specializations: number[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_sphere_id: number
          chapter_id: string
          created_at?: string
          creator_id: string
          description: string
          id?: string
          required_specializations?: number[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_sphere_id?: number
          chapter_id?: string
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          required_specializations?: number[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sphere_collaborative_projects_business_sphere_id_fkey"
            columns: ["business_sphere_id"]
            isOneToOne: false
            referencedRelation: "business_spheres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_collaborative_projects_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_collaborative_projects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_collaborative_projects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sphere_internal_references: {
        Row: {
          business_sphere_id: number
          client_name: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          points_awarded: number | null
          referred_to_id: string
          referrer_id: string
          service_needed: string
          status: string
        }
        Insert: {
          business_sphere_id: number
          client_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          points_awarded?: number | null
          referred_to_id: string
          referrer_id: string
          service_needed: string
          status?: string
        }
        Update: {
          business_sphere_id?: number
          client_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          points_awarded?: number | null
          referred_to_id?: string
          referrer_id?: string
          service_needed?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sphere_internal_references_business_sphere_id_fkey"
            columns: ["business_sphere_id"]
            isOneToOne: false
            referencedRelation: "business_spheres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_internal_references_referred_to_id_fkey"
            columns: ["referred_to_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_internal_references_referred_to_id_fkey"
            columns: ["referred_to_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_internal_references_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_internal_references_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sphere_project_participants: {
        Row: {
          contribution_notes: string | null
          created_at: string
          id: string
          profession_specialization_id: number | null
          professional_id: string
          project_id: string
          status: string
        }
        Insert: {
          contribution_notes?: string | null
          created_at?: string
          id?: string
          profession_specialization_id?: number | null
          professional_id: string
          project_id: string
          status?: string
        }
        Update: {
          contribution_notes?: string | null
          created_at?: string
          id?: string
          profession_specialization_id?: number | null
          professional_id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sphere_project_participants_profession_specialization_id_fkey"
            columns: ["profession_specialization_id"]
            isOneToOne: false
            referencedRelation: "profession_specializations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_project_participants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_project_participants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_project_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sphere_collaborative_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sphere_specializations: {
        Row: {
          business_sphere_id: number | null
          created_at: string | null
          id: number
          is_core: boolean | null
          specialization_id: number | null
        }
        Insert: {
          business_sphere_id?: number | null
          created_at?: string | null
          id?: number
          is_core?: boolean | null
          specialization_id?: number | null
        }
        Update: {
          business_sphere_id?: number | null
          created_at?: string | null
          id?: number
          is_core?: boolean | null
          specialization_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sphere_specializations_business_sphere_id_fkey"
            columns: ["business_sphere_id"]
            isOneToOne: false
            referencedRelation: "business_spheres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sphere_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
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
      user_activity_tracking: {
        Row: {
          activity_score: number | null
          created_at: string | null
          id: string
          inactivity_days: number | null
          last_comment: string | null
          last_like: string | null
          last_login: string | null
          last_meeting_request: string | null
          last_notification_sent: string | null
          last_offer_contact: string | null
          last_post_created: string | null
          professional_id: string
          reengagement_stage: string | null
          updated_at: string | null
        }
        Insert: {
          activity_score?: number | null
          created_at?: string | null
          id?: string
          inactivity_days?: number | null
          last_comment?: string | null
          last_like?: string | null
          last_login?: string | null
          last_meeting_request?: string | null
          last_notification_sent?: string | null
          last_offer_contact?: string | null
          last_post_created?: string | null
          professional_id: string
          reengagement_stage?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_score?: number | null
          created_at?: string | null
          id?: string
          inactivity_days?: number | null
          last_comment?: string | null
          last_like?: string | null
          last_login?: string | null
          last_meeting_request?: string | null
          last_notification_sent?: string | null
          last_offer_contact?: string | null
          last_post_created?: string | null
          professional_id?: string
          reengagement_stage?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_tracking_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_tracking_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_ai_context_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals_public"
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
          {
            foreignKeyName: "user_behavior_events_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emotional_metrics: {
        Row: {
          abandonment_sensitivity: number | null
          created_at: string
          ebs_history: Json | null
          effective_message_tones: Json | null
          emotional_bond_score: number | null
          id: string
          natural_activity_rhythm: Json | null
          preferred_reward_types: Json | null
          professional_id: string
          referral_response_rate: number | null
          retention_history: Json | null
          retention_probability: number | null
          trust_history: Json | null
          trust_index: number | null
          updated_at: string
        }
        Insert: {
          abandonment_sensitivity?: number | null
          created_at?: string
          ebs_history?: Json | null
          effective_message_tones?: Json | null
          emotional_bond_score?: number | null
          id?: string
          natural_activity_rhythm?: Json | null
          preferred_reward_types?: Json | null
          professional_id: string
          referral_response_rate?: number | null
          retention_history?: Json | null
          retention_probability?: number | null
          trust_history?: Json | null
          trust_index?: number | null
          updated_at?: string
        }
        Update: {
          abandonment_sensitivity?: number | null
          created_at?: string
          ebs_history?: Json | null
          effective_message_tones?: Json | null
          emotional_bond_score?: number | null
          id?: string
          natural_activity_rhythm?: Json | null
          preferred_reward_types?: Json | null
          professional_id?: string
          referral_response_rate?: number | null
          retention_history?: Json | null
          retention_probability?: number | null
          trust_history?: Json | null
          trust_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_emotional_metrics_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emotional_metrics_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emotional_states: {
        Row: {
          activity_quality_score: number | null
          created_at: string
          days_since_last_activity: number | null
          effort_signals: Json | null
          emotional_state: string
          energy_trend: string | null
          id: string
          last_activity_timestamp: string | null
          marketplace_actions_24h: number | null
          meetings_count_24h: number | null
          messages_count_24h: number | null
          previous_state: string | null
          professional_id: string
          referrals_count_24h: number | null
          snapshot_generated_at: string | null
          state_changed_at: string | null
          updated_at: string
        }
        Insert: {
          activity_quality_score?: number | null
          created_at?: string
          days_since_last_activity?: number | null
          effort_signals?: Json | null
          emotional_state?: string
          energy_trend?: string | null
          id?: string
          last_activity_timestamp?: string | null
          marketplace_actions_24h?: number | null
          meetings_count_24h?: number | null
          messages_count_24h?: number | null
          previous_state?: string | null
          professional_id: string
          referrals_count_24h?: number | null
          snapshot_generated_at?: string | null
          state_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          activity_quality_score?: number | null
          created_at?: string
          days_since_last_activity?: number | null
          effort_signals?: Json | null
          emotional_state?: string
          energy_trend?: string | null
          id?: string
          last_activity_timestamp?: string | null
          marketplace_actions_24h?: number | null
          meetings_count_24h?: number | null
          messages_count_24h?: number | null
          previous_state?: string | null
          professional_id?: string
          referrals_count_24h?: number | null
          snapshot_generated_at?: string | null
          state_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_emotional_states_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emotional_states_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_micro_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          metadata: Json | null
          professional_id: string
          reward_type_id: string
          status: string | null
          trigger_action: string | null
          trigger_state: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          metadata?: Json | null
          professional_id: string
          reward_type_id: string
          status?: string | null
          trigger_action?: string | null
          trigger_state?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          metadata?: Json | null
          professional_id?: string
          reward_type_id?: string
          status?: string | null
          trigger_action?: string | null
          trigger_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_micro_rewards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_micro_rewards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_micro_rewards_reward_type_id_fkey"
            columns: ["reward_type_id"]
            isOneToOne: false
            referencedRelation: "micro_reward_types"
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
            foreignKeyName: "user_penalties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_penalties_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_penalties_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "user_reports_ethics_committee_reviewed_by_fkey"
            columns: ["ethics_committee_reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
      user_weekly_goals: {
        Row: {
          chapter_goal: number | null
          chapter_member_count: number | null
          comments_this_week: number | null
          consecutive_months_with_meeting: number | null
          consecutive_weeks_with_referral: number | null
          created_at: string | null
          id: string
          last_suggestion_shown: string | null
          meetings_goal_month: number | null
          meetings_this_month: number | null
          month_start: string
          posts_this_week: number | null
          professional_id: string
          referrals_goal_week: number | null
          referrals_this_week: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          chapter_goal?: number | null
          chapter_member_count?: number | null
          comments_this_week?: number | null
          consecutive_months_with_meeting?: number | null
          consecutive_weeks_with_referral?: number | null
          created_at?: string | null
          id?: string
          last_suggestion_shown?: string | null
          meetings_goal_month?: number | null
          meetings_this_month?: number | null
          month_start: string
          posts_this_week?: number | null
          professional_id: string
          referrals_goal_week?: number | null
          referrals_this_week?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          chapter_goal?: number | null
          chapter_member_count?: number | null
          comments_this_week?: number | null
          consecutive_months_with_meeting?: number | null
          consecutive_weeks_with_referral?: number | null
          created_at?: string | null
          id?: string
          last_suggestion_shown?: string | null
          meetings_goal_month?: number | null
          meetings_this_month?: number | null
          month_start?: string
          posts_this_week?: number | null
          professional_id?: string
          referrals_goal_week?: number | null
          referrals_this_week?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weekly_goals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_weekly_goals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vapid_keys: {
        Row: {
          created_at: string
          id: string
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: string
          private_key?: string
          public_key?: string
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
            foreignKeyName: "verification_logs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      posts_with_authors: {
        Row: {
          author_business: string | null
          author_name: string | null
          author_photo: string | null
          author_position: string | null
          content: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          professional_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_with_visibility: {
        Row: {
          author_business: string | null
          author_name: string | null
          author_photo: string | null
          author_position: string | null
          content: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          professional_id: string | null
          updated_at: string | null
          visibility_boost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals_public: {
        Row: {
          bio: string | null
          business_description: string | null
          business_name: string | null
          business_sphere_id: number | null
          chapter_id: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          linkedin_url: string | null
          logo_url: string | null
          photo_url: string | null
          position: string | null
          profession_specialization_id: number | null
          sector_id: number | null
          specialization_id: number | null
          state: string | null
          status: Database["public"]["Enums"]["professional_status"] | null
          total_points: number | null
          updated_at: string | null
          video_url: string | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          business_description?: string | null
          business_name?: string | null
          business_sphere_id?: number | null
          chapter_id?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          photo_url?: string | null
          position?: string | null
          profession_specialization_id?: number | null
          sector_id?: number | null
          specialization_id?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["professional_status"] | null
          total_points?: number | null
          updated_at?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          business_description?: string | null
          business_name?: string | null
          business_sphere_id?: number | null
          chapter_id?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          photo_url?: string | null
          position?: string | null
          profession_specialization_id?: number | null
          sector_id?: number | null
          specialization_id?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["professional_status"] | null
          total_points?: number | null
          updated_at?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_business_sphere_id_fkey"
            columns: ["business_sphere_id"]
            isOneToOne: false
            referencedRelation: "business_spheres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_profession_specialization_id_fkey"
            columns: ["profession_specialization_id"]
            isOneToOne: false
            referencedRelation: "profession_specializations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      banner_has_reached_limits: {
        Args: { _banner_id: string }
        Returns: boolean
      }
      calculate_activity_score: {
        Args: { _professional_id: string }
        Returns: number
      }
      calculate_banner_ctr: { Args: { _banner_id: string }; Returns: number }
      calculate_sphere_synergy_score: {
        Args: { _professional_id: string }
        Returns: number
      }
      calculate_user_weekly_goals: {
        Args: { p_professional_id: string }
        Returns: {
          chapter_member_count: number
          comments_this_week: number
          days_until_month_end: number
          days_until_week_end: number
          meetings_this_month: number
          posts_this_week: number
          referrals_this_week: number
        }[]
      }
      can_send_ai_message: {
        Args: { _professional_id: string }
        Returns: boolean
      }
      cast_expulsion_vote: {
        Args: {
          _reasoning: string
          _review_id: string
          _vote: string
          _voter_id: string
        }
        Returns: Json
      }
      cast_report_vote: {
        Args: {
          _reasoning?: string
          _report_id: string
          _severity?: string
          _vote: string
          _voter_id: string
        }
        Returns: Json
      }
      check_overdue_commissions: { Args: never; Returns: undefined }
      check_specialization_availability: {
        Args: { _chapter_id: string; _profession_specialization_id: number }
        Returns: boolean
      }
      classify_emotional_state: {
        Args: {
          _activity_score: number
          _days_inactive: number
          _energy_trend: string
          _previous_state: string
          _recent_achievements: number
          _total_points: number
        }
        Returns: string
      }
      deduct_points: {
        Args: { points: number; prof_id: string }
        Returns: undefined
      }
      determine_reengagement_stage: {
        Args: { _activity_score: number; _inactivity_days: number }
        Returns: string
      }
      find_top_professionals_by_specialization: {
        Args: {
          p_exclude_chapter_id?: string
          p_profession_specialization_id?: number
          p_specialization_id?: number
        }
        Returns: {
          chapter_city: string
          chapter_name: string
          professional_chapter_id: string
          professional_company: string
          professional_id: string
          professional_name: string
          professional_photo: string
          professional_points: number
          professional_position: string
          rank_in_chapter: number
          specialization_name: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      get_available_chapters_for_specialization: {
        Args: { _profession_specialization_id: number; _state?: string }
        Returns: {
          chapter_id: string
          chapter_name: string
          city: string
          member_count: number
          state: string
        }[]
      }
      get_available_slots_count: { Args: never; Returns: number }
      get_completed_meetings_count: {
        Args: { professional_uuid: string }
        Returns: number
      }
      get_ethics_committee_members:
        | {
            Args: never
            Returns: {
              email: string
              full_name: string
              id: string
              photo_url: string
              total_points: number
            }[]
          }
        | {
            Args: { _chapter_id?: string }
            Returns: {
              email: string
              full_name: string
              id: string
              photo_url: string
              total_points: number
            }[]
          }
      get_lovable_action: { Args: { _emotional_state: string }; Returns: Json }
      get_next_banner_to_display: {
        Args: { _location: string }
        Returns: string
      }
      get_visibility_boost_percentage: {
        Args: { _professional_id: string }
        Returns: number
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
      has_visibility_boost: {
        Args: { _professional_id: string }
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
      update_waitlist_positions: { Args: never; Returns: undefined }
      upsert_user_weekly_goals: {
        Args: { p_professional_id: string }
        Returns: undefined
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
