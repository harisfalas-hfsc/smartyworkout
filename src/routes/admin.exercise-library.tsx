import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Loader2, UploadCloud, FileJson, Images, ArrowLeft } from "lucide-react";
import { isAdminEmail } from "@/lib/admin";

const BUCKET = "exercise-library";
const CONCURRENCY = 6;

export const Route = createFileRoute("/admin/exercise-library")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Exercise Library Upload | SmartyWorkout Admin" },
      {
        name: "description",
        content:
          "Admin tool to bulk upload the SmartyWorkout exercise library: animated GIF demonstrations and the exercise metadata JSON file.",
      },
      { property: "og:title", content: "Exercise Library Upload | SmartyWorkout Admin" },
      {
        property: "og:description",
        content: "Bulk upload exercise GIFs and metadata JSON for SmartyWorkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setAuthed(isAdminEmail(data.user?.email)))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-4 lg:px-8">
        {authed === null ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !authed ? (
          <div className="mx-auto mt-10 max-w-sm rounded-3xl border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-extrabold">Admin access only</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This area is restricted to SmartyWorkout administrators.
            </p>
          </div>
        ) : (
          <Uploader />
        )}
      </main>
    </div>
  );
}

type Status = {
  total: number;
  done: number;
  failed: { name: string; error: string }[];
  running: boolean;
};

function Uploader() {
  const gifsRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ total: 0, done: 0, failed: [], running: false });
  const [log, setLog] = useState<string | null>(null);
  const [existing, setExisting] = useState<number | null>(null);

  async function refreshCount() {
    let count = 0;
    let offset = 0;
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("gifs", { limit: 100, offset });
      if (error || !data) break;
      count += data.length;
      if (data.length < 100) break;
      offset += 100;
    }
    setExisting(count);
  }
  useEffect(() => {
    void refreshCount();
  }, []);

  async function uploadMany(files: File[], prefix: string) {
    if (!files.length) return;
    setStatus({ total: files.length, done: 0, failed: [], running: true });
    setLog(null);
    let index = 0;
    const failed: { name: string; error: string }[] = [];
    let done = 0;

    async function worker() {
      while (index < files.length) {
        const i = index++;
        const file = files[i]!;
        const rel =
          ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name)
            .split("/")
            .pop() || file.name;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${prefix}/${rel}`, file, {
            upsert: true,
            contentType: file.type || undefined,
            cacheControl: "31536000",
          });
        if (error) failed.push({ name: rel, error: error.message });
        done++;
        if (done % 5 === 0 || done === files.length) {
          setStatus((s) => ({ ...s, done, failed: [...failed] }));
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setStatus({ total: files.length, done: files.length, failed, running: false });
    setLog(
      `Uploaded ${files.length - failed.length} of ${files.length} files${failed.length ? ` — ${failed.length} failed` : ""}.`,
    );
    void refreshCount();
  }

  function pickGifs(list: FileList | null) {
    const files = Array.from(list ?? []).filter(
      (f) => f.type === "image/gif" || /\.(gif|webp|mp4|png|jpe?g)$/i.test(f.name),
    );
    void uploadMany(files, "gifs");
  }

  function pickJson(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => /\.json$/i.test(f.name));
    void uploadMany(files, "data");
  }

  const pct = status.total ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Admin
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Exercise library upload</h1>
          <p className="text-sm text-muted-foreground">
            Upload the exercise GIFs and the metadata JSON. Files are stored privately and served
            through signed links.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Images className="h-4 w-4 text-primary" /> Exercise GIFs
            </CardTitle>
            {existing !== null && <Badge variant="secondary">{existing} stored</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick the whole folder (recommended for 1,300+ files) or select the files manually.
              Uploads run {CONCURRENCY} at a time and existing files are overwritten.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => folderRef.current?.click()}
                disabled={status.running}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Choose folder
              </Button>
              <Button
                variant="outline"
                onClick={() => gifsRef.current?.click()}
                disabled={status.running}
              >
                Choose files
              </Button>
            </div>
            <input
              ref={folderRef}
              type="file"
              multiple
              // @ts-expect-error non-standard directory attributes
              webkitdirectory=""
              directory=""
              className="hidden"
              onChange={(e) => pickGifs(e.target.files)}
            />
            <input
              ref={gifsRef}
              type="file"
              multiple
              accept="image/gif,image/webp,image/png,image/jpeg,video/mp4"
              className="hidden"
              onChange={(e) => pickGifs(e.target.files)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-4 w-4 text-primary" /> Metadata JSON
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload the exercise JSON file. It is stored at <code>data/</code> inside the library
              and can be read later by the plan generator.
            </p>
            <Button
              variant="outline"
              onClick={() => jsonRef.current?.click()}
              disabled={status.running}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Choose JSON file
            </Button>
            <input
              ref={jsonRef}
              type="file"
              multiple
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => pickJson(e.target.files)}
            />
          </CardContent>
        </Card>
      </div>

      {(status.running || status.total > 0) && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {status.running ? "Uploading…" : "Upload finished"}
              </span>
              <span className="text-muted-foreground">
                {status.done} / {status.total} ({pct}%)
              </span>
            </div>
            <Progress value={pct} />
            {log && <p className="text-sm text-muted-foreground">{log}</p>}
            {status.failed.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-xl border bg-muted/40 p-3 text-xs">
                {status.failed.map((f) => (
                  <div key={f.name} className="text-destructive">
                    {f.name}: {f.error}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
