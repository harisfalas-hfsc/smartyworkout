import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Dumbbell, PenLine } from "lucide-react";
import heroTraining from "@/assets/hero-training.jpg";
import { PageHeader } from "@/components/PageHeader";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "SmartyWorkout — Your personal workout, anytime, anywhere",
      },
      {
        name: "description",
        content:
          "Answer a smart questionnaire and get a full tailor-made workout built around your body, goals, equipment and constraints.",
      },
      {
        property: "og:title",
        content: "SmartyWorkout — Your personal workout, anytime, anywhere",
      },
      {
        property: "og:description",
        content:
          "Personalized AI workouts built around your body, goals and equipment. Two workouts every day with Smarty Coach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/" },
      {
        property: "og:image",
        content: "https://smartyworkout.com/og-social.jpg",
      },
      {
        name: "twitter:image",
        content: "https://smartyworkout.com/og-social.jpg",
      },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": "https://smartyworkout.com/#webpage",
          url: "https://smartyworkout.com/",
          name: "SmartyWorkout — Your personal workout, anytime, anywhere",
          description:
            "Answer a smart questionnaire and get a full tailor-made workout built around your body, goals, equipment and constraints.",
          inLanguage: "en",
          isPartOf: { "@id": "https://smartyworkout.com/#website" },
          about: { "@id": "https://smartyworkout.com/#software" },
          primaryImageOfPage: "https://smartyworkout.com/og-social.jpg",
        }),
      },
    ],
  }),

  component: Home,
});

function Home() {
  const { freeAccessMode } = useFreeAccessMode();
  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-4 pt-0 sm:pb-6">
      {/* MOBILE — consistent with every other page: centered header + CTAs */}
      <section className="py-6 sm:hidden">
        <PageHeader
          title={
            <>
              Your personal workout
              <br />
              <span className="text-primary">anytime anywhere</span>
            </>
          }
          subtitle="Answer a smart questionnaire. Get a full tailor-made workout built around your body, goals, equipment and constraints."
        />
        <div className="mx-auto flex max-w-xs flex-col gap-3">
          <Link
            to="/coach"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
          >
            <Dumbbell className="h-4 w-4 shrink-0" />
            Create your workout
          </Link>
          <Link
            to="/wod"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-primary text-[15px] font-extrabold text-primary"
          >
            <CalendarCheck className="h-4 w-4 shrink-0" />
            Follow Workout of the Day
          </Link>
          {!freeAccessMode && (
            <Link
              to="/pricing"
              className="flex h-12 w-full items-center justify-center rounded-full border-2 border-primary text-[15px] font-extrabold text-primary"
            >
              See pricing
            </Link>
          )}
        </div>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {freeAccessMode
            ? "Two personalized workouts every day."
            : "One membership. Two personalized workouts every day."}
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            to="/founder-note"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-[13px] font-bold text-primary"
          >
            <PenLine className="h-4 w-4" />
            A note from the founder
          </Link>
        </div>
      </section>


      {/* FULL-BLEED HERO — desktop/tablet */}
      <section className="relative left-1/2 mb-4 hidden w-screen -translate-x-1/2 overflow-hidden sm:mb-6 sm:block">
        <img
          src={heroTraining}
          alt="Athlete training with dumbbells during a personalized workout session"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.18_0_0)] via-[oklch(0.18_0_0)]/25 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-12 lg:px-6 lg:py-20">

          <div className="max-w-xl lg:max-w-3xl">
            <p className="text-[34px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[60px]">
              Your personal workout
              <br />
              <span className="whitespace-nowrap text-primary">anytime anywhere</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-white/80 lg:mt-6 lg:text-lg">
              Answer a smart questionnaire. Get a full tailor-made workout built
              around your body, goals, equipment and constraints.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 lg:flex-nowrap">
              <Link
                to="/coach"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-base font-bold text-primary-foreground hover:opacity-95 lg:px-8"
              >
                <Dumbbell className="h-4 w-4 shrink-0" />
                Create your workout
              </Link>
              <Link
                to="/wod"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border-2 border-primary px-6 text-base font-bold text-primary hover:bg-primary/10 lg:px-8"
              >
                <CalendarCheck className="h-4 w-4 shrink-0" />
                Follow Workout of the Day
              </Link>
              {!freeAccessMode && (
                <Link
                  to="/pricing"
                  className="inline-flex h-12 items-center whitespace-nowrap rounded-full border-2 border-primary px-6 text-base font-bold text-primary hover:bg-primary/10 lg:px-8"
                >
                  See pricing
                </Link>
              )}
            </div>
            <p className="mt-4 text-sm text-white/60">
              {freeAccessMode
                ? "Two personalized workouts every day."
                : "One membership. Two personalized workouts every day."}
            </p>
            <Link
              to="/founder-note"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary underline underline-offset-4"
            >
              <PenLine className="h-4 w-4" />
              A note from the founder
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

