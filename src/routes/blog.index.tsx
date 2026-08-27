import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Calendar, Check, Clock, Newspaper, X } from "lucide-react";
import { useBlogReadState } from "@/lib/blog-read";


import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://smartyworkout.com";
const URL = `${SITE}/blog`;

function displayImageUrl(url: string): string {
  return url.startsWith(`${SITE}/api/public/blog-cover/`)
    ? url.slice(SITE.length)
    : url;
}

const TITLE = "Fitness Blog — Evidence-Based Training Articles | SmartyWorkout";
const DESCRIPTION =
  "Practical, evidence-based fitness articles from Haris Falas, Sports Scientist and CSCS: strength, conditioning, mobility, recovery and smarter training at home or in the gym.";

export interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  read_time: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

export type BlogSort = "newest" | "oldest";
export type BlogReadFilter = "all" | "unread" | "read";

const searchSchema = z.object({
  sort: z.enum(["newest", "oldest"]).optional(),
  status: z.enum(["all", "unread", "read"]).optional(),
});


export async function fetchPublishedArticles(): Promise<BlogListItem[]> {
  const { data, error } = await supabase
    .from("blog_articles")
    .select("id,title,slug,excerpt,image_url,read_time,category,published_at,created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as BlogListItem[] | null) ?? [];
}

export const Route = createFileRoute("/blog/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: `${SITE}/og-social.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE}/og-social.jpg` },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${URL}#blog`,
          url: URL,
          name: "SmartyWorkout Fitness Blog",
          description: DESCRIPTION,
          inLanguage: "en",
          publisher: { "@type": "Organization", name: "SmartyWorkout", url: SITE },
        }),
      },
    ],
  }),
  component: BlogIndex,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function BlogIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/blog/" });
  const { isRead, toggleRead } = useBlogReadState();
  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-articles"],
    queryFn: fetchPublishedArticles,
  });

  const sort = search.sort ?? "newest";
  const status = search.status ?? "all";

  const filtered = useMemo(() => {
    let list = [...(articles ?? [])];
    if (status === "unread") list = list.filter((a) => !isRead(a.slug));
    if (status === "read") list = list.filter((a) => isRead(a.slug));
    list.sort((a, b) => {
      const ta = new Date(a.published_at ?? a.created_at).getTime();
      const tb = new Date(b.published_at ?? b.created_at).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [articles, status, sort, isRead]);

  const filtersActive = sort !== "newest" || status !== "all";

  function update(patch: { sort?: BlogSort; status?: BlogReadFilter }) {
    void navigate({
      to: "/blog",
      search: (prev) => ({ ...prev, ...patch }),
    });
  }

  function resetFilters() {
    void navigate({
      to: "/blog",
      search: {},
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Blog</li>
        </ol>
      </nav>

      <PageHeader
        eyebrow="Blog"
        icon={Newspaper}
        title="Fitness Articles"
        subtitle={
          <>
            <span>Evidence-based training articles by</span>
            <br className="hidden sm:block" />
            <Link
              to="/haris-falas"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Haris Falas
            </Link>
            <span>, Sports Scientist, CSCS certified</span>
          </>
        }
      />

      <p className="mb-8 text-center text-sm font-semibold text-primary">
        Currently {articles?.length ?? 0} article{articles?.length === 1 ? "" : "s"}
      </p>


      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Sort:</span>
          <Select value={sort} onValueChange={(v) => update({ sort: v as BlogSort })}>
            <SelectTrigger
              aria-label="Sort articles"
              className="h-10 w-[150px] rounded-xl border-2 border-primary text-sm font-semibold"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Show:</span>
          <Select
            value={status}
            onValueChange={(v) =>
              update({ status: v === "all" ? undefined : (v as BlogReadFilter) })
            }
          >
            <SelectTrigger
              aria-label="Filter by read status"
              className="h-10 w-[150px] rounded-xl border-2 border-primary text-sm font-semibold"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All articles</SelectItem>
              <SelectItem value="unread">Unread only</SelectItem>
              <SelectItem value="read">Read only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-primary px-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <X className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>


      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="overflow-hidden border-2 border-primary">
              <div className="aspect-video animate-pulse bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-2 border-primary p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {articles && articles.length > 0
              ? "No articles match the selected filter."
              : "No articles published yet. Check back soon."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((article) => {
          const read = isRead(article.slug);
          return (
            <Card
              key={article.id}
              className="flex h-full flex-col overflow-hidden border-2 border-primary transition-all duration-300 hover:shadow-lg md:hover:scale-[1.02]"
            >
              <Link
                to="/blog/$slug"
                params={{ slug: article.slug }}
                className="block flex-1 focus:outline-none"
              >
                {article.image_url && (
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={displayImageUrl(article.image_url)}
                      alt={`${article.title} — SmartyWorkout fitness blog`}
                      width={1280}
                      height={720}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    {read && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        <Check className="h-3 w-3" />
                        Read
                      </span>
                    )}
                  </div>
                )}

                <div className="p-5">
                  <h2 className="mb-2 line-clamp-2 text-xl font-bold">{article.title}</h2>
                  {article.excerpt && (
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.read_time ?? "5 min read"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.published_at ?? article.created_at)}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => toggleRead(article.slug)}
                aria-pressed={read}
                className="mt-auto border-t-2 border-primary px-5 py-3 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {read ? "Mark as unread" : "Mark as read"}
              </button>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
