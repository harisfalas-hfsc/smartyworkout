import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native wrapper (iOS + Android) for SmartyWorkout.
 *
 * IMPORTANT: there is NO `server.url`. A remote-loaded shell cannot start
 * without internet (that is the `net::ERR_INTERNET_DISCONNECTED` white screen).
 * The app ships the built web shell inside the binary (`dist/native`, produced
 * by `bun run build:native`), so it boots fully offline and then talks to the
 * backend only when a connection exists.
 */
const config: CapacitorConfig = {
  appId: "com.smartyworkout.app",
  appName: "Smarty Workout",
  webDir: "dist/native",
  server: {
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    backgroundColor: "#000000",
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
