import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { SmartyCard } from "@/components/SmartyCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/PageHeader";

const URL = "https://smartyworkout.com/faq";
const TITLE = "SmartyWorkout FAQ — Smarty Coach, workouts & subscription";
const DESCRIPTION =
  "Short answers about SmartyWorkout: how Smarty Coach builds your workout, what the €9.99/month subscription includes, equipment, injuries and privacy.";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "What is SmartyWorkout?",
    a: "An AI training app. Smarty Coach builds a personalized workout for you, today — based on your goal, mood, time, location and equipment.",
  },
  {
    q: "How does Smarty Coach build my workout?",
    a: "You answer five quick questions. Smarty Coach reads your profile, fitness level and training history, then builds the session from our exercise library.",
  },
  {
    q: "What does it cost?",
    a: "€9.99 per month. No contract — cancel anytime.",
  },
  {
    q: "What's included in the subscription?",
    a: "Up to 2 workouts per day, the full exercise library, all training tools, your logbook, progress tracking and every previous workout you've created.",
  },
  {
    q: "What is the Workout of the Day?",
    a: "Two workouts built for you every day — one bodyweight, one with your equipment — following a balanced periodization plan. Smarty Coach picks the category and difficulty; your profile decides the exercises, location and limitations.",
  },
  {
    q: "Why should I follow the Workout of the Day?",
    a: "Because the hard part of training is knowing what to do today. Periodization mixes strength, cardio, metabolic, mobility and recovery in the right order, so you progress without overtraining or undertraining.",
  },
  {
    q: "How is it different from choosing a workout myself?",
    a: "Choosing manually is random: you repeat what you like and skip what you need. The Workout of the Day is a plan — like a personal trainer deciding for you — ready in your account before you wake up. While subscribed you don't generate your own workouts; your two are already made. Unsubscribe anytime and go back to creating them yourself.",
  },
  {
    q: "Do I need equipment?",
    a: "No. Tell Smarty Coach what you have — nothing, dumbbells, bands or a full gym — and the session is built around it.",
  },
  {
    q: "Can I train at home, outdoors or in a hotel?",
    a: "Yes. Location is one of your answers and it changes the exercises you get.",
  },
  {
    q: "What about injuries or limitations?",
    a: "Add them to your training profile. Smarty Coach filters those exercises out of every session.",
  },
  {
    q: "Does it get better over time?",
    a: "Yes. Rate a workout and Smarty Coach uses that feedback plus your history to sharpen the next one.",
  },
  {
    q: "Can I see my past workouts?",
    a: "Yes — every workout is saved to your logbook and can be repeated or exported as a PDF.",
  },
  {
    q: "Is this medical advice?",
    a: "No. SmartyWorkout is a general fitness tool. Consult a professional if you have a medical condition.",
  },
  {
    q: "What happens to my data?",
    a: "It stays in your account to personalize your training. We never sell it. See the Privacy Policy.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "@id": `${URL}#faq`,
      mainEntity: ITEMS.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "FAQ", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: FAQ,
});

function FAQ() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="FAQ"
        title={
          <>
            Your <span className="text-primary">questions</span>, answered
          </>
        }
      />

      <SmartyCard
        tone="cyan"
        eyebrow="FAQ"
        eyebrowIcon="?"
        title="Frequently asked"
        accent="questions."
      >
        <Accordion type="single" collapsible className="w-full">
          {ITEMS.map((it, i) => (
            <AccordionItem key={it.q} value={`item-${i}`} className="border-blue-200 dark:border-blue-500/40 last:border-b-0">
              <AccordionTrigger className="py-3 text-left text-sm font-semibold leading-5 hover:no-underline sm:text-base">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="pb-3 pr-6 pt-0 text-sm leading-6 text-muted-foreground">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SmartyCard>
    </div>
  );
}
