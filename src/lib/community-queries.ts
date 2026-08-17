import { supabase } from "@/integrations/supabase/client";
import {
  MIN_RATINGS,
  ratingScore,
  type CommunityBadge,
  type CommunityComment,
  type CommunityMember,
  type CommunitySort,
  type CommunityWorkoutCard,
} from "@/lib/community";

const CARD_COLUMNS =
  "id,name,category,format,focus,difficulty_stars,duration_min,equipment,location,image_url,description,shared_at,creator_id,creator_name,creator_avatar,creator_score,creator_streak,creator_completed,creator_generated,likes,dislikes,comments_count,completions,unique_completions";

export type WorkoutFilters = {
  sort?: CommunitySort;
  difficulty?: number | null;
  category?: string | null;
  creatorId?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export async function fetchCommunityWorkouts(
  filters: WorkoutFilters = {},
): Promise<CommunityWorkoutCard[]> {
  const {
    sort = "latest",
    difficulty = null,
    category = null,
    creatorId = null,
    search = null,
    limit = 10,
    offset = 0,
  } = filters;

  // Top Rated needs a like ratio, so fetch a wider window and rank client-side.
  const isRated = sort === "rated";
  let query = supabase
    .from("community_workouts_public")
    .select(CARD_COLUMNS)
    .range(offset, offset + (isRated ? 199 : limit - 1));

  if (difficulty) query = query.eq("difficulty_stars", difficulty);
  if (category) query = query.eq("category", category);
  if (creatorId) query = query.eq("creator_id", creatorId);
  if (search) query = query.ilike("name", `%${search}%`);

  if (sort === "completed") query = query.order("completions", { ascending: false });
  else if (sort === "liked") query = query.order("likes", { ascending: false });
  else if (sort === "commented") query = query.order("comments_count", { ascending: false });
  else query = query.order("shared_at", { ascending: false });

  const { data } = await query.returns<CommunityWorkoutCard[]>();
  const rows = data ?? [];
  if (!isRated) return rows;
  return rows
    .filter((w) => w.likes + w.dislikes >= MIN_RATINGS)
    .sort((a, b) => ratingScore(b) - ratingScore(a) || b.likes - a.likes)
    .slice(0, limit);
}

export async function fetchCommunityCreators(
  orderBy:
    | "workouts_shared"
    | "received_completions"
    | "received_likes"
    | "received_comments"
    | "score",
  limit = 10,
): Promise<CommunityMember[]> {
  let query = supabase
    .from("community_members_public")
    .select("*")
    .order(orderBy, { ascending: false })
    .limit(limit);
  if (orderBy !== "score") query = query.gt("workouts_shared", 0);
  const { data } = await query.returns<CommunityMember[]>();
  return data ?? [];
}

export async function fetchLeaders(
  orderBy: "current_streak" | "workouts_completed" | "workouts_generated" | "score" | "longest_streak",
  limit = 8,
): Promise<CommunityMember[]> {
  const { data } = await supabase
    .from("community_members_public")
    .select("*")
    .gt(orderBy, 0)
    .order(orderBy, { ascending: false })
    .limit(limit)
    .returns<CommunityMember[]>();
  return data ?? [];
}

export async function fetchBadgesFor(userIds: string[]): Promise<Record<string, CommunityBadge[]>> {
  if (!userIds.length) return {};
  const { data } = await supabase
    .from("community_badges_public")
    .select("*")
    .in("user_id", userIds)
    .order("points", { ascending: false })
    .returns<CommunityBadge[]>();
  const map: Record<string, CommunityBadge[]> = {};
  for (const badge of data ?? []) {
    (map[badge.user_id] ??= []).push(badge);
  }
  return map;
}

export async function fetchComments(workoutId: string, limit = 50): Promise<CommunityComment[]> {
  const { data } = await supabase
    .from("community_comments_public")
    .select("*")
    .eq("workout_id", workoutId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityComment[]>();
  return data ?? [];
}

export async function fetchCategories(): Promise<string[]> {
  const { data } = await supabase
    .from("community_workouts_public")
    .select("category")
    .limit(500)
    .returns<{ category: string }[]>();
  return Array.from(new Set((data ?? []).map((r) => r.category).filter(Boolean))).sort();
}

/** Newest comments across every shared workout — community activity feed. */
export async function fetchLatestComments(limit = 20): Promise<
  (CommunityComment & { workout_name?: string | null })[]
> {
  const { data } = await supabase
    .from("community_comments_public")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityComment[]>();
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: workouts } = await supabase
    .from("community_workouts_public")
    .select("id,name")
    .in("id", Array.from(new Set(rows.map((c) => c.workout_id))))
    .returns<{ id: string; name: string }[]>();
  const nameById = new Map((workouts ?? []).map((w) => [w.id, w.name]));
  return rows.map((c) => ({ ...c, workout_name: nameById.get(c.workout_id) ?? null }));
}
