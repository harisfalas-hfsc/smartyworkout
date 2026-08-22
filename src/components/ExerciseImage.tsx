import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { readStoredMedia, storeMedia } from "@/lib/offline/media-cache";
import { isOnline } from "@/lib/offline/connectivity";

const signedUrlMemory = new Map<string, string>();

/**
 * Resolves the best address for an exercise picture.
 *
 * A stored copy always wins: it works offline, paints instantly, and costs no
 * data. When nothing is stored the signed link is used and the file is saved
 * for next time, so the library fills itself up simply by being used.
 */
export function useExerciseImageSrc(path?: string | null, signedUrl?: string | null) {
  const [src, setSrc] = useState<string | null>(signedUrl ?? null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    (async () => {
      if (!path) {
        setSrc(signedUrl ?? null);
        return;
      }
      const stored = await readStoredMedia(path);
      if (!active) {
        if (stored) URL.revokeObjectURL(stored);
        return;
      }
      if (stored) {
        objectUrl = stored;
        setSrc(stored);
        return;
      }

      let link = signedUrl ?? signedUrlMemory.get(path) ?? null;
      if (!link && isOnline()) {
        link = supabase.storage.from("exercise-library").getPublicUrl(path).data.publicUrl;
        if (link) signedUrlMemory.set(path, link);
      }
      if (!active) return;
      setSrc(link);
      if (link) void storeMedia({ path, url: link });
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
