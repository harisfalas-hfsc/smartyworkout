import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SmartyCard } from "@/components/SmartyCard";
import { TRAINING_TOPICS } from "@/lib/seo/training-topics";

const SITE = "https://smartyworkout.com";
const URL = `${SITE}/training`;

const TITLE = "Online Fitness and Personalized Training — SmartyWorkout Training Hub";
const DESCRIPTION =
  "Explore how SmartyWorkout trains you online: personalized workouts, strength, cardio, metabolic conditioning, mobility, bodyweight and home training, plus daily workout programs.";

export const Route = createFileRoute("/training/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${URL}#webpage`,
              url: URL,
              name: TITLE,
              description: DESCRIPTION,
              inLanguage: "en",
              isPartOf: { "@id": `${SITE}/#website` },
              publisher: { "@id": `${SITE}/#organization` },
              hasPart: TRAINING_TOPICS.map((t) => ({
                "@type": "WebPage",
                url: `${SITE}/training/${t.slug}`,
                name: t.h1,
                description: t.metaDescription,
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: "Training", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: TrainingHub,
});

function TrainingHub() {
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
          <li className="text-foreground">Training</li>
        </ol>
      </nav>

      <PageHeader
        eyebrow="Training"
        title={
          <>
            Online fitness,
            <br />
            <span className="text-primary">personalized training</span>
          </>
        }
        subtitle="SmartyWorkout builds a complete workout from your training profile — your goals, experience, equipment, time and limitations. These pages explain each type of training and where to start."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {TRAINING_TOPICS.map((topic) => (
          <SmartyCard
            key={topic.slug}
            eyebrow={topic.eyebrow}
            title={topic.h1}
            description={topic.metaDescription}
          >
            <Link
              to="/training/$slug"
              params={{ slug: topic.slug }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Read about {topic.h1.toLowerCase()}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </SmartyCard>
        ))}
      </div>
    </div>
  );
}
