import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SmartyCard } from "@/components/SmartyCard";
import { TOPIC_BY_SLUG } from "@/lib/seo/training-topics";

const SITE = "https://smartyworkout.com";

export const Route = createFileRoute("/training/$slug")({
  loader: ({ params }) => {
    const topic = TOPIC_BY_SLUG[params.slug];
    if (!topic) throw notFound();
    return topic;
  },
  head: ({ params, loaderData }) => {
    const topic = loaderData ?? TOPIC_BY_SLUG[params.slug];
    if (!topic) return {};
    const url = `${SITE}/training/${topic.slug}`;
    return {
      meta: [
        { title: topic.title },
        { name: "description", content: topic.metaDescription },
        { property: "og:title", content: topic.title },
        { property: "og:description", content: topic.metaDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": `${url}#webpage`,
                url,
                name: topic.title,
                description: topic.metaDescription,
                inLanguage: "en",
                isPartOf: { "@id": `${SITE}/#website` },
                about: { "@id": `${SITE}/#software` },
                publisher: { "@id": `${SITE}/#organization` },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                  { "@type": "ListItem", position: 2, name: "Training", item: `${SITE}/training` },
                  { "@type": "ListItem", position: 3, name: topic.h1, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: TopicPage,
});

function TopicPage() {
  const topic = Route.useLoaderData();

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
          <li>
            <Link to="/training" className="hover:text-primary">
              Training
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{topic.h1}</li>
        </ol>
      </nav>

      <PageHeader eyebrow={topic.eyebrow} title={topic.h1} subtitle={topic.intro} />

      <div className="flex flex-col gap-6">
        {topic.sections.map((section) => (
          <SmartyCard key={section.heading} title={section.heading} description={section.body}>
            {section.bullets && (
              <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground sm:text-base">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden="true" className="text-primary">
                      •
                    </span>
                    <span className="min-w-0">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </SmartyCard>
        ))}

        <SmartyCard title="Common questions">
          <div className="flex flex-col gap-5">
            {topic.faq.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-bold text-foreground sm:text-base">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </SmartyCard>

        <SmartyCard title="Start training">
          <ul className="flex flex-col gap-2.5">
            {topic.appLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to as never}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline sm:text-base"
                >
                  {l.label}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </SmartyCard>

        <SmartyCard title="Related training topics">
          <ul className="flex flex-col gap-2.5">
            {topic.related.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to as never}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline sm:text-base"
                >
                  {l.label}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </SmartyCard>
      </div>
    </div>
  );
}
