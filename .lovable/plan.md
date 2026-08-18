# Offline Mode for Smarty Workout

Yes — this is absolutely possible. The app is already installable (it has an app manifest and icons), but nothing is stored on the device yet, so today a lost connection means a blank page. The plan below turns it into a real offline-capable app: the app itself is stored on the device, and everything the member has already seen is kept locally so it can be opened again with no internet.

## What will work offline

- The whole app shell: navigation, all marketing/info pages, tools (timer, rounds tracker, 1RM calculator), light/dark mode.
- Logbook, calendar, and any workout the member has opened before — full reader mode and player, including exercise details and demo images that were already viewed.
- Progress page, account/profile data, WOD days already opened, and the community page exactly as it looked at the last online visit.
- Marking a workout completed/scheduled, saving feedback, likes and ratings while offline — these are queued and sent automatically the moment the connection returns.
- A small "Offline — showing your saved data" banner so the member always knows what they're looking at.

## What cannot work offline (and will say so clearly)

- Generating a new workout with Smarty Coach (needs the AI).
- First-ever sign in on a new device, sign up, password reset, checkout/payments.
- Brand-new community activity, new WOD of the day, new notifications — these appear once back online.
- The very first visit must be online; after that the app is stored on the device.

## Approach

**1. Installable offline app shell**
Add `vite-plugin-pwa` (generateSW) so the built app — HTML, JavaScript, CSS, fonts, icons — is stored on the device. Registration happens only in the published app via a guarded wrapper (never in the Lovable editor preview or in dev), with a `?sw=off` kill switch. Page navigations use network-first so members always get the newest version when online; built assets are cache-first.

**2. Local data store**
Add a lightweight IndexedDB store and a shared `useOfflineData` hook that wraps the existing loaders. Every successful load is written to the device under the signed-in user's key; when a load fails or the device is offline, the last saved copy is shown instead, with an "as of <time>" note. Applied to: logbook, workout detail, WOD, progress, account/profile, community hub and community workout pages, exercise library.

**3. Exercise images**
Demo GIFs use signed links that expire, so image bytes are cached by the service worker at runtime and the resolved links are stored locally, so previously viewed exercises still show their demonstration offline.

**4. Offline action queue**
Writes performed offline (workout status, scheduling, feedback, likes, ratings) are stored in a queue in IndexedDB and replayed in order on reconnect, with a toast confirming they synced. Actions that require the server (generation, payments) are blocked with a clear offline message rather than failing silently.

**5. Storage hygiene**
Cached data is scoped per user and cleared on sign out; older cached workouts are trimmed so a device never fills up.

## Technical notes

- `vite-plugin-pwa` with `registerType: "autoUpdate"`, `devOptions.enabled: false`, `injectRegister: null`, SW at `/sw.js`; navigation fallback excludes `/~oauth` and `/api/*`.
- Registration wrapper refuses in dev, in iframes, on `*.lovableproject.com` / preview hosts, and with `?sw=off`; it unregisters stale workers in those contexts.
- Data layer: `idb-keyval` + a `src/lib/offline/` module (store, `useOfflineData`, `useOnlineStatus`, action queue). No change to server functions or database schema.
- Existing pages keep their current `useEffect`/`useServerFn` loading; the hook wraps them, so behaviour online is unchanged.
- Offline behaviour is only testable in the published app, not in the editor preview.

## Suggested order

1. Offline app shell + offline banner + online/offline detection.
2. Local data store and read-side caching for logbook, workouts, progress, account.
3. Community, WOD, exercise library caching plus image caching.
4. Offline write queue and reconnect sync.
