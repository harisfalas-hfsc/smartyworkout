import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getExerciseDetails } from "@/lib/coach.functions";
import { readCache, writeCache } from "@/lib/offline/store";

export type ExerciseDetail = {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  secondary_muscles: string[] | null;
  equipment: string | null;
  difficulty: string | null;
  category: string | null;
  description: string | null;
  instructions: string[] | null;
  gif_url: string | null;
};

type Ctx = {
  details: Record<string, ExerciseDetail>;
  ensure: (ids: string[]) => void;
  loading: boolean;
};

const ExerciseMediaContext = createContext<Ctx>({ details: {}, ensure: () => {}, loading: false });

/** Batches exercise metadata + signed GIF URLs for every id used on the page. */
export function ExerciseMediaProvider({
  ids,
  children,
}: {
  ids: string[];
  children: React.ReactNode;
}) {
  const fetchDetails = useServerFn(getExerciseDetails);
  const [details, setDetails] = useState<Record<string, ExerciseDetail>>({});
  const [loading, setLoading] = useState(false);
  const [wanted, setWanted] = useState<string[]>(ids);

  useEffect(() => {
    setWanted((prev) => Array.from(new Set([...prev, ...ids])));
  }, [ids.join(",")]);

  const ensure = useCallback((next: string[]) => {
    setWanted((prev) => Array.from(new Set([...prev, ...next])));
  }, []);

  useEffect(() => {
    const missing = wanted.filter((id) => id && !details[id]);
    if (!missing.length) return;
    let active = true;
    setLoading(true);
    (async () => {
      // Show whatever this device already stored so exercises render offline.
      const stored = await Promise.all(
        missing.map((id) => readCache<ExerciseDetail>(`exercise:${id}`)),
      );
      if (!active) return;
      const fromDevice = stored.filter(Boolean).map((e) => e!.data);
      if (fromDevice.length) {
        setDetails((prev) => {
          const next = { ...prev };
          for (const ex of fromDevice) next[ex.id] = ex;
          return next;
        });
      }
      const chunks: string[][] = [];
      for (let i = 0; i < missing.length; i += 40) chunks.push(missing.slice(i, i + 40));
      for (const chunk of chunks) {
        try {
          const res = await fetchDetails({ data: { ids: chunk } });
          if (!active) return;
          const list = res.exercises as unknown as ExerciseDetail[];
          setDetails((prev) => {
            const next = { ...prev };
            for (const ex of list) next[ex.id] = ex;
            return next;
          });
          for (const ex of list) void writeCache(`exercise:${ex.id}`, ex);
        } catch {
          /* keep placeholders */
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wanted.join(","), fetchDetails]);

  const value = useMemo(() => ({ details, ensure, loading }), [details, ensure, loading]);
  return <ExerciseMediaContext.Provider value={value}>{children}</ExerciseMediaContext.Provider>;
}

export function useExerciseMedia() {
  return useContext(ExerciseMediaContext);
}
