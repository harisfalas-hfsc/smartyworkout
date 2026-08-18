import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef } from "react";
import { EXERCISE_TOKEN_RE } from "@/lib/workout/tokens";

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}

/**
 * Renders workout HTML, replacing every {{exercise:ID:Name}} token with the
 * exercise name plus an inline eye button that opens the detail dialog.
 */
export function ExerciseHTMLContent({
  html,
  onOpenExercise,
  className,
}: {
  html: string;
  onOpenExercise: (id: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const safe = useMemo(() => {
    const withButtons = (html ?? "").replace(
      new RegExp(EXERCISE_TOKEN_RE.source, "g"),
      (_m, id: string, name: string) =>
        `<span class="exercise-ref"><strong>${name}</strong><button type="button" class="exercise-eye" data-exercise-id="${escapeAttr(
          id,
        )}" aria-label="View ${escapeAttr(name)} details">i</button></span>`,
    );
    if (typeof window === "undefined") return withButtons;
    return DOMPurify.sanitize(withButtons, { ADD_ATTR: ["data-exercise-id", "target"] });


  }, [html]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest("[data-exercise-id]");
      if (!target) return;
      event.preventDefault();
      const id = target.getAttribute("data-exercise-id");
      if (id) onOpenExercise(id);
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onOpenExercise, safe]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
