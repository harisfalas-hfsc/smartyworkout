import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

export function ExerciseGif({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);

  useEffect(() => {
    let active = true;
    if (!path || cache.has(path)) return;
    supabase.storage
      .from("exercise-library")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!path || !url) {
    return (
      <div
        className={cn(
          "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
          className,
        )}
      >
        <Dumbbell className="h-6 w-6" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("h-20 w-20 shrink-0 rounded-xl bg-muted object-cover", className)}
    />
  );
}
