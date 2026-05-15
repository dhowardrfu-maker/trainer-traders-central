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
      favourites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string
          color: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string | null
          gender: Database["public"]["Enums"]["listing_gender"]
          id: string
          model: string | null
          photos: string[]
          price_pence: number
          seller_id: string
          size_eu: number | null
          size_uk: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          brand: string
          color?: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["listing_gender"]
          id?: string
          model?: string | null
          photos?: string[]
          price_pence: number
          seller_id: string
          size_eu?: number | null
          size_uk: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          brand?: string
          color?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["listing_gender"]
          id?: string
          model?: string | null
          photos?: string[]
          price_pence?: number
          seller_id?: string
          size_eu?: number | null
          size_uk?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount_pence: number
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          parent_offer_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          amount_pence: number
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          parent_offer_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          amount_pence?: number
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          parent_offer_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          carrier: Database["public"]["Enums"]["carrier"]
          created_at: string
          id: string
          listing_id: string
          postage_pence: number
          price_pence: number
          qr_payload: string
          seller_id: string
          service_label: string
          ship_to_city: string
          ship_to_country: string
          ship_to_line1: string
          ship_to_line2: string | null
          ship_to_name: string
          ship_to_postcode: string
          status: Database["public"]["Enums"]["order_status"]
          total_pence: number
          tracking_code: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          carrier: Database["public"]["Enums"]["carrier"]
          created_at?: string
          id?: string
          listing_id: string
          postage_pence?: number
          price_pence: number
          qr_payload: string
          seller_id: string
          service_label: string
          ship_to_city: string
          ship_to_country?: string
          ship_to_line1: string
          ship_to_line2?: string | null
          ship_to_name: string
          ship_to_postcode: string
          status?: Database["public"]["Enums"]["order_status"]
          total_pence: number
          tracking_code: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          carrier?: Database["public"]["Enums"]["carrier"]
          created_at?: string
          id?: string
          listing_id?: string
          postage_pence?: number
          price_pence?: number
          qr_payload?: string
          seller_id?: string
          service_label?: string
          ship_to_city?: string
          ship_to_country?: string
          ship_to_line1?: string
          ship_to_line2?: string | null
          ship_to_name?: string
          ship_to_postcode?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_pence?: number
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          _carrier: Database["public"]["Enums"]["carrier"]
          _listing_id: string
          _offer_id?: string
          _postage_pence: number
          _qr_payload: string
          _service_label: string
          _ship_to_city: string
          _ship_to_line1: string
          _ship_to_line2: string
          _ship_to_name: string
          _ship_to_postcode: string
          _tracking_code: string
        }
        Returns: string
      }
      get_my_sales: {
        Args: never
        Returns: {
          buyer_id: string
          carrier: Database["public"]["Enums"]["carrier"]
          created_at: string
          id: string
          listing_id: string
          postage_pence: number
          price_pence: number
          seller_id: string
          service_label: string
          ship_to_city: string
          ship_to_name: string
          ship_to_postcode: string
          status: Database["public"]["Enums"]["order_status"]
          total_pence: number
          tracking_code: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_thread_participant: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      carrier: "royal_mail" | "inpost" | "evri"
      listing_condition:
        | "new_with_tags"
        | "like_new"
        | "very_good"
        | "good"
        | "worn"
      listing_gender: "mens" | "womens" | "unisex" | "kids"
      listing_status: "draft" | "active" | "sold" | "removed"
      notification_type:
        | "offer_new"
        | "offer_accepted"
        | "offer_rejected"
        | "offer_countered"
        | "message_new"
        | "review_new"
        | "order_placed"
        | "order_shipped"
        | "order_delivered"
        | "favourite_new"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "countered"
        | "withdrawn"
        | "expired"
      order_status:
        | "pending_postage"
        | "label_created"
        | "shipped"
        | "delivered"
        | "cancelled"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      report_target: "listing" | "message" | "user" | "thread"
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
      carrier: ["royal_mail", "inpost", "evri"],
      listing_condition: [
        "new_with_tags",
        "like_new",
        "very_good",
        "good",
        "worn",
      ],
      listing_gender: ["mens", "womens", "unisex", "kids"],
      listing_status: ["draft", "active", "sold", "removed"],
      notification_type: [
        "offer_new",
        "offer_accepted",
        "offer_rejected",
        "offer_countered",
        "message_new",
        "review_new",
        "order_placed",
        "order_shipped",
        "order_delivered",
        "favourite_new",
      ],
      offer_status: [
        "pending",
        "accepted",
        "rejected",
        "countered",
        "withdrawn",
        "expired",
      ],
      order_status: [
        "pending_postage",
        "label_created",
        "shipped",
        "delivered",
        "cancelled",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      report_target: ["listing", "message", "user", "thread"],
    },
  },
} as const
