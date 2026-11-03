// Database types for Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReportType = 'lost' | 'found';
export type ReportStatus = 'active' | 'claim_accepted' | 'resolved' | 'closed';
export type ModerationState = 'visible' | 'hidden';
export type PhotoVisibility = 'public' | 'restricted';
export type MatchingStatus = 'pending' | 'running' | 'complete' | 'degraded' | 'failed';
export type MatchLabel = 'possible' | 'good' | 'strong';
export type ClaimStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'rejected'
  | 'withdrawn'
  | 'cancelled'
  | 'superseded';
export type ConversationStatus = 'open' | 'read_only';
export type FlagStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed';
export type FlagReason =
  | 'spam'
  | 'inappropriate'
  | 'suspicious_claim'
  | 'harassment'
  | 'personal_info'
  | 'other';
export type FlagTargetType = 'report' | 'claim' | 'conversation' | 'message' | 'profile';

export interface MatchReason {
  code: string;
  text: string;
}

export interface CandidateReport {
  id: string;
  report_type: ReportType;
  title: string;
  description: string;
  category_id: number;
  category_label: string;
  category_group: string;
  primary_color: string | null;
  brand: string | null;
  distinctive_features: string | null;
  campus_area_id: string;
  campus_area_label: string;
  location_note: string | null;
  occurred_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      campuses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      campus_areas: {
        Row: {
          id: string;
          campus_id: string;
          slug: string;
          label: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          campus_id: string;
          slug: string;
          label: string;
          sort_order: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          campus_id?: string;
          slug?: string;
          label?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          slug: string;
          label: string;
          group_slug: string;
          photo_visibility: PhotoVisibility;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: never;
          slug: string;
          label: string;
          group_slug: string;
          photo_visibility?: PhotoVisibility;
          sort_order: number;
          is_active?: boolean;
        };
        Update: {
          id?: never;
          slug?: string;
          label?: string;
          group_slug?: string;
          photo_visibility?: PhotoVisibility;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          owner_id: string;
          campus_id: string;
          report_type: ReportType;
          status: ReportStatus;
          moderation_state: ModerationState;
          hidden_at: string | null;
          hidden_by: string | null;
          hidden_reason: string | null;
          title: string;
          description: string;
          category_id: number;
          primary_color: string | null;
          brand: string | null;
          distinctive_features: string | null;
          campus_area_id: string;
          location_note: string | null;
          occurred_at: string;
          matching_status: MatchingStatus;
          matching_started_at: string | null;
          matching_finished_at: string | null;
          client_request_id: string | null;
          request_fingerprint: string | null;
          pending_claim_count: number;
          closed_at: string | null;
          closed_reason: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          campus_id: string;
          report_type: ReportType;
          status?: ReportStatus;
          moderation_state?: ModerationState;
          hidden_at?: string | null;
          hidden_by?: string | null;
          hidden_reason?: string | null;
          title: string;
          description: string;
          category_id: number;
          primary_color?: string | null;
          brand?: string | null;
          distinctive_features?: string | null;
          campus_area_id: string;
          location_note?: string | null;
          occurred_at: string;
          matching_status?: MatchingStatus;
          matching_started_at?: string | null;
          matching_finished_at?: string | null;
          client_request_id?: string | null;
          request_fingerprint?: string | null;
          pending_claim_count?: number;
          closed_at?: string | null;
          closed_reason?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          campus_id?: string;
          report_type?: ReportType;
          status?: ReportStatus;
          moderation_state?: ModerationState;
          hidden_at?: string | null;
          hidden_by?: string | null;
          hidden_reason?: string | null;
          title?: string;
          description?: string;
          category_id?: number;
          primary_color?: string | null;
          brand?: string | null;
          distinctive_features?: string | null;
          campus_area_id?: string;
          location_note?: string | null;
          occurred_at?: string;
          matching_status?: MatchingStatus;
          matching_started_at?: string | null;
          matching_finished_at?: string | null;
          client_request_id?: string | null;
          request_fingerprint?: string | null;
          pending_claim_count?: number;
          closed_at?: string | null;
          closed_reason?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_images: {
        Row: {
          id: string;
          report_id: string;
          bucket_id: string;
          object_path: string;
          sha256: string;
          bytes: number;
          width: number;
          height: number;
          removed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          bucket_id?: string;
          object_path: string;
          sha256: string;
          bytes: number;
          width: number;
          height: number;
          removed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          bucket_id?: string;
          object_path?: string;
          sha256?: string;
          bytes?: number;
          width?: number;
          height?: number;
          removed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      report_events: {
        Row: {
          id: string;
          report_id: string;
          actor_id: string | null;
          event_type: string;
          safe_public_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          actor_id?: string | null;
          event_type: string;
          safe_public_metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          actor_id?: string | null;
          event_type?: string;
          safe_public_metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          lost_report_id: string;
          found_report_id: string;
          label: MatchLabel;
          reasons: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lost_report_id: string;
          found_report_id: string;
          label: MatchLabel;
          reasons?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lost_report_id?: string;
          found_report_id?: string;
          label?: MatchLabel;
          reasons?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_match_usage: {
        Row: {
          id: string;
          user_id: string;
          report_id: string;
          quota_day: string;
          request_key: string;
          outcome: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_id: string;
          quota_day: string;
          request_key: string;
          outcome: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_id?: string;
          quota_day?: string;
          request_key?: string;
          outcome?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          report_id: string | null;
          match_id: string | null;
          claim_id: string | null;
          idempotency_key: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          report_id?: string | null;
          match_id?: string | null;
          claim_id?: string | null;
          idempotency_key: string;
          title: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          report_id?: string | null;
          match_id?: string | null;
          claim_id?: string | null;
          idempotency_key?: string;
          title?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          lost_report_id: string;
          found_report_id: string;
          claimant_id: string;
          finder_id: string;
          match_id: string | null;
          status: ClaimStatus;
          decision_note: string | null;
          decided_at: string | null;
          finder_confirmed_at: string | null;
          claimant_confirmed_at: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lost_report_id: string;
          found_report_id: string;
          claimant_id: string;
          finder_id: string;
          match_id?: string | null;
          status?: ClaimStatus;
          decision_note?: string | null;
          decided_at?: string | null;
          finder_confirmed_at?: string | null;
          claimant_confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lost_report_id?: string;
          found_report_id?: string;
          claimant_id?: string;
          finder_id?: string;
          match_id?: string | null;
          status?: ClaimStatus;
          decision_note?: string | null;
          decided_at?: string | null;
          finder_confirmed_at?: string | null;
          claimant_confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      claim_details: {
        Row: {
          claim_id: string;
          ownership_detail: string;
          created_at: string;
        };
        Insert: {
          claim_id: string;
          ownership_detail: string;
          created_at?: string;
        };
        Update: {
          claim_id?: string;
          ownership_detail?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          claim_id: string;
          status: ConversationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          client_message_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          client_message_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          client_message_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      flags: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: FlagTargetType;
          target_id: string;
          reason: FlagReason;
          details: string | null;
          status: FlagStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: FlagTargetType;
          target_id: string;
          reason: FlagReason;
          details?: string | null;
          status?: FlagStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: FlagTargetType;
          target_id?: string;
          reason?: FlagReason;
          details?: string | null;
          status?: FlagStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          id: string;
          admin_id: string;
          flag_id: string | null;
          target_type: string;
          target_id: string;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          flag_id?: string | null;
          target_type: string;
          target_id: string;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          flag_id?: string | null;
          target_type?: string;
          target_id?: string;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          key: string;
          count: number;
          window_start: string;
        };
        Insert: {
          id?: string;
          key: string;
          count?: number;
          window_start?: string;
        };
        Update: {
          id?: string;
          key?: string;
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          report_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { p_user_id?: string };
        Returns: boolean;
      };
      create_report: {
        Args: {
          p_owner_id: string;
          p_campus_id: string;
          p_report_type: ReportType;
          p_title: string;
          p_description: string;
          p_category_id: number;
          p_primary_color: string | null;
          p_brand: string | null;
          p_distinctive_features: string | null;
          p_campus_area_id: string;
          p_location_note: string | null;
          p_occurred_at: string;
          p_client_request_id: string | null;
          p_request_fingerprint: string | null;
          p_image_object_path?: string | null;
          p_image_sha256?: string | null;
          p_image_bytes?: number | null;
          p_image_width?: number | null;
          p_image_height?: number | null;
        };
        Returns: Database['public']['Tables']['reports']['Row'];
      };
      edit_report: {
        Args: {
          p_report_id: string;
          p_title: string;
          p_description: string;
          p_category_id: number;
          p_primary_color: string | null;
          p_brand: string | null;
          p_distinctive_features: string | null;
          p_campus_area_id: string;
          p_location_note: string | null;
          p_occurred_at: string;
        };
        Returns: Database['public']['Tables']['reports']['Row'];
      };
      close_report: {
        Args: {
          p_report_id: string;
          p_reason: string;
        };
        Returns: Database['public']['Tables']['reports']['Row'];
      };
      get_matching_candidates: {
        Args: { p_report_id: string };
        Returns: CandidateReport[];
      };
      reserve_ai_match_quota: {
        Args: {
          p_user_id: string;
          p_report_id: string;
          p_request_key: string;
        };
        Returns: boolean;
      };
      record_ai_match_usage: {
        Args: {
          p_request_key: string;
          p_outcome: string;
        };
        Returns: void;
      };
      finish_matching: {
        Args: {
          p_report_id: string;
          p_matches: Json;
          p_matching_status: MatchingStatus;
        };
        Returns: void;
      };
      submit_claim: {
        Args: {
          p_lost_report_id: string;
          p_found_report_id: string;
          p_ownership_detail: string;
          p_match_id?: string | null;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      accept_claim: {
        Args: {
          p_claim_id: string;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      reject_claim: {
        Args: {
          p_claim_id: string;
          p_decision_note?: string | null;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      withdraw_claim: {
        Args: {
          p_claim_id: string;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      cancel_handover: {
        Args: {
          p_claim_id: string;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      confirm_handover: {
        Args: {
          p_claim_id: string;
        };
        Returns: Database['public']['Tables']['claims']['Row'];
      };
      send_message: {
        Args: {
          p_conversation_id: string;
          p_body: string;
          p_client_message_id: string;
        };
        Returns: Database['public']['Tables']['messages']['Row'];
      };
      send_conversation_message: {
        Args: {
          p_conversation_id: string;
          p_body: string;
          p_client_message_id: string;
        };
        Returns: Database['public']['Tables']['messages']['Row'];
      };
      submit_flag: {
        Args: {
          p_target_type: string;
          p_target_id: string;
          p_reason: string;
          p_details?: string | null;
        };
        Returns: Database['public']['Tables']['flags']['Row'];
      };
      admin_read_flagged_claim: {
        Args: {
          p_flag_id: string;
        };
        Returns: Json;
      };
      admin_read_flagged_conversation: {
        Args: {
          p_flag_id: string;
        };
        Returns: Json;
      };
      admin_moderate_report: {
        Args: {
          p_flag_id: string;
          p_report_id: string;
          p_action: string;
          p_reason: string;
        };
        Returns: Database['public']['Tables']['reports']['Row'];
      };
      admin_resolve_flag: {
        Args: {
          p_flag_id: string;
          p_status: string;
          p_resolution_notes?: string | null;
        };
        Returns: Database['public']['Tables']['flags']['Row'];
      };
      get_admin_audit_logs: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          id: string;
          admin_id: string;
          admin_name: string;
          flag_id: string | null;
          target_type: string;
          target_id: string;
          action: string;
          metadata: Json;
          created_at: string;
        }[];
      };
    };
    Enums: {
      report_type: ReportType;
      report_status: ReportStatus;
      moderation_state: ModerationState;
      photo_visibility: PhotoVisibility;
      matching_status: MatchingStatus;
      match_label: MatchLabel;
      claim_status: ClaimStatus;
      conversation_status: ConversationStatus;
      flag_status: FlagStatus;
      flag_reason: FlagReason;
      flag_target_type: FlagTargetType;
    };
    CompositeTypes: Record<string, never>;
  };
}
