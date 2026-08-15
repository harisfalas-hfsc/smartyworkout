import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, X, Dumbbell, Heart, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { ExerciseGif } from "@/components/ExerciseGif";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  getExercisePreferences,
  setExercisePreference,
  type ExercisePreferences,
} from "@/lib/preferences.functions";


const URL = "https://smartyworkout.com/exercise-library";
const TITLE = "Exercise Library — 1,300+ exercise demonstrations | SmartyWorkout";
const DESCRIPTION =
  "Browse the SmartyWorkout exercise library: 1,300+ movements with animated demonstrations, filtered by body part, equipment, target muscle and difficulty.";

export const Route = createFileRoute("/exercise-library")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              url: URL,
              name: TITLE,
              description: DESCRIPTION,
              inLanguage: "en",
              isPartOf: { "@id": "https://smartyworkout.com/#website" },
              about: {
                "@type": "Thing",
                name: "Exercise database",
                description:
                  "A curated library of over 1,300 resistance, bodyweight and conditioning exercises with animated demonstrations.",
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                { "@type": "ListItem", position: 2, name: "Exercise Library", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: ExerciseLibraryPage,
});

type Exercise = {
  id: string;
  name: string;
  body_part: string | null;
  equipment: string | null;
  target_muscle: string | null;
  secondary_muscles: string[];
  instructions: string[];
  difficulty: string | null;
  category: string | null;
  description: string | null;
  gif_path: string | null;
};

const ALL = "all";

function normalize(term: string): string[] {
  const n = term.toLowerCase().trim();
  if (!n) return [];
  const v = new Set<string>([n]);
  if (n.includes("body weight")) v.add(n.replace("body weight", "bodyweight"));
  if (n.includes("bodyweight")) v.add(n.replace("bodyweight", "body weight"));
  if (n.includes("dumbell")) v.add(n.replace("dumbell", "dumbbell"));
  if (n.includes("-")) {
    v.add(n.replace(/-/g, " "));
    v.add(n.replace(/-/g, ""));
  }
  if (n.includes(" ")) v.add(n.replace(/ /g, "-"));
  if (n.endsWith("s")) v.add(n.slice(0, -1));
  return [...v];
}

function PreferenceButtons({
  state,
  busy,
  onLike,
  onDislike,
}: {
  state: "like" | "dislike" | "none";
  busy: boolean;
  onLike: () => void;
  onDislike: () => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onLike}
        aria-label="Like this exercise"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          state === "like"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-primary"
        }`}
      >
        <Heart className={`h-4 w-4 ${state === "like" ? "fill-current" : ""}`} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDislike}
        aria-label="Dislike this exercise"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          state === "dislike"
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-border text-muted-foreground hover:text-destructive"
        }`}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

