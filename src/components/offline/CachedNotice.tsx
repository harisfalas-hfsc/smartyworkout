import { CloudOff } from "lucide-react";

function relative(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Small inline note telling the member the page is showing a saved copy. */
export function CachedNotice({ savedAt, show }: { savedAt: number | null; show: boolean }) {
  if (!show) return null;
  return (
    <p className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-blue-400 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
      <CloudOff className="h-4 w-4 shrink-0 text-primary" />
      Saved copy{savedAt ? ` from ${relative(savedAt)}` : ""} — this is what we stored on your
      device the last time you were online.
    </p>
  );
}
