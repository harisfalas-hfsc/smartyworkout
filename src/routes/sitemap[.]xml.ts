import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { TRAINING_TOPIC_SLUGS } from "@/lib/seo/training-topics";


const BASE_URL = "https://smartyworkout.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

const ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/haris-falas", changefreq: "monthly", priority: "0.7" },

  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/exercise-library", changefreq: "weekly", priority: "0.85" },
  { path: "/wod", changefreq: "daily", priority: "0.85" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/glossary", changefreq: "monthly", priority: "0.75" },

  { path: "/training", changefreq: "monthly", priority: "0.85" },
  ...TRAINING_TOPIC_SLUGS.map((slug) => ({
    path: `/training/${slug}`,
    changefreq: "monthly" as const,
    priority: "0.8",
  })),



  { path: "/blog", changefreq: "weekly", priority: "0.85" },
  { path: "/tools", changefreq: "monthly", priority: "0.8" },

  { path: "/tools/workout-timer", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/rounds-tracker", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/1rm-calculator", changefreq: "monthly", priority: "0.8" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { isFreeAccessMode } = await import("@/lib/free-access.server");
        const freeAccessMode = await isFreeAccessMode();
        const base = freeAccessMode
          ? ENTRIES.filter((e) => e.path !== "/pricing")
          : ENTRIES;

        let articles: SitemapEntry[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await (supabaseAdmin as any)
            .from("blog_articles")
            .select("slug,published_at,updated_at,created_at")
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .limit(1000);
          articles = ((data as any[]) ?? []).map((a) => ({
            path: `/blog/${a.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
            lastmod: new Date(a.updated_at ?? a.published_at ?? a.created_at)
              .toISOString()
              .slice(0, 10),
          }));
        } catch {
          articles = [];
        }

        const entries = [...base, ...articles];
        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
