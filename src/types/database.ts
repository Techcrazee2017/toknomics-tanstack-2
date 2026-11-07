export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      gift_transactions: {
        Row: {
          created_at: string;
          diamond_cost: number;
          gift_id: string;
          gift_name: string;
          id: string;
          receiver_unique_id: string;
          repeat_count: number;
          room_id: string | null;
          sender_avatar: string | null;
          sender_unique_id: string;
          sender_user_id: string;
        };
        Insert: {
          created_at?: string;
          diamond_cost?: number;
          gift_id: string;
          gift_name: string;
          id?: string;
          receiver_unique_id: string;
          repeat_count?: number;
          room_id?: string | null;
          sender_avatar?: string | null;
          sender_unique_id: string;
          sender_user_id: string;
        };
        Update: {
          created_at?: string;
          diamond_cost?: number;
          gift_id?: string;
          gift_name?: string;
          id?: string;
          receiver_unique_id?: string;
          repeat_count?: number;
          room_id?: string | null;
          sender_avatar?: string | null;
          sender_unique_id?: string;
          sender_user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          tiktok_user_id: string;
          unique_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          tiktok_user_id: string;
          unique_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          tiktok_user_id?: string;
          unique_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tracked_targets: {
        Row: {
          created_at: string;
          id: string;
          is_live: boolean | null;
          is_registered_user: boolean | null;
          last_checked_at: string | null;
          unique_id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_live?: boolean | null;
          is_registered_user?: boolean | null;
          last_checked_at?: string | null;
          unique_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_live?: boolean | null;
          is_registered_user?: boolean | null;
          last_checked_at?: string | null;
          unique_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracked_targets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type TrackedTarget =
  Database["public"]["Tables"]["tracked_targets"]["Row"];
export type GiftTransaction =
  Database["public"]["Tables"]["gift_transactions"]["Row"];

export interface LeaderboardEntry {
  unique_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_diamonds: number;
  gift_count: number;
}

export interface GiftTransactionPayload {
  eventType: "INSERT";
  new: GiftTransaction;
  old: null;
  schema: "public";
  table: "gift_transactions";
}
