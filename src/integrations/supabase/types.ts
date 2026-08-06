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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      favourites: {
        Row: {
          created_at: string
          id: string
          listing_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: number
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
          brand: string | null
          color: string | null
          condition: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: number
          model: string | null
          photos: string | null
          postage_pence: number
          price_pence: number | null
          promotion_active: boolean
          promotion_percent: number | null
          retail_price_pence: number | null
          seller_id: string | null
          size_category: Database["public"]["Enums"]["parcel_size"] | null
          size_eu: number | null
          size_uk: number
          status: string | null
          tag_verified: boolean
          title: string | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: number
          model?: string | null
          photos?: string | null
          postage_pence?: number
          price_pence?: number | null
          promotion_active?: boolean
          promotion_percent?: number | null
          retail_price_pence?: number | null
          seller_id?: string | null
          size_category?: Database["public"]["Enums"]["parcel_size"] | null
          size_eu?: number | null
          size_uk: number
          status?: string | null
          tag_verified?: boolean
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: number
          model?: string | null
          photos?: string | null
          postage_pence?: number
          price_pence?: number | null
          promotion_active?: boolean
          promotion_percent?: number | null
          retail_price_pence?: number | null
          seller_id?: string | null
          size_category?: Database["public"]["Enums"]["parcel_size"] | null
          size_eu?: number | null
          size_uk?: number
          status?: string | null
          tag_verified?: boolean
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
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
          data: Json | null
          id: string
          link: string | null
          payload: Json
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          payload?: Json
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          payload?: Json
          read?: boolean
          title?: string | null
          type?: string
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
          listing_id: number
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
          listing_id: number
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
          listing_id?: number
          message?: string | null
          parent_offer_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
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
          cancellation_agreed: boolean | null
          cancellation_reason: string | null
          cancellation_requested_by: string | null
          carrier: Database["public"]["Enums"]["carrier"]
          created_at: string
          dispute_description: string | null
          dispute_images: string[] | null
          dispute_raised_at: string | null
          dispute_status: string | null
          evri_delivered_at: string | null
          id: string
          listing_id: number
          payout_sent: boolean | null
          payout_transfer_id: string | null
          postage_pence: number
          price_pence: number
          qr_payload: string | null
          seller_id: string
          sendcloud_label_url: string | null
          sendcloud_parcel_id: string | null
          sendcloud_qr_url: string | null
          sendcloud_tracking_number: string | null
          service_label: string
          service_point_id: string | null
          ship_to_city: string
          ship_to_country: string
          ship_to_line1: string
          ship_to_line2: string | null
          ship_to_name: string
          ship_to_phone: string | null
          ship_to_postcode: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          total_pence: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancellation_agreed?: boolean | null
          cancellation_reason?: string | null
          cancellation_requested_by?: string | null
          carrier: Database["public"]["Enums"]["carrier"]
          created_at?: string
          dispute_description?: string | null
          dispute_images?: string[] | null
          dispute_raised_at?: string | null
          dispute_status?: string | null
          evri_delivered_at?: string | null
          id?: string
          listing_id: number
          payout_sent?: boolean | null
          payout_transfer_id?: string | null
          postage_pence?: number
          price_pence: number
          qr_payload?: string | null
          seller_id: string
          sendcloud_label_url?: string | null
          sendcloud_parcel_id?: string | null
          sendcloud_qr_url?: string | null
          sendcloud_tracking_number?: string | null
          service_label: string
          service_point_id?: string | null
          ship_to_city: string
          ship_to_country?: string
          ship_to_line1: string
          ship_to_line2?: string | null
          ship_to_name: string
          ship_to_phone?: string | null
          ship_to_postcode: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          total_pence: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancellation_agreed?: boolean | null
          cancellation_reason?: string | null
          cancellation_requested_by?: string | null
          carrier?: Database["public"]["Enums"]["carrier"]
          created_at?: string
          dispute_description?: string | null
          dispute_images?: string[] | null
          dispute_raised_at?: string | null
          dispute_status?: string | null
          evri_delivered_at?: string | null
          id?: string
          listing_id?: number
          payout_sent?: boolean | null
          payout_transfer_id?: string | null
          postage_pence?: number
          price_pence?: number
          qr_payload?: string | null
          seller_id?: string
          sendcloud_label_url?: string | null
          sendcloud_parcel_id?: string | null
          sendcloud_qr_url?: string | null
          sendcloud_tracking_number?: string | null
          service_label?: string
          service_point_id?: string | null
          ship_to_city?: string
          ship_to_country?: string
          ship_to_line1?: string
          ship_to_line2?: string | null
          ship_to_name?: string
          ship_to_phone?: string | null
          ship_to_postcode?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          total_pence?: number
          tracking_code?: string | null
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
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          full_name: string | null
          is_admin: boolean | null
          location: string | null
          phone: string | null
          postcode: string | null
          scanning_enabled: boolean
          scanning_payment_intent_id: string | null
          scanning_purchased_at: string | null
          stripe_connect_enabled: boolean | null
          stripe_connect_id: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          is_admin?: boolean | null
          location?: string | null
          phone?: string | null
          postcode?: string | null
          scanning_enabled?: boolean
          scanning_payment_intent_id?: string | null
          scanning_purchased_at?: string | null
          stripe_connect_enabled?: boolean | null
          stripe_connect_id?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          is_admin?: boolean | null
          location?: string | null
          phone?: string | null
          postcode?: string | null
          scanning_enabled?: boolean
          scanning_payment_intent_id?: string | null
          scanning_purchased_at?: string | null
          stripe_connect_enabled?: boolean | null
          stripe_connect_id?: string | null
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      thread_reads: {
        Row: {
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          location: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_scanning: {
        Args: {
          _stripe_payment_intent_id: string
        }
        Returns: undefined
      }
      create_order:
        | {
            Args: {
              _carrier: Database["public"]["Enums"]["carrier"]
              _listing_id: number
              _offer_id?: string
              _postage_pence: number
              _service_label: string
              _ship_to_city: string
              _ship_to_line1: string
              _ship_to_line2: string
              _ship_to_name: string
              _ship_to_postcode: string
              _stripe_payment_intent_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              _carrier: Database["public"]["Enums"]["carrier"]
              _listing_id: number
              _offer_id?: string
              _postage_pence: number
              _service_label: string
              _service_point_id?: string
              _ship_to_city: string
              _ship_to_line1: string
              _ship_to_line2: string
              _ship_to_name: string
              _ship_to_phone?: string
              _ship_to_postcode: string
              _stripe_payment_intent_id?: string
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
          listing_id: number
          postage_pence: number
          price_pence: number
          seller_id: string
          service_label: string
          ship_to_city: string
          ship_to_name: string
          ship_to_postcode: string
          status: string
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
      increment_listing_view: {
        Args: { _listing_id: number }
        Returns: undefined
      }
      insert_notification: {
        Args: {
          p_body?: string
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
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
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "expired"
        | "countered"
      order_status:
        | "pending_postage"
        | "label_created"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "disputed"
      parcel_size: "small" | "medium" | "large" | "extra_large"
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
  graphql_public: {
    Enums: {},
  },
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
      offer_status: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
        "countered",
      ],
      order_status: [
        "pending_postage",
        "label_created",
        "shipped",
        "delivered",
        "cancelled",
        "disputed",
      ],
      parcel_size: ["small", "medium", "large", "extra_large"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      report_target: ["listing", "message", "user", "thread"],
    },
  },
} as const
