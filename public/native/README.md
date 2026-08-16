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
