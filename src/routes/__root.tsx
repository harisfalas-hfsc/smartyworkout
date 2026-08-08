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

const SITE_URL = "https://smartyworkout.com";
const OG_IMAGE =
  "https://smartyworkout.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png";

const SITE_DESCRIPTION =
  "SmartyWorkout is the AI Training Intelligence Platform — your pocket coach and diet coach. Personalized AI workout plans, Smarty Training Score™, Metabolic Age™, and free calorie, BMI, BMR, TDEE and macro calculators.";

const KEYWORDS = [
  "AI Training Intelligence Platform",
  "AI Coach",
  "AI Trainingist",
  "AI Diet Coach",
  "AI Workout Planner",
  "Personal Training Plan",
  "Custom Workout Plans",
  "Training Coaching",
  "Training Assessment",
  "Training Analysis",
  "Training Score",
  "Diet Score",
  "Diet Analysis",
  "Workout Plan Generator",
  "Diet Coach App",
  "Weight Loss App",
  "Weight Management",
  "Calorie Calculator",
  "BMI Calculator",
  "BMR Calculator",
  "TDEE Calculator",
  "Macro Calculator",
  "Macro Tracking",
  "Calorie Tracking",
  "Calorie Counter",
  "Food Diary",
  "Food Log",
  "Nutrient Analysis",
  "Micronutrient Tracking",
  "Protein Calculator",
  "Carb Calculator",
  "Fat Calculator",
  "Water Intake Calculator",
  "Ideal Weight Calculator",
  "Body Fat Calculator",
  "Waist-to-Hip Ratio",
  "Personalized Training",
  "Precision Training",
  "Digital Coach",
  "Virtual Trainingist",
  "Meal Prep Planner",
  "Equipment List Generator",
  "Healthy Eating App",
  "Balanced Diet",
  "Mediterranean Diet",
  "Keto Workout Plan",
  "Low Carb Diet",
  "High Protein Diet",
  "Intermittent Fasting",
  "Vegan Workout Plan",
  "Vegetarian Workout Plan",
  "Diabetes Workout Plan",
  "Heart Healthy Diet",
  "Anti-Inflammatory Diet",
  "Muscle Gain Diet",
  "Cutting Diet",
  "Bulking Diet",
  "Metabolic Health",
  "Training Deficiency",
  "Food Sensitivity",
  "Dietary Guidelines",
  "Portion Control",
  "Mindful Eating",
  "Sustainable Weight Loss",
  "Training Education",
  "Smarty Training Score",
  "Smarty Metabolic Age",
  "Smarty Macro Index",
  "Smarty Training Intelligence",
  "Smarty Workout Plan",
  "Smarty Calorie Engine",
].join(", ");

const JSONLD_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SmartyWorkout",
      alternateName: ["Smarty Workout", "SmartyWorkout AI", "AI Training Intelligence Platform"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512x512.png`,
      description:
        "SmartyWorkout is the AI Training Intelligence Platform — a pocket coach, training consultant and diet coach powered by AI.",
      foundingDate: "2024",
      email: "smartyworkout@outlook.com",
      knowsAbout: [
        "Training",
        "Dietetics",
        "Workout Planning",
        "Macronutrients",
        "Micronutrients",
        "Weight Management",
        "Metabolic Health",
        "Precision Training",
        "AI Training Analysis",
        "Digital Coach",
        "Personalized Training",
        "Calorie Balance",
        "Intermittent Fasting",
        "Mediterranean Diet",
        "Ketogenic Diet",
        "Habit Coaching",
      ],
      sameAs: [
        "https://smartymove.com",
        "https://smartygym.com",
        "https://smartywellness.com",
        "https://www.instagram.com/smartyworkout",
        "https://www.tiktok.com/@smarty.diet",
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
        target: `${SITE_URL}/glossary?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "SmartyWorkout — AI Training Intelligence Platform",
      applicationCategory: ["HealthApplication", "LifestyleApplication", "FoodEstablishment"],
      applicationSubCategory: "AI Training Intelligence Platform",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
      featureList: [
        "AI Workout Planner",
        "Smarty Training Score™",
        "Smarty Metabolic Age™",
        "Smarty Macro Index™",
        "Personalized workout plans",
        "Calorie calculator",
        "BMI calculator",
        "BMR calculator",
        "TDEE calculator",
        "Macro calculator",
        "USDA food & calorie counter",
        "Equipment list generator",
        "Food log",
        "Habit coaching",
      ],
      keywords: KEYWORDS,
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "SmartyWorkout — AI Training Intelligence Platform | Your Pocket Coach & Diet Coach",
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
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#1c1c1c" },
      { name: "color-scheme", content: "dark" },

      { property: "og:site_name", content: "SmartyWorkout" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content:
          "SmartyWorkout — AI Training Intelligence Platform | Your Pocket Coach & Diet Coach",
      },
      { property: "og:description", content: SITE_DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@smartyworkout" },
      {
        name: "twitter:title",
        content:
          "SmartyWorkout — AI Training Intelligence Platform | Your Pocket Coach & Diet Coach",
      },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
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
        src: "https://www.googletagmanager.com/gtag/js?id=G-SLZPVQKPZT",
      },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-SLZPVQKPZT');",
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
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head>
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <Navigation />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster />
        <SisterAppsPopup />
      </div>
    </QueryClientProvider>
  );
}
