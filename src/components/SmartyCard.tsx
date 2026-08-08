import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type SmartyTone =
  | "cyan"
  | "green"
  | "orange"
  | "purple"
  | "yellow"
  | "pink"
  | "blue";

const TONE: Record<
  SmartyTone,
  { border: string; text: string; softBg: string; softBorder: string }
> = {
  cyan: {
    border: "border-sky-400",
    text: "text-sky-500 dark:text-sky-300",
    softBg: "bg-sky-50 dark:bg-sky-500/15",
    softBorder: "border-sky-200 dark:border-sky-500/40",
  },
  green: {
    border: "border-emerald-400",
    text: "text-emerald-500 dark:text-emerald-300",
    softBg: "bg-emerald-50 dark:bg-emerald-500/15",
    softBorder: "border-emerald-200 dark:border-emerald-500/40",
  },
  orange: {
    border: "border-orange-400",
    text: "text-orange-500 dark:text-orange-300",
    softBg: "bg-orange-50 dark:bg-orange-500/15",
    softBorder: "border-orange-200 dark:border-orange-500/40",
  },
  purple: {
    border: "border-violet-400",
    text: "text-violet-500 dark:text-violet-300",
    softBg: "bg-violet-50 dark:bg-violet-500/15",
    softBorder: "border-violet-200 dark:border-violet-500/40",
  },
  yellow: {
    border: "border-amber-400",
    text: "text-amber-500 dark:text-amber-300",
    softBg: "bg-amber-50 dark:bg-amber-500/15",
    softBorder: "border-amber-200 dark:border-amber-500/40",
  },
  pink: {
    border: "border-pink-400",
    text: "text-pink-500 dark:text-pink-300",
    softBg: "bg-pink-50 dark:bg-pink-500/15",
    softBorder: "border-pink-200 dark:border-pink-500/40",
  },
  blue: {
    border: "border-blue-400",
    text: "text-blue-500 dark:text-blue-300",
    softBg: "bg-blue-50 dark:bg-blue-500/15",
    softBorder: "border-blue-200 dark:border-blue-500/40",
  },
};


export function toneClasses(tone: SmartyTone) {
  return TONE[tone];
}

interface SmartyCardProps {
  tone?: SmartyTone;
  eyebrow?: string;
  eyebrowIcon?: LucideIcon | string; // Lucide icon component or emoji
  cornerIcon?: LucideIcon | string;
  title?: ReactNode;
  accent?: ReactNode; // colored trailing word appended to title
  description?: ReactNode;
  children?: ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
  ctaHref?: string;
  className?: string;
}

function IconOrEmoji({
  icon,
  className,
}: {
  icon: LucideIcon | string;
  className?: string;
}) {
  if (typeof icon === "string") {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center text-center text-lg leading-none",
          className,
        )}
      >
        {icon}
      </span>
    );
  }
  const Comp = icon;
  return <Comp className={cn("h-4 w-4 shrink-0", className)} />;
}

export function SmartyCard({
  tone = "cyan",
  eyebrow,
  eyebrowIcon,
  cornerIcon,
  title,
  accent,
  description,
  children,
  ctaLabel,
  ctaTo,
  ctaHref,
  className,
}: SmartyCardProps) {
  const t = TONE[tone];
  const hasHeader = Boolean(eyebrow || cornerIcon);
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border-2 bg-card p-7 shadow-soft sm:p-9",
        t.border,
        className,
      )}
    >
      {hasHeader && (
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-8 gap-y-5">
          {eyebrow ? (
            <div
              className={cn(
                "inline-flex max-w-full min-w-0 items-center gap-4 rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]",
                t.softBorder,
                t.text,
              )}
            >
              {eyebrowIcon && (
                <IconOrEmoji icon={eyebrowIcon} className="h-4 w-4 shrink-0 text-sm" />
              )}
              <span className="min-w-0 truncate">{eyebrow}</span>
            </div>
          ) : (
            <span />
          )}
          {cornerIcon && (
            <div
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border",
                t.softBorder,
                t.softBg,
                t.text,
              )}
            >
              <IconOrEmoji icon={cornerIcon} className="h-5 w-5 text-lg" />
            </div>
          )}
        </div>
      )}

      {title && (
        <h2
          className={cn(
            "text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl",
            hasHeader ? "mt-10" : "mt-0",
          )}
        >
          {title}
          {accent && <span className={cn(" ", t.text)}> {accent}</span>}
        </h2>
      )}

      {description && (
        <p className="mt-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{description}</p>
      )}

      {children && <div className="mt-7">{children}</div>}

      {ctaLabel && (ctaTo || ctaHref) && (
        <div className="mt-6">
          {ctaTo ? (
            <Link
              to={ctaTo as never}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold",
                t.text,
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href={ctaHref}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold",
                t.text,
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface SmartyRowProps {
  icon?: LucideIcon | string;
  title: string;
  subtitle?: string;
  tone?: SmartyTone;
}

export function SmartyRow({ icon, title, subtitle, tone = "cyan" }: SmartyRowProps) {
  const t = TONE[tone];
  return (
    <div className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-4">
      {icon && (
        <div
          className={cn(
            "grid h-10 w-10 flex-none place-items-center rounded-xl border",
            t.softBorder,
            t.softBg,
            t.text,
          )}
        >
          <IconOrEmoji icon={icon} className="h-4 w-4 text-base" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-5 text-foreground">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

interface SmartyPillProps {
  tone?: SmartyTone;
  icon?: LucideIcon | string;
  children: ReactNode;
}

export function SmartyPill({ tone = "cyan", icon, children }: SmartyPillProps) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "grid h-14 grid-cols-[2rem_minmax(0,1fr)] items-center gap-4 rounded-xl border bg-card px-4",
        t.softBorder,
      )}
    >
      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", t.softBg, t.text)}>
        {icon && <IconOrEmoji icon={icon} className="h-4 w-4 text-sm" />}
      </div>
      <span className="truncate text-sm font-medium leading-5 text-foreground">{children}</span>
    </div>
  );
}
