import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExerciseMediaUrl } from "@/lib/exercise-media";

/**
 * Resolves the address for an exercise picture. Pictures live in a private
 * bucket, so a short-lived signed link is requested unless one was passed in.
 */
export function useExerciseImageSrc(path?: string | null, signedUrl?: string | null) {
  const [src, setSrc] = useState<string | null>(signedUrl ?? null);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!path) {
        setSrc(signedUrl ?? null);
        return;
      }
      const link = signedUrl ?? (await getExerciseMediaUrl(path));
      if (!active) return;
      setSrc(link);
    })();

    return () => {
      active = false;
    };
  }, [path, signedUrl]);

  return src;
}

/** One picture component used by the library, the details card and the player. */
export function ExerciseImage({
  path,
  url,
  alt,
  className,
  fallbackClassName,
}: {
  path?: string | null;
  url?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const src = useExerciseImageSrc(path, url);

  if (!src) {
    return (
      <div
        className={cn(
          "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
          fallbackClassName ?? className,
        )}
      >
        <Dumbbell className="h-6 w-6" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("h-20 w-20 shrink-0 rounded-xl bg-muted object-cover", className)}
    />
  );
}
