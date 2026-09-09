/**
 * Brand configuration — single source of truth for the dual-brand setup.
 * The app resolves the active brand from the incoming request host, so
 * smartyworkout.com stays Smarty Workout and smartygym.com renders as
 * SmartyGym. Localhost/preview defaults to Smarty Workout.
 */

export type BrandId = "smartyworkout" | "smartygym";

export interface BrandConfig {
  id: BrandId;
  /** Camel-case product name, e.g. "SmartyWorkout". */
  name: string;
  /** Spaced display name, e.g. "Smarty Workout". */
  displayName: string;
  /** Short product name used where space is tight. */
  shortName: string;
  /** Upper-case sender name for emails. */
  senderName: string;
  /** Root domain without www. */
  domain: string;
  /** Full canonical origin, e.g. "https://smartyworkout.com". */
  siteUrl: string;
  /** System email address used for contact forms and admin alerts. */
  systemEmail: string;
  /** Outgoing email sender domain (must be delegated to Lovable). */
  senderDomain: string;
  /** From header domain shown to recipients. */
  fromDomain: string;
  /** Path to the logo image used in the UI. */
  logo: string;
  /** Path to the 192x192 icon. */
  icon192: string;
  /** Path to the 512x512 icon. */
  icon512: string;
  /** Path to the Apple touch icon. */
  appleTouchIcon: string;
  /** Path to the favicon .ico. */
  faviconIco: string;
  /** Path to the favicon png. */
  faviconPng: string;
  /** Path to the web manifest. */
  manifest: string;
  /** Path to the social sharing image. */
  ogImage: string;
  /** Phone home-screen / PWA short name. */
  pwaShortName: string;
  /** Phone home-screen / PWA full name. */
  pwaName: string;
  /** Coach persona name used in copy. */
  coachName: string;
  /** Community section name. */
  communityName: string;
  /** Homepage hero headline. */

  headline: string;
  /** Homepage hero description. */
  description: string;
  /** Homepage CTA labels. */
  cta: {
    coach: string;
    wod: string;
    pricing: string;
    founder: string;
  };
  /** Membership subline in paid mode. */
  subline: string;
  /** Membership subline in free-access mode. */
  freeSubline: string;
  /** Default page title for the root route. */
  metaTitle: string;
  /** Default meta description for the root route. */
  metaDescription: string;
  /** Default meta keywords. */
  keywords: string;
  /** Instagram handle (full URL). */
  instagramUrl: string;
  /** TikTok handle (full URL). */
  tiktokUrl: string;
  /** Facebook handle (full URL). */
  facebookUrl: string;
  /** YouTube handle (full URL). */
  youtubeUrl: string;
  /** Twitter/X site handle. */
  twitterSite: string;
  /** Google Analytics measurement ID. */
  gtagId: string;
}

const WORKOUT_KEYWORDS = [
  "personalized workout generator",
  "online personal trainer",
  "workout planner",
  "fitness coach app",
  "personalized workout plan",
  "custom workout generator",
  "workout plan generator",
  "workout of the day",
  "daily workout",
  "home workout plan",
  "gym workout plan",
  "bodyweight workout",
  "dumbbell workout",
  "kettlebell workout",
  "resistance band workout",
  "no equipment workout",
  "strength training plan",
  "hypertrophy program",
  "muscle building workout",
  "fat loss workout",
  "conditioning workout",
  "HIIT workout",
  "circuit training",
  "EMOM workout",
  "AMRAP workout",
  "mobility routine",
  "warm up routine",
  "exercise library",
  "exercise database",
  "exercise demonstrations",
  "workout timer",
  "rounds tracker",
  "1RM calculator",
  "one rep max calculator",
  "training logbook",
  "workout tracker",
  "progress tracking",
  "periodization",
  "progressive overload",
  "beginner workout plan",
  "advanced workout plan",
  "injury friendly workout",
  "sports science training",
  "Smarty Coach",
  "SmartyWorkout",
].join(", ");

const GYM_KEYWORDS = [
  "online gym",
  "virtual gym",
  "personal coach app",
  "gym reimagined",
  "online fitness coach",
  "personalized gym workout",
  "home gym workout",
  "gym workout plan",
  "workout of the day",
  "daily workout",
  "strength training plan",
  "hypertrophy program",
  "muscle building workout",
  "fat loss workout",
  "conditioning workout",
  "HIIT workout",
  "circuit training",
  "mobility routine",
  "exercise library",
  "workout timer",
  "rounds tracker",
  "1RM calculator",
  "training logbook",
  "progress tracking",
  "periodization",
  "progressive overload",
  "beginner workout plan",
  "advanced workout plan",
  "injury friendly workout",
  "sports science training",
  "SmartyGym",
].join(", ");

