import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, X } from "lucide-react";

export const BODY_PARTS = [
  "upper legs",
  "lower legs",
  "back",
  "chest",
  "shoulders",
  "upper arms",
  "lower arms",
  "waist",
  "cardio",
  "neck",
] as const;

type Row = { id: string; name: string; body_part: string | null; equipment: string | null };

/**
 * Two-step exercise selector: choose a body part, then pick the exact library
 * exercise. Selections are stored as real library ids, never free text.
 */
export function ExercisePicker({
  value,
  onChange,
  title,
  emptyHint,
  max = 25,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  title: string;
  emptyHint: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Row[]>([]);

  // Resolve the stored ids into names for the chips.
  useEffect(() => {
    if (!value.length) {
      setSelectedRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id,name,body_part,equipment")
        .in("id", value);
      if (!cancelled) setSelectedRows((data ?? []) as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!open || (!part && term.trim().length < 2)) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      let query = supabase
        .from("exercises")
        .select("id,name,body_part,equipment")
        .eq("is_active", true)
        .order("name")
        .limit(120);
      if (part) query = query.eq("body_part", part);
      if (term.trim().length >= 2) query = query.ilike("name", `%${term.trim()}%`);
      const { data } = await query;
      if (!cancelled) {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, part, term]);

  const selectedIds = useMemo(() => new Set(value), [value]);

  function toggle(id: string) {
    if (selectedIds.has(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < max) onChange([...value, id]);
  }

  return (
    <div className="space-y-3">
      {selectedRows.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedRows.map((row) => (
            <span
              key={row.id}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold capitalize"
            >
              {row.name}
              <button
                type="button"
                aria-label={`Remove ${row.name}`}
                onClick={() => onChange(value.filter((v) => v !== row.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}

      <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Choose from the exercise library
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {BODY_PARTS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setPart(part === bp ? null : bp)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    part === bp
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {bp}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-9"
                placeholder="Search the library…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            <div className="max-h-[45vh] overflow-y-auto rounded-2xl border-2 border-blue-400">
              {loading ? (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : rows.length ? (
                rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggle(row.id)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-0 ${
                      selectedIds.has(row.id) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold capitalize">{row.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.body_part ?? "—"} · {row.equipment ?? "—"}
                      </span>
                    </span>
                    {selectedIds.has(row.id) ? (
                      <span className="shrink-0 text-xs font-bold text-primary">Selected</span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Pick a body part or type at least two letters.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {value.length} of {max} selected.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" className="h-11 w-full rounded-xl" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
