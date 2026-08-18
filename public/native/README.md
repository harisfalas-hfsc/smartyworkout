# Smarty Workout — native launch screens

All assets are generated from `public/icon-512.png` on a pure black (#000000) background,
matching the web splash screen.

## Android (Capacitor / native)

Copy into `android/app/src/main/res/`:

- `splash-port-<density>.png` → `drawable-port-<density>/splash.png`
- `splash-land-<density>.png` → `drawable-land-<density>/splash.png`
- `splash-icon-<density>.png` → `drawable-<density>/splash_icon.png` (Android 12+ splash icon)

Android 12+ theme (`res/values/styles.xml`):

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
  <item name="android:background">@android:color/black</item>
  <item name="windowSplashScreenBackground">#000000</item>
  <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
</style>
```

## iOS (Capacitor / Xcode)

Copy into `ios/App/App/Assets.xcassets/Splash.imageset/`:

- `splash-2732x2732.png` (1x)
- `splash-2732x2732-1.png` (2x)
- `splash-2732x2732-2.png` (3x)

Set the LaunchScreen storyboard background colour to black (#000000) and the image
content mode to *Center* (not *Scale To Fill*) so the icon keeps its proportions.

App icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` ← `AppIcon-1024.png`.

## Status bar / theme colour

`background_color` and `theme_color` in `manifest.webmanifest` are `#000000`, so the
web, PWA and native shells all show the same black startup screen.

## Store submission (iOS + Android) — wrapper setup

The native apps are a thin Capacitor shell around the mobile web view, so every
Lovable deploy updates both stores' apps instantly.

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
npx cap sync
```

`capacitor.config.ts` (repo root) already sets the app id, name, black splash and
`server.url = https://smartyworkout.com`.

### Behaviour already handled in the web app

- **No pull-to-refresh**: `overscroll-behavior-y: contain` on `html, body`, so the
  page never rubber-band reloads. Android back button and iOS/Android edge-swipe
  gestures still navigate normally (TanStack Router history).
- **Refresh = logo**: tapping the SMARTYWORKOUT wordmark navigates home, revalidates
  data and scrolls to the top.
- **Offline**: service worker app shell + IndexedDB caches (logbook, library, WOD,
  opened workouts) + queued actions replayed on reconnect.
- **Offline sign-in**: after one online sign-in on the device, the account can sign
  back in with no internet (PBKDF2 verifier + saved session, device-only).
- **Safe areas**: `viewport-fit=cover` plus `env(safe-area-inset-*)` padding in the
  header and bottom nav (notch / home indicator safe).

### Android back button

Capacitor maps the hardware/gesture back to browser history by default; no extra
code needed. To exit on the home route, add the `@capacitor/app` `backButton`
listener in the native shell only.
