import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";
import { Toaster } from "../components/ui/sonner";
import { SisterAppsPopup } from "../components/growth/SisterAppsPopup";
import { BottomNav } from "../components/BottomNav";
import { ThemeProvider, THEME_INIT_SCRIPT } from "../lib/theme";
import { OfflineBanner } from "../components/offline/OfflineBanner";
import { OfflineSync } from "../components/offline/OfflineSync";
import { OfflineBootstrap } from "../components/offline/OfflineBootstrap";
import { registerAppServiceWorker } from "../lib/offline/register-sw";
import { bootNativeShell } from "../lib/offline/native-boot";


const SITE_URL = "https://smartyworkout.com";
const OG_IMAGE = "https://smartyworkout.com/og-social.jpg";

const SITE_DESCRIPTION =
  "SmartyWorkout creates personalized workouts from your goals, experience, equipment, limitations and feedback, guided by Smarty Coach and sports scientist Haris Falas.";

const KEYWORDS = [
  "AI workout generator",
  "AI personal trainer",
  "AI workout planner",
  "AI fitness coach",
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

const JSONLD_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SmartyWorkout",
      alternateName: ["Smarty Workout", "SmartyWorkout AI"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      image: OG_IMAGE,
      description:
        "SmartyWorkout creates personalized workouts through Smarty Coach, combining AI with the coaching expertise of sports scientist Haris Falas.",
      foundingDate: "2024",
      email: "smartyworkout@outlook.com",
      knowsAbout: [
        "Strength training",
        "Hypertrophy training",
        "Conditioning",
        "Workout programming",
        "Periodization",
        "Progressive overload",
        "Exercise selection",
        "Mobility and warm-up",
        "Bodyweight training",
        "Kettlebell training",
        "Dumbbell training",
        "Injury-aware training",
        "Sports science",
        "AI workout generation",
        "Personalized fitness coaching",
      ],
      founder: {
        "@type": "Person",
        "@id": `${SITE_URL}/haris-falas#person`,
        name: "Haris Falas",
        jobTitle: "Sports Scientist",
        url: `${SITE_URL}/haris-falas`,
      },
      sameAs: [
        "https://smartygym.com",
        "https://smartymove.com",
        "https://smartydiet.com",
        "https://www.instagram.com/smartyworkout",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "smartyworkout@outlook.com",
          contactType: "customer support",
          availableLanguage: ["English"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SmartyWorkout",
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/exercise-library?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${SITE_URL}/#software`,
      name: "SmartyWorkout — AI Workout Generator",
      applicationCategory: "HealthApplication",
      applicationSubCategory: "AI workout generator and personal training coach",
      operatingSystem: "Web, iOS, Android",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      url: SITE_URL,
      image: OG_IMAGE,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
      featureList: [
        "AI workout generator built on your training profile",
        "Workout of the Day in bodyweight and equipment variants",
        "Exercise library with 1,300+ demonstrated movements",
        "Equipment-aware exercise filtering",
        "Injury and limitation aware programming",
        "Beginner, intermediate and advanced difficulty ladder",
        "Interactive workout player with rest timers",
        "Training logbook and calendar scheduling",
        "Progress tracking and workout feedback loop",
        "Workout timer, rounds tracker and 1RM calculator",
        "PDF export of any workout",
      ],
      keywords: KEYWORDS,
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "EUR",
        category: "subscription",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
      },
    },
  ],
};


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      {
        title:
          "SmartyWorkout — Personalized Workouts with Smarty Coach",
      },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "keywords", content: KEYWORDS },
      { name: "author", content: "SmartyWorkout" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "application-name", content: "SmartyWorkout" },
      { name: "apple-mobile-web-app-title", content: "SmartyWorkout" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#000000" },
      { name: "color-scheme", content: "dark" },

      { property: "og:site_name", content: "SmartyWorkout" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content:
          "SmartyWorkout — Personalized Workouts with Smarty Coach",
      },
      { property: "og:description", content: SITE_DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@smartyworkout" },
      {
        name: "twitter:title",
        content:
          "SmartyWorkout — Personalized Workouts with Smarty Coach",
      },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(JSONLD_GRAPH),
      },
      {
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-P5GKLY51WY",
      },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-P5GKLY51WY');",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    bootNativeShell();
    registerAppServiceWorker();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <OfflineBanner />
          <Navigation />
          <main>
            <Outlet />
          </main>
          <SiteFooter />
          <Toaster />
          <SisterAppsPopup />
          <BottomNav />
          <OfflineSync />
          <OfflineBootstrap />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

