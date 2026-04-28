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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_name: string | null
          coupon_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          service_id: string | null
          status: string | null
          total_price: number | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_name?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          status?: string | null
          total_price?: number | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_name?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          status?: string | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      barbershop_profiles: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          is_cloud: boolean
          is_locked: boolean
          mysql_profile_id: string | null
          name: string
          owner_email: string
          owner_name: string | null
          owner_password: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_cloud?: boolean
          is_locked?: boolean
          mysql_profile_id?: string | null
          name: string
          owner_email: string
          owner_name?: string | null
          owner_password: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_cloud?: boolean
          is_locked?: boolean
          mysql_profile_id?: string | null
          name?: string
          owner_email?: string
          owner_name?: string | null
          owner_password?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_profiles_mysql_profile_id_fkey"
            columns: ["mysql_profile_id"]
            isOneToOne: false
            referencedRelation: "mysql_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      chatpro_config: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          instance_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint?: string
          id?: string
          instance_id?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          instance_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_percent: number | null
          discount_value: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Relationships: []
      }
      mysql_profiles: {
        Row: {
          created_at: string
          database_name: string
          host: string
          id: string
          is_active: boolean
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          name: string
          password_encrypted: string
          port: number
          ssl_enabled: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          database_name: string
          host: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name: string
          password_encrypted: string
          port?: number
          ssl_enabled?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          database_name?: string
          host?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name?: string
          password_encrypted?: string
          port?: number
          ssl_enabled?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_price: number
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_price: number
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_price?: number
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          city: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_mode: string
          id: string
          neighborhood: string | null
          notes: string | null
          payment_method: string | null
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_mode?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_mode?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      prize_wheel_slices: {
        Row: {
          active: boolean
          created_at: string
          custom_prize: string | null
          discount_percent: number | null
          discount_value: number | null
          icon: string
          id: string
          image_url: string | null
          label: string
          probability: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_prize?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          icon?: string
          id?: string
          image_url?: string | null
          label: string
          probability?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_prize?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          icon?: string
          id?: string
          image_url?: string | null
          label?: string
          probability?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          price: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean | null
          created_at: string | null
          duration: string
          id: string
          image_url: string | null
          price: number
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          duration: string
          id?: string
          image_url?: string | null
          price: number
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          duration?: string
          id?: string
          image_url?: string | null
          price?: number
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      activate_mysql_profile: {
        Args: { _profile_id: string }
        Returns: undefined
      }
      deactivate_all_mysql_profiles: { Args: never; Returns: undefined }
      decrypt_mysql_password: { Args: { _encrypted: string }; Returns: string }
      encrypt_mysql_password: { Args: { _plain: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_owner_password: { Args: { _plain: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
