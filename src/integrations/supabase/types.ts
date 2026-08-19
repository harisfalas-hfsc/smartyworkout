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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points: number
          sort_order: number
          threshold: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          icon?: string
          id: string
          is_active?: boolean
          name: string
          points?: number
          sort_order?: number
          threshold?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          sort_order?: number
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_completions: {
        Row: {
          completed_at: string
          copy_workout_id: string | null
          id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string
          copy_workout_id?: string | null
          id?: string
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string
          copy_workout_id?: string | null
          id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_completions_copy_workout_id_fkey"
            columns: ["copy_workout_id"]
            isOneToOne: true
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_completions_copy_workout_id_fkey"
            columns: ["copy_workout_id"]
            isOneToOne: true
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_ratings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          value: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          value: number
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_ratings_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_ratings_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          value: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          value: number
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          body_part: string | null
          body_region: string | null
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          frame_end_path: string | null
          frame_start_path: string | null
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
          frame_end_path?: string | null
          frame_start_path?: string | null
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
          frame_end_path?: string | null
          frame_start_path?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
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
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
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
          auto_workout_enabled: boolean
          auto_workout_hour: number
          avatar_url: string | null
          bonus_credits: number
          created_at: string
          disliked_exercise_ids: string[]
          disliked_exercises: string[]
          display_name: string | null
          email: string | null
          experience: string | null
          favorite_exercise_ids: string[]
          favorite_exercises: string[]
          fitness_level: string | null
          gender: string | null
          health_acknowledged_at: string | null
          height_cm: number | null
          id: string
          last_auto_workout_on: string | null
          last_motivation_on: string | null
          limitations: string[]
          motivation_hour: number
          notify_motivation: boolean
          onboarded: boolean
          preferred_categories: string[]
          preferred_environment: string | null
          preferred_equipment: string[]
          primary_goal: string | null
          readiness_answers: Json
          readiness_warning_acknowledged_at: string | null
          secondary_goal: string | null
          timezone: string
          training_frequency: number | null
          typical_duration_min: number | null
          updated_at: string
          use_library_preferences: boolean
          weight_kg: number | null
          wod_level: string
          wod_mode: boolean
          wod_renews_at: string | null
          wod_subscribed_at: string | null
        }
        Insert: {
          age?: number | null
          auto_workout_enabled?: boolean
          auto_workout_hour?: number
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          disliked_exercise_ids?: string[]
          disliked_exercises?: string[]
          display_name?: string | null
          email?: string | null
          experience?: string | null
          favorite_exercise_ids?: string[]
          favorite_exercises?: string[]
          fitness_level?: string | null
          gender?: string | null
          health_acknowledged_at?: string | null
          height_cm?: number | null
          id: string
          last_auto_workout_on?: string | null
          last_motivation_on?: string | null
          limitations?: string[]
          motivation_hour?: number
          notify_motivation?: boolean
          onboarded?: boolean
          preferred_categories?: string[]
          preferred_environment?: string | null
          preferred_equipment?: string[]
          primary_goal?: string | null
          readiness_answers?: Json
          readiness_warning_acknowledged_at?: string | null
          secondary_goal?: string | null
          timezone?: string
          training_frequency?: number | null
          typical_duration_min?: number | null
          updated_at?: string
          use_library_preferences?: boolean
          weight_kg?: number | null
          wod_level?: string
          wod_mode?: boolean
          wod_renews_at?: string | null
          wod_subscribed_at?: string | null
        }
        Update: {
          age?: number | null
          auto_workout_enabled?: boolean
          auto_workout_hour?: number
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          disliked_exercise_ids?: string[]
          disliked_exercises?: string[]
          display_name?: string | null
          email?: string | null
          experience?: string | null
          favorite_exercise_ids?: string[]
          favorite_exercises?: string[]
          fitness_level?: string | null
          gender?: string | null
          health_acknowledged_at?: string | null
          height_cm?: number | null
          id?: string
          last_auto_workout_on?: string | null
          last_motivation_on?: string | null
          limitations?: string[]
          motivation_hour?: number
          notify_motivation?: boolean
          onboarded?: boolean
          preferred_categories?: string[]
          preferred_environment?: string | null
          preferred_equipment?: string[]
          primary_goal?: string | null
          readiness_answers?: Json
          readiness_warning_acknowledged_at?: string | null
          secondary_goal?: string | null
          timezone?: string
          training_frequency?: number | null
          typical_duration_min?: number | null
          updated_at?: string
          use_library_preferences?: boolean
          weight_kg?: number | null
          wod_level?: string
          wod_mode?: boolean
          wod_renews_at?: string | null
          wod_subscribed_at?: string | null
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
      set_logs: {
        Row: {
          attempt: number
          completed_at: string
          created_at: string
          distance_m: number | null
          exercise_id: string | null
          exercise_name: string
          id: string
          interval_index: number | null
          metric: string | null
          partial: boolean
          planned_reps: number | null
          planned_seconds: number | null
          planned_weight_kg: number | null
          reps: number | null
          rounds: number | null
          rpe: number | null
          seconds: number | null
          section: string | null
          set_number: number
          step_index: number
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          attempt?: number
          completed_at?: string
          created_at?: string
          distance_m?: number | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          interval_index?: number | null
          metric?: string | null
          partial?: boolean
          planned_reps?: number | null
          planned_seconds?: number | null
          planned_weight_kg?: number | null
          reps?: number | null
          rounds?: number | null
          rpe?: number | null
          seconds?: number | null
          section?: string | null
          set_number?: number
          step_index?: number
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          attempt?: number
          completed_at?: string
          created_at?: string
          distance_m?: number | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          interval_index?: number | null
          metric?: string | null
          partial?: boolean
          planned_reps?: number | null
          planned_seconds?: number | null
          planned_weight_kg?: number | null
          reps?: number | null
          rounds?: number | null
          rpe?: number | null
          seconds?: number | null
          section?: string | null
          set_number?: number
          step_index?: number
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          sender: string
          thread_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          sender: string
          thread_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          admin_unread: boolean
          created_at: string
          email: string
          id: string
          last_message_at: string
          name: string
          status: string
          subject: string
          updated_at: string
          user_deleted: boolean
          user_id: string | null
          user_unread: boolean
        }
        Insert: {
          admin_unread?: boolean
          created_at?: string
          email?: string
          id?: string
          last_message_at?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_deleted?: boolean
          user_id?: string | null
          user_unread?: boolean
        }
        Update: {
          admin_unread?: boolean
          created_at?: string
          email?: string
          id?: string
          last_message_at?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_deleted?: boolean
          user_id?: string | null
          user_unread?: boolean
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          badge_name: string
          category: string
          earned_at: string
          id: string
          points: number
          threshold: number
          user_id: string
        }
        Insert: {
          badge_id: string
          badge_name: string
          category: string
          earned_at?: string
          id?: string
          points?: number
          threshold?: number
          user_id: string
        }
        Update: {
          badge_id?: string
          badge_name?: string
          category?: string
          earned_at?: string
          id?: string
          points?: number
          threshold?: number
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          active_days: number
          badge_points: number
          created_at: string
          current_streak: number
          longest_streak: number
          score: number
          score_reached_at: string
          subscription_months: number
          updated_at: string
          user_id: string
          workouts_completed: number
          workouts_generated: number
        }
        Insert: {
          active_days?: number
          badge_points?: number
          created_at?: string
          current_streak?: number
          longest_streak?: number
          score?: number
          score_reached_at?: string
          subscription_months?: number
          updated_at?: string
          user_id: string
          workouts_completed?: number
          workouts_generated?: number
        }
        Update: {
          active_days?: number
          badge_points?: number
          created_at?: string
          current_streak?: number
          longest_streak?: number
          score?: number
          score_reached_at?: string
          subscription_months?: number
          updated_at?: string
          user_id?: string
          workouts_completed?: number
          workouts_generated?: number
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
          attempt: number
          comment: string | null
          created_at: string
          difficulty_rating: string | null
          enjoyed: string | null
          feeling: string | null
          id: string
          rpe: number | null
          updated_at: string
          user_id: string
          workout_id: string
          would_repeat: string | null
        }
        Insert: {
          attempt?: number
          comment?: string | null
          created_at?: string
          difficulty_rating?: string | null
          enjoyed?: string | null
          feeling?: string | null
          id?: string
          rpe?: number | null
          updated_at?: string
          user_id: string
          workout_id: string
          would_repeat?: string | null
        }
        Update: {
          attempt?: number
          comment?: string | null
          created_at?: string
          difficulty_rating?: string | null
          enjoyed?: string | null
          feeling?: string | null
          id?: string
          rpe?: number | null
          updated_at?: string
          user_id?: string
          workout_id?: string
          would_repeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_feedback_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
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
      workout_results: {
        Row: {
          analysis_note: string | null
          attempt: number
          category: string | null
          conditioning_load: number | null
          created_at: string
          data_points: number
          duration_seconds: number | null
          extra_reps: number | null
          finished: boolean | null
          format: string | null
          id: string
          intervals_done: number | null
          intervals_total: number | null
          metric: string | null
          performed_at: string
          prescription_hash: string | null
          rounds: number | null
          rpe: number | null
          strength_load: number | null
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          analysis_note?: string | null
          attempt?: number
          category?: string | null
          conditioning_load?: number | null
          created_at?: string
          data_points?: number
          duration_seconds?: number | null
          extra_reps?: number | null
          finished?: boolean | null
          format?: string | null
          id?: string
          intervals_done?: number | null
          intervals_total?: number | null
          metric?: string | null
          performed_at?: string
          prescription_hash?: string | null
          rounds?: number | null
          rpe?: number | null
          strength_load?: number | null
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          analysis_note?: string | null
          attempt?: number
          category?: string | null
          conditioning_load?: number | null
          created_at?: string
          data_points?: number
          duration_seconds?: number | null
          extra_reps?: number | null
          finished?: boolean | null
          format?: string | null
          id?: string
          intervals_done?: number | null
          intervals_total?: number | null
          metric?: string | null
          performed_at?: string
          prescription_hash?: string | null
          rounds?: number | null
          rpe?: number | null
          strength_load?: number | null
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_results_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_results_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          activation: string | null
          category: string
          community_hidden: boolean
          community_source_id: string | null
          completed_at: string | null
          cool_down: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_html: string | null
          difficulty_label: string | null
          difficulty_stars: number
          duration_label: string | null
          duration_min: number
          equipment: string[]
          finisher: string | null
          focus: string | null
          format: string | null
          id: string
          image_url: string | null
          instructions: string | null
          instructions_html: string | null
          is_favorite: boolean
          is_shared: boolean
          is_wod: boolean
          location: string | null
          main_workout: string | null
          mood: string | null
          name: string
          needs_review: boolean
          plan: Json
          rating: number | null
          rationale: string | null
          review_warnings: string[]
          scheduled_at: string | null
          serial: number
          shared_at: string | null
          soft_tissue: string | null
          status: string
          tips: string[]
          tips_html: string | null
          updated_at: string
          user_id: string
          user_note: string | null
          warm_up: string | null
          wod_cycle_day: number | null
          wod_date: string | null
          wod_variant: string | null
        }
        Insert: {
          activation?: string | null
          category: string
          community_hidden?: boolean
          community_source_id?: string | null
          completed_at?: string | null
          cool_down?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_html?: string | null
          difficulty_label?: string | null
          difficulty_stars?: number
          duration_label?: string | null
          duration_min?: number
          equipment?: string[]
          finisher?: string | null
          focus?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_html?: string | null
          is_favorite?: boolean
          is_shared?: boolean
          is_wod?: boolean
          location?: string | null
          main_workout?: string | null
          mood?: string | null
          name: string
          needs_review?: boolean
          plan?: Json
          rating?: number | null
          rationale?: string | null
          review_warnings?: string[]
          scheduled_at?: string | null
          serial?: number
          shared_at?: string | null
          soft_tissue?: string | null
          status?: string
          tips?: string[]
          tips_html?: string | null
          updated_at?: string
          user_id: string
          user_note?: string | null
          warm_up?: string | null
          wod_cycle_day?: number | null
          wod_date?: string | null
          wod_variant?: string | null
        }
        Update: {
          activation?: string | null
          category?: string
          community_hidden?: boolean
          community_source_id?: string | null
          completed_at?: string | null
          cool_down?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_html?: string | null
          difficulty_label?: string | null
          difficulty_stars?: number
          duration_label?: string | null
          duration_min?: number
          equipment?: string[]
          finisher?: string | null
          focus?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_html?: string | null
          is_favorite?: boolean
          is_shared?: boolean
          is_wod?: boolean
          location?: string | null
          main_workout?: string | null
          mood?: string | null
          name?: string
          needs_review?: boolean
          plan?: Json
          rating?: number | null
          rationale?: string | null
          review_warnings?: string[]
          scheduled_at?: string | null
          serial?: number
          shared_at?: string | null
          soft_tissue?: string | null
          status?: string
          tips?: string[]
          tips_html?: string | null
          updated_at?: string
          user_id?: string
          user_note?: string | null
          warm_up?: string | null
          wod_cycle_day?: number | null
          wod_date?: string | null
          wod_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_community_source_id_fkey"
            columns: ["community_source_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_community_source_id_fkey"
            columns: ["community_source_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_badges_public: {
        Row: {
          badge_id: string | null
          badge_name: string | null
          category: string | null
          earned_at: string | null
          icon: string | null
          points: number | null
          user_id: string | null
        }
        Relationships: []
      }
      community_comments_public: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          body: string | null
          created_at: string | null
          id: string | null
          user_id: string | null
          workout_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "community_workouts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members_public: {
        Row: {
          avatar_url: string | null
          badge_points: number | null
          current_streak: number | null
          display_name: string | null
          longest_streak: number | null
          received_comments: number | null
          received_completions: number | null
          received_likes: number | null
          score: number | null
          subscription_months: number | null
          user_id: string | null
          workouts_completed: number | null
          workouts_generated: number | null
          workouts_shared: number | null
        }
        Relationships: []
      }
      community_workouts_public: {
        Row: {
          category: string | null
          comments_count: number | null
          completions: number | null
          created_by: string | null
          creator_avatar: string | null
          creator_completed: number | null
          creator_generated: number | null
          creator_id: string | null
          creator_name: string | null
          creator_score: number | null
          creator_streak: number | null
          description: string | null
          difficulty_stars: number | null
          dislikes: number | null
          duration_min: number | null
          equipment: string[] | null
          focus: string | null
          format: string | null
          id: string | null
          image_url: string | null
          is_wod: boolean | null
          likes: number | null
          location: string | null
          name: string | null
          rating_avg: number | null
          rating_count: number | null
          shared_at: string | null
          unique_completions: number | null
          wod_date: string | null
        }
        Relationships: []
      }
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
