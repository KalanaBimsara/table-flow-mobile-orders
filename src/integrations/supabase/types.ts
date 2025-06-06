export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_analytics: {
        Row: {
          completed_orders: number | null
          created_at: string
          date: string
          id: string
          pending_orders: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          completed_orders?: number | null
          created_at?: string
          date: string
          id?: string
          pending_orders?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          completed_orders?: number | null
          created_at?: string
          date?: string
          id?: string
          pending_orders?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      monthly_analytics: {
        Row: {
          avg_order_value: number | null
          created_at: string
          id: string
          month: string
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_order_value?: number | null
          created_at?: string
          id?: string
          month: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_order_value?: number | null
          created_at?: string
          id?: string
          month?: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      order_tables: {
        Row: {
          colour: string
          created_at: string | null
          frame_colour: string | null
          id: string
          order_id: string | null
          price: number
          quantity: number
          size: string
          top_colour: string | null
        }
        Insert: {
          colour: string
          created_at?: string | null
          frame_colour?: string | null
          id?: string
          order_id?: string | null
          price: number
          quantity: number
          size: string
          top_colour?: string | null
        }
        Update: {
          colour?: string
          created_at?: string | null
          frame_colour?: string | null
          id?: string
          order_id?: string | null
          price?: number
          quantity?: number
          size?: string
          top_colour?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_charges: number | null
          address: string
          colour: string
          completed_at: string | null
          contact_number: string
          created_at: string | null
          created_by: string | null
          customer_name: string
          delivery_fee: number | null
          delivery_person_id: string | null
          delivery_status: string | null
          id: string
          note: string | null
          price: number
          quantity: number
          sales_person_name: string | null
          status: string | null
          table_size: string
          updated_at: string | null
        }
        Insert: {
          additional_charges?: number | null
          address: string
          colour: string
          completed_at?: string | null
          contact_number: string
          created_at?: string | null
          created_by?: string | null
          customer_name: string
          delivery_fee?: number | null
          delivery_person_id?: string | null
          delivery_status?: string | null
          id?: string
          note?: string | null
          price: number
          quantity: number
          sales_person_name?: string | null
          status?: string | null
          table_size: string
          updated_at?: string | null
        }
        Update: {
          additional_charges?: number | null
          address?: string
          colour?: string
          completed_at?: string | null
          contact_number?: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          delivery_fee?: number | null
          delivery_person_id?: string | null
          delivery_status?: string | null
          id?: string
          note?: string | null
          price?: number
          quantity?: number
          sales_person_name?: string | null
          status?: string | null
          table_size?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      production_bars: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_legs: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_table_tops: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      super_admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "super_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_daily_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: "customer" | "seller" | "delivery" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["customer", "seller", "delivery", "admin"],
    },
  },
} as const
