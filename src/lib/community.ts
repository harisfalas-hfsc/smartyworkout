/** Shared client-safe types and constants for Smarty Community. */

export type CommunityWorkoutCard = {
  id: string;
  name: string;
  category: string;
  format: string | null;
  focus: string | null;
  difficulty_stars: number;
  duration_min: number;
  equipment: string[] | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  shared_at: string | null;
  creator_id: string;
  creator_name: string | null;
  creator_avatar: string | null;
  creator_score: number;
  creator_streak: number;
  creator_completed: number;
  creator_generated: number;
  likes: number;
  dislikes: number;
  comments_count: number;
  completions: number;
  unique_completions: number;
};

export type CommunityMember = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  current_streak: number;
  longest_streak: number;
  workouts_completed: number;
  workouts_generated: number;
  subscription_months: number;
  badge_points: number;
  workouts_shared: number;
  received_completions: number;
  received_likes: number;
  received_comments: number;
};

export type CommunityComment = {
  id: string;
  workout_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

export type CommunityBadge = {
  user_id: string;
  badge_id: string;
  badge_name: string;
  category: string;
  points: number;
  earned_at: string;
  icon: string | null;
};

export const SORTS = [
  { id: "latest", label: "Latest" },
  { id: "completed", label: "Most completed" },
  { id: "liked", label: "Most liked" },
  { id: "commented", label: "Most discussed" },
  { id: "rated", label: "Top rated" },
] as const;

export type CommunitySort = (typeof SORTS)[number]["id"];

/** Minimum reactions before a workout can appear in Top Rated. */
export const MIN_RATINGS = 3;

export function ratingScore(w: { likes: number; dislikes: number }) {
  const total = w.likes + w.dislikes;
  if (total === 0) return 0;
  return w.likes / total;
}

/** Full shared workout payload returned to members (matches WorkoutDisplay's row shape). */
export type SharedWorkoutFull = {
  id: string;
  serial: number | null;
  name: string;
  category: string;
  format: string | null;
  focus: string | null;
  difficulty_stars: number;
  difficulty_label: string | null;
  duration_min: number;
  duration_label: string | null;
  equipment: string[] | null;
  location: string | null;
  image_url: string | null;
  description_html: string | null;
  instructions_html: string | null;
  tips_html: string | null;
  main_workout: string | null;
  created_by: string | null;
  status: string;
  user_id: string;
  shared_at: string | null;
};
