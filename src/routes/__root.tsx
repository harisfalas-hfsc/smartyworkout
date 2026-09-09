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
import { getFreeAccessMode } from "../lib/free-access.functions";
import { seedFreeAccessMode } from "../hooks/useFreeAccessMode";
import { getBrand } from "../lib/brand.functions";
import { BrandProvider, useBrand } from "../lib/brand-context";
import { BRANDS, type BrandConfig } from "../lib/brand";


function jsonLdGraph(brand: BrandConfig, freeAccessMode: boolean) {
  const siteUrl = brand.siteUrl;
  const ogImage = `${brand.siteUrl}${brand.ogImage}`;
  const offer = freeAccessMode
    ? {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: siteUrl,
      }
    : {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "EUR",
        category: "subscription",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/pricing`,
      };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: brand.name,
        alternateName: [brand.displayName, brand.shortName],
        url: siteUrl,
        logo: `${siteUrl}${brand.icon512}`,
        image: ogImage,
        description:
          brand.id === "smartygym"
            ? `${brand.name} is your online gym and personal coach, built on the coaching expertise of sports scientist Haris Falas.`
            : `${brand.name} creates personalized workouts through ${brand.coachName}, built on the coaching expertise of sports scientist Haris Falas.`,
        foundingDate: "2024",
        email: brand.systemEmail,
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
          "personalized workout generation",
          "Personalized fitness coaching",
        ],
        founder: {
          "@type": "Person",
          "@id": `${siteUrl}/haris-falas#person`,
          name: "Haris Falas",
          jobTitle: "Sports Scientist & Strength and Conditioning Coach",
          url: `${siteUrl}/haris-falas`,
          worksFor: { "@id": `${siteUrl}/#organization` },
          knowsAbout: [
            "Strength and conditioning",
            "Hypertrophy training",
            "Metabolic conditioning",
            "Mobility and stability training",
            "Bodyweight training",
            "Periodization",
            "Progressive overload",
            "Exercise selection and technique",
            "Warm-up and activation",
            "Injury-aware and rehabilitation-informed training",
            "Movement screening",
            "Football performance",
            "Athletic development",
            "Sports science",
          ],
          hasCredential: [
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "certification",
              name: "NSCA Certified Strength and Conditioning Specialist (CSCS)",
              recognizedBy: {
                "@type": "Organization",
                name: "National Strength and Conditioning Association",
              },
            },
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "certification",
              name: "EXOS Performance and Rehab Specialist",
              recognizedBy: { "@type": "Organization", name: "EXOS" },
            },
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "certification",
              name: "FMS Specialist",
              recognizedBy: {
                "@type": "Organization",
                name: "Functional Movement Systems",
              },
            },
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "certification",
              name: "ACE Medical Exercise Specialist",
              recognizedBy: {
                "@type": "Organization",
                name: "American Council on Exercise",
              },
            },
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "degree",
              name: "BSc Sport Science",
            },
          ],
          sameAs: [
            `${siteUrl}/haris-falas`,
            "https://www.instagram.com/smartyworkout",
            "https://smartygym.com",
            "https://smartymove.com",
            "https://smartydiet.com",
          ],
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
            email: brand.systemEmail,
            contactType: "customer support",
            availableLanguage: ["English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: brand.name,
        description: brand.metaDescription,
        inLanguage: "en",
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/exercise-library?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": `${siteUrl}/#software`,
        name: `${brand.name} — Personalized Workout Generator`,
        applicationCategory: "HealthApplication",
        applicationSubCategory: "Personalized workout generator and personal training coach",
        operatingSystem: "Web, iOS, Android",
        browserRequirements: "Requires a modern web browser with JavaScript enabled",
        url: siteUrl,
        image: ogImage,
        publisher: { "@id": `${siteUrl}/#organization` },
        description: brand.metaDescription,
        featureList: [
          "Personalized workout generator built on your training profile",
          "Workout of the Day in bodyweight and equipment variants",
          "Exercise library with 1,300+ demonstrated movements",
          "Equipment-aware exercise filtering",
          "Injury and limitation aware programming",
          "Beginner, intermediate and advanced difficulty ladder",
          "Interactive workout player with rest timers",
          "Training logbook and calendar scheduling",
          "Progress tracking and workout feedback loop",
          "Workout timer, rounds tracker and 1RM calculator",
        ],
        keywords: brand.keywords,
        offers: offer,
      },
    ],
  };
}

function NotFoundComponent() {
  const brand = useBrand();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
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
          This page didn&apos;t load
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
  loader: async () => {
    const [freeAccess, brand] = await Promise.all([
      getFreeAccessMode().catch(() => ({ freeAccessMode: false })),
      getBrand().catch(() => BRANDS.smartyworkout),
    ]);
    return { ...freeAccess, brand };
  },
  head: ({ loaderData }) => {

    const brand = loaderData?.brand;
    const freeAccessMode = Boolean(loaderData?.freeAccessMode);
    const siteUrl = brand?.siteUrl ?? "https://smartyworkout.com";
    const ogImage = brand ? `${brand.siteUrl}${brand.ogImage}` : "https://smartyworkout.com/og-social.jpg";
    const title = `${brand?.name ?? "SmartyWorkout"} — Personalized Workouts with ${brand?.coachName ?? "Smarty Coach"}`;
    const description = brand?.metaDescription ??
      "Personalized workouts built from your goals, experience, equipment and limitations, guided by Smarty Coach and sports scientist Haris Falas.";

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title },
        { name: "description", content: description },
        { name: "keywords", content: brand?.keywords ?? "" },
        { name: "author", content: brand?.name ?? "SmartyWorkout" },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1" },
        { name: "application-name", content: brand?.pwaName ?? "Smarty Workout" },
        { name: "apple-mobile-web-app-title", content: brand?.pwaName ?? "Smarty Workout" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "theme-color", content: "#000000" },
        { name: "color-scheme", content: "dark" },

        { property: "og:site_name", content: brand?.name ?? "SmartyWorkout" },
        { property: "og:locale", content: "en_US" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: brand?.twitterSite ?? "@smartyworkout" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { property: "og:url", content: `${siteUrl}/` },
        { property: "og:image", content: ogImage },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/x-icon", href: brand?.faviconIco ?? "/favicon.ico", sizes: "any" },
        { rel: "icon", type: "image/png", sizes: "64x64", href: brand?.faviconPng ?? "/favicon.png" },
        { rel: "icon", type: "image/png", sizes: "192x192", href: brand?.icon192 ?? "/icon-192.png" },
        { rel: "shortcut icon", href: brand?.faviconIco ?? "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: brand?.appleTouchIcon ?? "/apple-touch-icon.png" },
        { rel: "manifest", href: brand?.manifest ?? "/manifest.webmanifest" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLdGraph(brand ?? BRANDS.smartyworkout, freeAccessMode)),
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
    };
  },
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
  const { freeAccessMode, brand } = Route.useLoaderData();
  // Seed synchronously so every useFreeAccessMode() consumer renders the right
  // copy on the very first paint (SSR and hydration) — no paid-copy flash.
  seedFreeAccessMode(freeAccessMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandProvider brand={brand}>
          <div className="flex min-h-screen flex-col bg-background">
            <Navigation />
            <main>
              <Outlet />
            </main>
            <SiteFooter />
            <Toaster />
            <SisterAppsPopup />
            <BottomNav />
          </div>
        </BrandProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
