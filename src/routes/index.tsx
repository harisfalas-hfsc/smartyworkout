import { createFileRoute, Link } from "@tanstack/react-router";
import heroTraining from "@/assets/hero-training.jpg";
import { PageHeader } from "@/components/PageHeader";

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
        content:
          "https://smartyworkout.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
      {
        name: "twitter:image",
        content:
          "https://smartyworkout.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-8 pt-0 sm:pb-12">
      {/* MOBILE — consistent with every other page: centered header + CTAs */}
      <section className="py-8 sm:hidden">
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
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
          >
            Create your workout
          </Link>
          <Link
            to="/pricing"
            className="flex h-12 w-full items-center justify-center rounded-full border-2 border-primary text-[15px] font-extrabold text-primary"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          One membership. Two personalized workouts every day.
        </p>
      </section>


      {/* FULL-BLEED HERO — desktop/tablet */}
      <section className="relative left-1/2 mb-8 hidden w-screen -translate-x-1/2 overflow-hidden sm:mb-14 sm:block">
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
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 lg:px-6 lg:py-36">
          <div className="max-w-xl lg:max-w-3xl">
            <h1 className="text-[34px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[60px]">
              Your personal workout
              <br />
              <span className="whitespace-nowrap text-primary">anytime anywhere</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/80 lg:mt-6 lg:text-lg">
              Answer a smart questionnaire. Get a full tailor-made workout built
              around your body, goals, equipment and constraints.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/coach"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground hover:opacity-95"
              >
                Create your workout
              </Link>
              <Link
                to="/pricing"
                className="inline-flex h-12 items-center rounded-full border-2 border-primary px-8 text-base font-bold text-primary hover:bg-primary/10"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/60">
              One membership. Two personalized workouts every day.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
