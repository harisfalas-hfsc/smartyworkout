import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { markArticleRead } from "@/lib/blog-read";

import DOMPurify from "dompurify";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://smartyworkout.com";

function displayImageUrl(url: string): string {
  return url.startsWith(`${SITE}/api/public/blog-cover/`)
    ? url.slice(SITE.length)
    : url;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  image_url: string | null;
  read_time: string | null;
  author_name: string | null;
  author_credentials: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

async function loadArticle(slug: string): Promise<Article> {
  const { data, error } = await supabase
    .from("blog_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFound();
  return data as Article;
}

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => loadArticle(params.slug),
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Article unavailable | SmartyWorkout Blog" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const a = loaderData;
    const url = `${SITE}/blog/${a.slug}`;
    const title = `${a.title} | SmartyWorkout Blog`;
    const description = a.excerpt ?? a.title;
    const published = new Date(a.published_at ?? a.created_at).toISOString();
    const modified = new Date(a.updated_at ?? a.created_at).toISOString();
    const image = a.image_url && a.image_url.startsWith("https://") ? a.image_url : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: a.title },
        { property: "og:description", content: description },
        { property: "og:site_name", content: "SmartyWorkout" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: a.title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
        { property: "article:published_time", content: published },
        { property: "article:modified_time", content: modified },
        { property: "article:section", content: a.category },
        { property: "article:author", content: a.author_name ?? "Haris Falas" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Article",
                headline: a.title,
                description,
                datePublished: published,
                dateModified: modified,
                articleSection: a.category,
                mainEntityOfPage: url,
                url,
                ...(image ? { image } : {}),
                author: {
                  "@type": "Person",
                  name: a.author_name ?? "Haris Falas",
                  jobTitle: "Sports Scientist, CSCS Certified",
                  url: `${SITE}/haris-falas`,
                },
                publisher: {
                  "@type": "Organization",
                  name: "SmartyWorkout",
                  url: SITE,
                  logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
                },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                  { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: a.title,
                    item: `${SITE}/blog/${params.slug}`,
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: ArticleMissing,
  component: ArticleDetail,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ArticleMissing() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <Card className="border-2 border-primary p-10 text-center">
        <h1 className="mb-3 text-2xl font-bold">Article not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This article does not exist or is no longer published.
        </p>
        <Link to="/blog" className="text-sm font-semibold text-primary hover:underline">
          Back to the blog
        </Link>
      </Card>
    </div>
  );
}

function ArticleDetail() {
  const article = Route.useLoaderData();
  const safeHtml = useMemo(() => {
    if (typeof window === "undefined") return article.content;
    return DOMPurify.sanitize(article.content, { ADD_ATTR: ["target", "rel"] });
  }, [article.content]);

  useEffect(() => {
    markArticleRead(article.slug, true);
  }, [article.slug]);

  const dateISO = article.published_at ?? article.created_at;


  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/blog" className="hover:text-primary">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{article.category}</li>
        </ol>
      </nav>

      <article>
        <Card className="border-2 border-primary p-4 md:p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[1.35fr_0.9fr] md:items-start md:gap-6">
            <div className="flex flex-col">
              <Badge variant="secondary" className="mb-3 w-fit">
                {article.category}
              </Badge>
              <h1 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
                {article.title}
              </h1>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {article.read_time ?? "5 min read"}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={new Date(dateISO).toISOString()}>{formatDate(dateISO)}</time>
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-accent/10 p-3">
                <span className="text-sm text-muted-foreground">By:</span>
                <div>
                  <Link
                    to="/haris-falas"
                    className="inline-block whitespace-nowrap font-semibold text-primary hover:underline"
                  >
                    {article.author_name ?? "Haris Falas"}
                  </Link>
                  {article.author_credentials && (
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {article.author_credentials.split("\n").map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {article.image_url && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg shadow-lg md:h-full md:min-h-0">
                <img
                  src={displayImageUrl(article.image_url)}
                  alt={article.title}
                  width={1280}
                  height={720}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <div
            className="max-w-none text-[15px] leading-7 text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:sm:text-2xl [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-1.5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_strong]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

        </Card>
      </article>
    </div>
  );
}
