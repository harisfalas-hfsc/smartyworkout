# Universal prompt — TRUE NATIVE OFFLINE (iOS + Android + PWA + desktop)

Paste this whole prompt into any Smarty project (Diet, Logbook, Gym, Training for Performance, Move).
It fixes the four root causes of a native app that shows
`Error loading page … net::ERR_INTERNET_DISCONNECTED` when the device is offline.

## The 4 root causes

1. **Remote shell.** `capacitor.config.ts` has `server.url` pointing at the live site, so the very
   first paint needs internet. Nothing else can save it.
2. **Wrong connectivity source.** `navigator.onLine` is unreliable inside a WebView; the app thinks
   it is online, fires network calls, and blanks out.
3. **No offline session restore.** The native WebView starts with a different storage origin than the
   remote site, so the member appears signed out and is bounced to a login screen that cannot load.
4. **No local shell in the binary.** SSR apps have no `index.html`, so nothing local exists to boot.

## Required changes

### 1. Bundle the shell — never load a remote URL

`capacitor.config.ts`: remove `server.url` entirely. Use `webDir: "dist/native"` plus
`server: { androidScheme: "https", iosScheme: "https", cleartext: false }`.

Add `scripts/build-native.mjs` that copies the client build into `dist/native`, reads the Vite
client manifest (`dist/client/.vite/manifest.json`), finds the hashed entry + CSS, and writes a
local `index.html` that boots the app client-side. Scripts:

```json
"build:native": "vite build && node scripts/build-native.mjs",
"cap:sync": "npx cap sync"
```

### 2. One connectivity source: `src/lib/offline/connectivity.ts`

Export `isNativeApp()`, `nativePlatform()`, `isOnline()`, `initConnectivity()`,
`subscribeConnectivity()`. Read the native Network plugin off the injected global
(`window.Capacitor.Plugins.Network`) — no npm dependency, same bundle for web/PWA/native — and fall
back to the browser `online`/`offline` events. **Every** `navigator.onLine` in the codebase must be
replaced with `isOnline()`, and `useOnlineStatus()` must subscribe to this module.

### 3. Boot order — `src/lib/offline/native-boot.ts`, called first in the app root effect

1. `initConnectivity()`
2. restore the last Supabase session from local device storage when the WebView starts empty
3. re-save the live session on every focus
4. hide the native splash screen so a failed request can never freeze it

Then register the service worker and mount the offline bootstrap prefetcher.

### 4. Offline auth

Keep the PBKDF2-SHA256 device verifier + cached session (offline sign-in), and let the protected
route gate accept a cached session while offline instead of redirecting to `/auth`.

### 5. Data layer (unchanged rules)

IndexedDB envelopes, keys scoped per user id, every read through `offlineFirst(key, loader, userId)`,
a startup prefetch of the member's entire world, and a `trimCache` that protects member data and only
evicts expendable media.

### 6. PWA config

`vite-plugin-pwa` (`generateSW`, `injectRegister: null`, `devOptions.enabled: false`),
guarded registration (never in dev/iframe/Lovable preview, `?sw=off` kill switch),
`NetworkFirst` navigations with a precached offline page, `CacheFirst` for hashed assets/fonts/media.

## Ship + verify

```bash
bun run build:native
npx cap add ios && npx cap add android   # first time only
npx cap sync
npx cap open ios   # / android
```

Verify on a real device: install, sign in once online, **enable airplane mode**, force-quit, relaunch.
The app must open instantly, stay signed in, and show logbook / library / progress / community from the
device. Creating, generating, paying and AI actions stay disabled with one honest message.

> Store note: already-submitted binaries keep their old startup behaviour — a new build must be
> uploaded, because the remote-shell behaviour cannot be changed remotely.
