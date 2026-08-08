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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          body_part: string | null
          body_region: string | null
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          gif_path: string | null
          id: string
          instructions: string[]
          is_active: boolean
          movement_pattern: string | null
          name: string
          secondary_muscles: string[]
          tags: string[]
          target_muscle: string | null
          updated_at: string
        }
        Insert: {
          body_part?: string | null
          body_region?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          gif_path?: string | null
          id: string
          instructions?: string[]
          is_active?: boolean
          movement_pattern?: string | null
          name: string
          secondary_muscles?: string[]
          tags?: string[]
          target_muscle?: string | null
          updated_at?: string
        }
        Update: {
          body_part?: string | null
          body_region?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          gif_path?: string | null
          id?: string
          instructions?: string[]
          is_active?: boolean
          movement_pattern?: string | null
          name?: string
          secondary_muscles?: string[]
          tags?: string[]
          target_muscle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      generation_sessions: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          duration_weeks: number
          id: string
          questionnaire_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          duration_weeks?: number
          id?: string
          questionnaire_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          duration_weeks?: number
          id?: string
          questionnaire_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_sessions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          label: string
          metric: string
          user_id: string
          value: number
          workout_id: string | null
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          label: string
          metric?: string
          user_id: string
          value: number
          workout_id?: string | null
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          label?: string
          metric?: string
          user_id?: string
          value?: number
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bonus_credits: number
          created_at: string
          disliked_exercises: string[]
          display_name: string | null
          email: string | null
          experience: string | null
          favorite_exercises: string[]
          fitness_level: string | null
          gender: string | null
          height_cm: number | null
          id: string
          limitations: string[]
          onboarded: boolean
          preferred_categories: string[]
          preferred_environment: string | null
          preferred_equipment: string[]
          primary_goal: string | null
          secondary_goal: string | null
          training_frequency: number | null
          typical_duration_min: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          disliked_exercises?: string[]
          display_name?: string | null
          email?: string | null
          experience?: string | null
          favorite_exercises?: string[]
          fitness_level?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          limitations?: string[]
          onboarded?: boolean
          preferred_categories?: string[]
          preferred_environment?: string | null
          preferred_equipment?: string[]
          primary_goal?: string | null
          secondary_goal?: string | null
          training_frequency?: number | null
          typical_duration_min?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          disliked_exercises?: string[]
          display_name?: string | null
          email?: string | null
          experience?: string | null
          favorite_exercises?: string[]
          fitness_level?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          limitations?: string[]
          onboarded?: boolean
          preferred_categories?: string[]
          preferred_environment?: string | null
          preferred_equipment?: string[]
          primary_goal?: string | null
          secondary_goal?: string | null
          training_frequency?: number | null
          typical_duration_min?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      questionnaires: {
        Row: {
          created_at: string
          data: Json
          duration_weeks: number | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          duration_weeks?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          duration_weeks?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      workout_feedback: {
        Row: {
          comment: string | null
          created_at: string
          difficulty_rating: string | null
          enjoyed: string | null
          feeling: string | null
          id: string
          user_id: string
          workout_id: string
          would_repeat: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          difficulty_rating?: string | null
          enjoyed?: string | null
          feeling?: string | null
          id?: string
          user_id: string
          workout_id: string
          would_repeat?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          difficulty_rating?: string | null
          enjoyed?: string | null
          feeling?: string | null
          id?: string
          user_id?: string
          workout_id?: string
          would_repeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_feedback_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          id: string
          is_final: boolean
          plan: Json
          rationale: string | null
          refinement_note: string | null
          session_id: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_final?: boolean
          plan: Json
          rationale?: string | null
          refinement_note?: string | null
          session_id: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_final?: boolean
          plan?: Json
          rationale?: string | null
          refinement_note?: string | null
          session_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          difficulty_stars: number
          duration_min: number
          equipment: string[]
          focus: string | null
          format: string | null
          id: string
          instructions: string | null
          location: string | null
          mood: string | null
          name: string
          plan: Json
          rationale: string | null
          status: string
          tips: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty_stars?: number
          duration_min?: number
          equipment?: string[]
          focus?: string | null
          format?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          mood?: string | null
          name: string
          plan?: Json
          rationale?: string | null
          status?: string
          tips?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty_stars?: number
          duration_min?: number
          equipment?: string[]
          focus?: string | null
          format?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          mood?: string | null
          name?: string
          plan?: Json
          rationale?: string | null
          status?: string
          tips?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
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
