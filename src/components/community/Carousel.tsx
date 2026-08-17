import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface CarouselProps {
  title: string;
  subtitle?: string;
  viewAllTo?: string;
  viewAllSearch?: Record<string, unknown>;
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal, swipeable carousel used across the Community page.
 * Mobile: snap-scroll with large cards. Desktop: arrow controls.
 */
export function Carousel({
  title,
  subtitle,
  viewAllTo,
  viewAllSearch,
  children,
  className,
}: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  return (
    <section className={cn("mt-12", className)}>
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewAllTo && (
            <Link
              to={viewAllTo as never}
              search={viewAllSearch as never}
              className="text-xs font-bold uppercase tracking-wider text-primary"
            >
              View all
            </Link>
          )}
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(-1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-blue-400 text-primary transition hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-blue-400 text-primary transition hover:bg-primary/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

export function CarouselItem({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "snap-start shrink-0",
        width === "wide"
          ? "w-[86%] sm:w-[22rem] lg:w-[24rem]"
          : "w-[70%] sm:w-[16rem] lg:w-[17rem]",
      )}
    >
      {children}
    </div>
  );
}
