import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  icon?: LucideIcon | string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

/**
 * Standard page header used across every route:
 * centered eyebrow + centered uppercase title in one consistent size.
 * Any icon sits inline with the title on a single line, mobile included.
 */
export function PageHeader({
  eyebrow,
  icon,
  title,
  subtitle,
  className,
}: PageHeaderProps) {
  const Icon = typeof icon === "function" ? icon : null;
  return (
    <div className={cn("mb-8 text-center", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      )}
      <h1
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl",
          eyebrow ? "mt-2" : "mt-0",
        )}
      >
        {Icon && <Icon className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" />}
        {typeof icon === "string" && (
          <span className="text-2xl leading-none sm:text-3xl">{icon}</span>
        )}
        <span className="min-w-0">{title}</span>
      </h1>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