function ExerciseLibraryPage() {

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameSearch, setNameSearch] = useState("");
  const [bodyPart, setBodyPart] = useState(ALL);
  const [equipment, setEquipment] = useState(ALL);
  const [target, setTarget] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [options, setOptions] = useState<{
    bodyParts: string[];
    equipment: string[];
    targets: string[];
    difficulties: string[];
  }>({ bodyParts: [], equipment: [], targets: [], difficulties: [] });

  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ExercisePreferences | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPrefs(null);
      return;
    }
    let active = true;
    getExercisePreferences()
      .then((p) => {
        if (active) setPrefs(p);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const stateFor = (id: string): "like" | "dislike" | "none" =>
    prefs?.favoriteIds.includes(id) ? "like" : prefs?.dislikedIds.includes(id) ? "dislike" : "none";

  async function mark(id: string, next: "like" | "dislike") {
    if (!user) {
      toast.error("Sign in to save your liked and disliked exercises.");
      return;
    }
    if (!prefs?.premium) {
      toast.error("Liking and disliking exercises is part of the premium membership.");
      return;
    }
    const state = stateFor(id) === next ? "none" : next;
    setSavingId(id);
    try {
      const updated = await setExercisePreference({ data: { exerciseId: id, state } });
      setPrefs(updated);
      toast.success(
        state === "none"
          ? "Preference cleared."
          : state === "like"
            ? "Added to your liked exercises."
            : "Added to your disliked exercises.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setSavingId(null);
    }
  }

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    let active = true;
    const load = async () => {
      const all: any[] = [];
      let page = 0;
      const size = 1000;
      for (;;) {
        const { data, error } = await supabase
          .from("exercises")
          .select("body_part,equipment,target_muscle,difficulty")
          .range(page * size, (page + 1) * size - 1);
        if (error || !data?.length) break;
        all.push(...data);
        if (data.length < size) break;
        page++;
      }
      if (!active) return;
      const uniq = (key: string) =>
        [...new Set(all.map((d) => d[key]).filter(Boolean))].sort() as string[];
      setOptions({
        bodyParts: uniq("body_part"),
        equipment: uniq("equipment"),
        targets: uniq("target_muscle"),
        difficulties: uniq("difficulty"),
      });
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("exercises")
      .select(
        "id,name,body_part,equipment,target_muscle,secondary_muscles,instructions,difficulty,category,description,gif_path",
      );

    if (bodyPart !== ALL) query = query.eq("body_part", bodyPart);
    if (equipment !== ALL) query = query.eq("equipment", equipment);
    if (target !== ALL) query = query.eq("target_muscle", target);
    if (difficulty !== ALL) query = query.eq("difficulty", difficulty);

    if (nameSearch.trim()) {
      const conditions = normalize(nameSearch)
        .flatMap((t) => [
          `name.ilike.%${t}%`,
          `target_muscle.ilike.%${t}%`,
          `body_part.ilike.%${t}%`,
          `equipment.ilike.%${t}%`,
        ])
        .join(",");
      if (conditions) query = query.or(conditions);
    }

    const { data } = await query.order("name").limit(60);
    setExercises((data as Exercise[]) ?? []);
    setLoading(false);
  }, [bodyPart, equipment, target, difficulty, nameSearch]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(fetchExercises, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [fetchExercises]);

  const clearAll = () => {
    setNameSearch("");
    setBodyPart(ALL);
    setEquipment(ALL);
    setTarget(ALL);
    setDifficulty(ALL);
  };

  const hasFilters =
    nameSearch.trim() !== "" ||
    [bodyPart, equipment, target, difficulty].some((v) => v !== ALL);

  const filters: { label: string; value: string; set: (v: string) => void; items: string[] }[] = [
    { label: "Body part", value: bodyPart, set: setBodyPart, items: options.bodyParts },
    { label: "Equipment", value: equipment, set: setEquipment, items: options.equipment },
    { label: "Target muscle", value: target, set: setTarget, items: options.targets },
    { label: "Difficulty", value: difficulty, set: setDifficulty, items: options.difficulties },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="Exercise library"
        title={
          <>
            Every <span className="text-primary">movement</span> demonstrated
          </>
        }
        subtitle={
          <>
            Browse the exercise database{" "}
            <span className="font-bold text-primary">Smarty Coach</span> builds your sessions from.
            Filter by body part, equipment, target muscle or difficulty. Exercises you{" "}
            <span className="font-semibold text-primary">like</span> are prioritised and the ones
            you <span className="font-semibold text-primary">dislike</span> are avoided every
            time a workout is generated for you.
          </>
        }

      />

      <Card className="mb-6 border-2 border-primary/30">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Exercise Database</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="Search exercises…"
              className="pl-9"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {filters.map((f) => (
              <Select key={f.label} value={f.value} onValueChange={f.set}>
                <SelectTrigger aria-label={f.label}>
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value={ALL}>All {f.label.toLowerCase()}</SelectItem>
                  {f.items.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Searching…"
                : `${exercises.length} exercise${exercises.length === 1 ? "" : "s"} shown`}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>

          {/* Results scroll inside the card */}
          <div className="max-h-[55vh] overflow-y-auto rounded-2xl border bg-muted/20 p-2 sm:max-h-[420px]">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : exercises.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No exercises match those filters.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary"
                  >
                    <button onClick={() => setSelected(ex)} className="shrink-0" aria-label={`Open ${ex.name}`}>
                      <ExerciseGif path={ex.gif_path} alt={ex.name} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setSelected(ex)} className="block w-full text-left">
                        <span className="block text-sm font-bold capitalize leading-snug">{ex.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {[ex.body_part, ex.equipment].filter(Boolean).map((tag) => (
                            <Badge key={tag as string} variant="secondary" className="capitalize">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      </button>
                      <PreferenceButtons
                        state={stateFor(ex.id)}
                        busy={savingId === ex.id}
                        onLike={() => mark(ex.id, "like")}
                        onDislike={() => mark(ex.id, "dislike")}
                      />
                    </div>
                  </div>
                ))}
              </div>

            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Want these exercises built into a session?{" "}
        <Link to="/coach" className="font-semibold text-primary">
          Ask Smarty Coach →
        </Link>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <ExerciseGif
                path={selected.gif_path}
                alt={selected.name}
                className="h-64 w-full rounded-2xl object-contain"
              />
              <PreferenceButtons
                state={stateFor(selected.id)}
                busy={savingId === selected.id}
                onLike={() => mark(selected.id, "like")}
                onDislike={() => mark(selected.id, "dislike")}
              />
              <div className="flex flex-wrap gap-1">

                {[selected.body_part, selected.equipment, selected.target_muscle, selected.difficulty]
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge key={tag as string} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
              </div>
              {selected.secondary_muscles?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Secondary muscles: </span>
                  {selected.secondary_muscles.join(", ")}
                </p>
              )}
              {selected.instructions?.length > 0 && (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  {selected.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
