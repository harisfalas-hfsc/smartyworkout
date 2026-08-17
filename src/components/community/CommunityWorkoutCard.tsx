import { Star, ThumbsUp, ThumbsDown, MessageCircle, CheckCircle2, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommunityBadge, CommunityWorkoutCard as CardData } from "@/lib/community";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < n ? "fill-primary text-primary" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function Metric({ icon: Icon, value }: { icon: typeof ThumbsUp; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {value.toLocaleString()}
    </span>
  );
}

export function CommunityWorkoutCard({
  workout,
  badges = [],
  onOpen,
  onDo,
  compact = false,
}: {
  workout: CardData;
  badges?: CommunityBadge[];
  onOpen: (id: string) => void;
  onDo: (id: string) => void;
  compact?: boolean;
}) {
  const shared = workout.shared_at
    ? new Date(workout.shared_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const initial = (workout.creator_name || "S").slice(0, 1).toUpperCase();

  return (
    <article className="flex h-full flex-col rounded-3xl border-2 border-blue-400 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
        <span className="truncate">{workout.category}</span>
        {workout.format ? <span className="truncate text-muted-foreground">· {workout.format}</span> : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-lg font-extrabold leading-tight">{workout.name}</h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Stars n={workout.difficulty_stars} />
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {workout.duration_min} min
        </span>
        <span>{shared}</span>
      </div>

      {workout.equipment && workout.equipment.length > 0 && (
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
          {workout.equipment.join(" · ")}
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Created by</p>
        <div className="mt-1.5 flex items-center gap-2">
          {workout.creator_avatar ? (
            <img
              src={workout.creator_avatar}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{workout.creator_name || "Smarty member"}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              <Flame className="mr-0.5 inline h-3 w-3" />
              {workout.creator_streak} day streak · {workout.creator_completed.toLocaleString()} completed
            </p>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.slice(0, 3).map((b) => (
              <span
                key={b.badge_id}
                className="rounded-full border border-blue-300 px-2 py-0.5 text-[10px] font-semibold text-primary dark:border-blue-500/50"
              >
                🏆 {b.badge_name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Metric icon={ThumbsUp} value={workout.likes} />
        <Metric icon={ThumbsDown} value={workout.dislikes} />
        <Metric icon={MessageCircle} value={workout.comments_count} />
        <Metric icon={CheckCircle2} value={workout.completions} />
      </div>

      {!compact && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button className="h-11 rounded-2xl font-bold" onClick={() => onDo(workout.id)}>
            Do workout
          </Button>
          <Button
            variant="secondary"
            className="h-11 rounded-2xl font-bold"
            onClick={() => onOpen(workout.id)}
          >
            View
          </Button>
        </div>
      )}
      {compact && (
        <Button className="mt-5 h-11 rounded-2xl font-bold" onClick={() => onDo(workout.id)}>
          Do workout
        </Button>
      )}
    </article>
  );
}
