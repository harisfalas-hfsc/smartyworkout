import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityBadge, CommunityMember } from "@/lib/community";

export function MemberAvatar({
  name,
  avatar,
  size = 10,
}: {
  name: string | null;
  avatar: string | null;
  size?: 8 | 10 | 12;
}) {
  const cls = size === 12 ? "h-12 w-12" : size === 8 ? "h-8 w-8" : "h-10 w-10";
  if (avatar)
    return <img src={avatar} alt="" loading="lazy" className={cn(cls, "rounded-full object-cover")} />;
  return (
    <span
      className={cn(
        cls,
        "grid place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground",
      )}
    >
      {(name || "S").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Consistent community user card used by every ranking / creator section. */
export function MemberCard({
  member,
  rank,
  badges = [],
  stats,
}: {
  member: CommunityMember;
  rank?: number;
  badges?: CommunityBadge[];
  stats: { label: string; value: string | number }[];
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border-2 border-blue-400 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        {rank ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-blue-300 text-sm font-black text-primary dark:border-blue-500/50">
            {rank}
          </span>
        ) : null}
        <MemberAvatar name={member.display_name} avatar={member.avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{member.display_name || "Smarty member"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            <Flame className="mr-0.5 inline h-3 w-3" />
            {member.current_streak} day streak · {member.score.toLocaleString()} pts
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border p-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </dt>
            <dd className="text-base font-black">
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </dd>
          </div>
        ))}
      </dl>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
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
    </article>
  );
}

export function LeaderRow({
  rank,
  member,
  value,
  unit,
  badge,
}: {
  rank: number;
  member: CommunityMember;
  value: number;
  unit: string;
  badge?: CommunityBadge | undefined;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-card p-3 dark:border-blue-500/40">
      <span className="w-6 shrink-0 text-sm font-black text-primary">#{rank}</span>
      <MemberAvatar name={member.display_name} avatar={member.avatar_url} size={8} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{member.display_name || "Smarty member"}</p>
        {badge ? (
          <p className="truncate text-[11px] text-muted-foreground">🏆 {badge.badge_name}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-sm font-black">
        {value.toLocaleString()}{" "}
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{unit}</span>
      </span>
    </li>
  );
}