export const BRANDS: Record<BrandId, BrandConfig> = {
  smartyworkout: {
    id: "smartyworkout",
    name: "SmartyWorkout",
    displayName: "Smarty Workout",
    shortName: "SmartyWorkout",
    senderName: "SMARTY WORKOUT",
    domain: "smartyworkout.com",
    siteUrl: "https://smartyworkout.com",
    systemEmail: "smartyworkout@outlook.com",
    senderDomain: "notify.smartyworkout.com",
    fromDomain: "notify.smartyworkout.com",
    logo: "/smartyworkout-logo.png",
    icon192: "/icon-192.png",
    icon512: "/icon-512.png",
    appleTouchIcon: "/apple-touch-icon.png",
    faviconIco: "/favicon.ico",
    faviconPng: "/favicon.png",
    manifest: "/manifest.webmanifest",
    ogImage: "/og-social.jpg",
    pwaShortName: "SmartyWorkout",
    pwaName: "Smarty Workout",
    coachName: "Smarty Coach",
    communityName: "Smarty Community",
    headline: "Your personal workout\nanytime anywhere",

    description:
      "Answer a smart questionnaire. Get a full tailor-made workout built around your body, goals, equipment and constraints.",
    cta: {
      coach: "Create your workout",
      wod: "Follow Workout of the Day",
      pricing: "See pricing",
      founder: "A note from the founder",
    },
    subline: "One membership. Two personalized workouts every day.",
    freeSubline: "Two personalized workouts every day.",
    metaDescription:
      "Personalized workouts built from your goals, experience, equipment and limitations, guided by Smarty Coach and sports scientist Haris Falas.",
    keywords: WORKOUT_KEYWORDS,
    instagramUrl: "https://www.instagram.com/smartyworkout",
    tiktokUrl: "https://www.tiktok.com/@smarty.diet?_r=1&_t=ZN-97ibGwN3neA",
    facebookUrl: "https://www.facebook.com/",
    youtubeUrl: "#",
    twitterSite: "@smartyworkout",
    gtagId: "G-P5GKLY51WY",
  },
  smartygym: {
    id: "smartygym",
    name: "SmartyGym",
    displayName: "SmartyGym",
    shortName: "SmartyGym",
    senderName: "SMARTYGYM",
    domain: "smartygym.com",
    siteUrl: "https://smartygym.com",
    systemEmail: "smartygym@outlook.com",
    senderDomain: "notify.smartygym.com",
    fromDomain: "notify.smartygym.com",
    logo: "/brands/smartygym/logo.png",
    icon192: "/brands/smartygym/icon-192.png",
    icon512: "/brands/smartygym/icon-512.png",
    appleTouchIcon: "/brands/smartygym/apple-touch-icon.png",
    faviconIco: "/brands/smartygym/favicon.ico",
    faviconPng: "/brands/smartygym/favicon.png",
    manifest: "/brands/smartygym/manifest.webmanifest",
    ogImage: "/brands/smartygym/og-social.jpg",
    pwaShortName: "SmartyGym",
    pwaName: "SmartyGym",
    coachName: "your coach",
    communityName: "SmartyGym Community",
    headline: "YOUR GYM RE-IMAGINED\nANYWHERE, ANYTIME",

    description:
      "SmartyGym is your online gym and personal coach; tell your coach how you feel, what you want to achieve and what equipment you have, and get a complete programmed session whenever and wherever you train.",
    cta: {
      coach: "Ask your coach",
      wod: "Follow Workout of the Day",
      pricing: "See pricing",
      founder: "A note from the founder",
    },
    subline: "One membership. Two personalized workouts every day.",
    freeSubline: "Free for every member. Two personalized workouts every day.",
    metaDescription:
      "SmartyGym is your online gym and personal coach. Tell your coach how you feel, your goal and your equipment, and get a complete programmed session wherever you train.",
    keywords: GYM_KEYWORDS,
    instagramUrl: "https://www.instagram.com/smartyworkout",
    tiktokUrl: "https://www.tiktok.com/@smarty.diet?_r=1&_t=ZN-97ibGwN3neA",
    facebookUrl: "https://www.facebook.com/",
    youtubeUrl: "#",
    twitterSite: "@smartyworkout",
    gtagId: "G-P5GKLY51WY",
  },
};

export const DEFAULT_BRAND_ID: BrandId = "smartyworkout";

export function resolveBrand(host: string | null | undefined): BrandConfig {
  if (!host) return BRANDS[DEFAULT_BRAND_ID];
  const h = host.toLowerCase().replace(/^www\./, "").split(":")[0];
  if (h === "smartygym.com") return BRANDS.smartygym;
  return BRANDS[DEFAULT_BRAND_ID];
}

export function isSmartyGym(brand: BrandConfig): boolean {
  return brand.id === "smartygym";
}
