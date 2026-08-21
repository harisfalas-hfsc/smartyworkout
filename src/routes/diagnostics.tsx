import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  connectivityDiagnostics,
  isNativeApp,
  nativePlatform,
  probeBackend,
} from "@/lib/offline/connectivity";
import { readMeta } from "@/lib/offline/db";
import { queueDiagnostics } from "@/lib/offline/queue";
import { readOfflineReadiness } from "@/lib/offline/readiness";
import { readCache, scopedKey } from "@/lib/offline/store";

export const Route = createFileRoute("/diagnostics")({
  component: DiagnosticsPage,
  head: () => ({
    meta: [
      { title: "Offline diagnostics | Smarty Workout" },
      {
        name: "description",
        content: "Internal QA screen for checking offline readiness of Smarty Workout on web, PWA and native.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Offline diagnostics | Smarty Workout" },
      { property: "og:description", content: "Internal QA screen for offline readiness checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Report = Record<string, string | number | boolean | null>;

function time(value: number | null | undefined) {
  return value ? new Date(value).toLocaleString() : "never";
}

function DiagnosticsPage() {
  const { user, displayName, profile } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const collect = useCallback(async () => {
    setBusy(true);
    const conn = connectivityDiagnostics();
    const meta = await readMeta();
    const queue = await queueDiagnostics();
    const readiness = await readOfflineReadiness();

    let swRegistered = false;
    let swActive = false;
    let swControlling = false;
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      swRegistered = regs.length > 0;
      swActive = regs.some((r) => Boolean(r.active));
      swControlling = Boolean(navigator.serviceWorker.controller);
    }

    let shellCached = 0;
    if (typeof caches !== "undefined") {
      const names = await caches.keys().catch(() => [] as string[]);
      for (const name of names) {
        const cache = await caches.open(name);
        shellCached += (await cache.keys()).length;
      }
    }

    const logbook = user ? await readCache(scopedKey(user.id, "logbook:list")) : null;
    const cachedProfile = user ? await readCache(scopedKey(user.id, "profile:full")) : null;
    const storageEstimate =
      typeof navigator !== "undefined" && navigator.storage?.estimate
        ? await navigator.storage.estimate().catch(() => null)
        : null;

    setReport({
      platform: isNativeApp() ? `native (${nativePlatform()})` : "web / PWA",
      connectivity: conn.state,
      deviceReportsNetwork: conn.deviceOnline,
      lastBackendCheck: time(conn.lastProbeAt),
      backendReachable: conn.lastProbeOk ?? "unknown",
      serviceWorkerRegistered: swRegistered,
      serviceWorkerActive: swActive,
      serviceWorkerControllingPage: swControlling,
      cachedFiles: shellCached,
      browserStorageUsedBytes: storageEstimate?.usage ?? "unavailable",
      browserStorageQuotaBytes: storageEstimate?.quota ?? "unavailable",
      localDatabase: typeof indexedDB !== "undefined",
      localDatabaseVersion: meta.dbVersion,
      signedInUser: user ? user.id : "none",
      displayNameAvailable: Boolean(displayName),
      avatarAvailable: Boolean(profile?.avatar_url),
      profileSavedLocally: Boolean(cachedProfile),
      workoutsSavedLocally: readiness.workouts,
      exercisesSavedLocally: readiness.exercises,
      performanceRowsSavedLocally: readiness.performanceRows,
      logbookSavedLocally: Boolean(logbook),
      offlineReady: readiness.ready,
      preparedAt: time(readiness.preparedAt),
      pendingChanges: queue.pending,
      failedChanges: queue.failed,
      parkedChanges: queue.dead,
      lastSyncStarted: time(meta.lastSyncStartedAt),
      lastSyncFinished: time(meta.lastSyncFinishedAt),
      lastSyncError: meta.lastSyncError ?? "none",
    });
    setBusy(false);
  }, [user, displayName, profile?.avatar_url]);

  useEffect(() => {
    void collect();
  }, [collect]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Offline diagnostics</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Internal QA screen. Use it to confirm that the app can run without a connection.
      </p>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => void collect()} disabled={busy}>
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await probeBackend(true);
            await collect();
          }}
          disabled={busy}
        >
          Check connection
        </Button>
      </div>

      <Card className="mt-6 border-2 border-primary">
        <CardHeader>
          <CardTitle>Current state</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm">
            {report &&
              Object.entries(report).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 border-b border-border/50 pb-1">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-medium">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
