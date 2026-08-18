import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native wrapper (iOS + Android) for SmartyWorkout.
 *
 * The apps load the live published site, so every Lovable update ships to the
 * stores' installed apps instantly. `server.url` keeps one codebase; offline
 * support comes from the service worker + on-device cache already in the app.
 */
const config: CapacitorConfig = {
  appId: "com.smartyworkout.app",
  appName: "Smarty Workout",
  webDir: "dist/client",
  server: {
    url: "https://smartyworkout.com",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    backgroundColor: "#000000",
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#000000",
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
