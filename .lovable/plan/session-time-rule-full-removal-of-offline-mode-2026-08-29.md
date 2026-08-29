# Session time rule + full removal of offline mode

Two separate changes, both confirmed against the current code.

## 1. Advertised time = training time only

**What happens today:** the requested duration has to cover everything. `sessionOverflowViolation` in the engine measures activation + main work + rest + transitions + finisher + cool-down and rejects the workout when that total passes about `requested x 1.1 + 4` minutes. Because of that, a 30-minute request has to squeeze the actual training into roughly 20 minutes, and short requests were failing outright.

**New rule:** the number the member picks is the *training* time — Main Workout plus Finisher. Activation and cool-down are a bounded allowance on top of it.

- Main + Finisher must land inside the requested duration (unchanged hard ceiling, tightened slightly since it no longer shares the clock).
- Activation is capped at about 5-8 minutes depending on session length; cool-down at about 4-5 minutes. Anything longer is a hard rejection, so prep can never balloon.
- The blueprint stops stealing time from the main block: the main-block budget goes back to the full requested duration instead of `requested - prep`.
- The whole-session check stays, but only as a sanity ceiling (training time + the two allowances). It can no longer reject a properly dosed session.
- Wording on the workout page/logbook stays as it is: the duration shown is the training time, with warm-up and cool-down on top.

Result: a 30-minute strength session is 30 minutes of real work, with roughly 6 minutes of activation and 4 of cool-down around it — not 20 minutes of work padded out to 30.

## 2. Offline mode is removed completely

**What that pill actually was.** Offline mode was never removed — the whole engine is still installed and running. The pill appears while the app prepares or refreshes your device copy. Concretely it was:

- registering a service worker and pre-caching public and member pages
- downloading your workouts, set logs, results, feedback, notifications, support threads, progress, community lists and WOD data into a local database
- warming exercise images/GIFs into a media cache
- replaying any queued actions (status changes, ratings, debriefs, profile saves, even queued workout requests) when the connection came back

On the homepage, signed out, it was the public-shell pre-cache — which is why you saw it with nothing of yours to sync.

**Removal scope**

- Delete the offline components (status pill, background sync, bootstrap prefetch, cached-data notice) and unmount them from the app root.
- Delete `src/lib/offline/` (local database, action queue, prefetch store, readiness, sign-out cleanup, connectivity/online hooks, offline-first wrapper, performance store) and its tests.
- Remove the PWA service-worker/Workbox setup from the build config and the manual cleanup worker, and unregister any service worker already installed on members' devices so nobody stays stuck on a cached shell.
- Rewrite every screen that read through the offline layer — Coach, WOD, Logbook, Workout page, Player, Progress, Community, Inbox, Notifications, Account, Profile, Exercise Library, Diagnostics — to read and write directly against the backend, with normal loading and error states.
- Workout logging, session debrief and repeat comparison now write straight to the server. Same data, same tables; no local-first buffer.
- Offline device sign-in is dropped: signing in always requires a connection.
- The exercise image/GIF pipeline keeps its signed private-bucket URL resolution (that is what made pictures work) but loses the caching layer.
- The Diagnostics page loses its cache-health section, or goes away entirely if nothing else is left on it.

**Trade-off, stated plainly:** with no connection the app will show an error instead of your saved data, and actions taken while disconnected are lost rather than queued. That is the intended outcome of removing offline mode.

## Technical notes

- Engine files: `doctrine.ts` (`sessionOverflowViolation`, new activation/cool-down caps), `validate.server.ts` (gate wiring), `programming.ts` (main-block budget), `enforce.server.ts` (block estimators), plus the engine tests updated to the new time policy.
- Offline removal touches roughly 30 route/component files plus `__root.tsx`, `router.tsx`, `vite.config.ts`, `public/sw-extra.js` and the sync tests.
- Full test suite and typecheck run after both changes.
