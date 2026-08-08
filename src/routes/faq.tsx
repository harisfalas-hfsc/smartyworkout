import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { SmartyCard } from "@/components/SmartyCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const URL = "https://smartyworkout.com/faq";
const TITLE = "SmartyWorkout FAQ — plans, pricing, privacy & accuracy";
const DESCRIPTION =
  "Answers to common questions about SmartyWorkout: what you get in a plan, how the AI workout planner works, pricing, privacy, allergies and accuracy.";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "What is SmartyWorkout?",
    a: "SmartyWorkout is a personalized AI workout planner. It turns a smart questionnaire into a fully personalized workout plan with calories, macros, portions and a weekly equipment list, plus free tools like BMR, TDEE, macro and calorie calculators.",
  },

  {
    q: "What do I get with a SmartyWorkout plan?",
    a: "You get a full 1, 2 or 4-week personalized workout plan with daily meals, portions, calorie and macro totals, a weekly equipment list sorted by category, and a short rationale explaining why the plan fits your goal. You can export it as a PDF and download a printable equipment list.",
  },
  {
    q: "How is SmartyWorkout different from generic calorie trackers?",
    a: "A calorie tracker gives you a number. SmartyWorkout gives you a plan. It assesses your body, goals, allergies, food preferences and schedule, then generates a personalized workout plan with portions and a equipment list — no manual logging required.",
  },
  {
    q: "How is SmartyWorkout different from a human coach?",
    a: "A human coach can diagnose and treat medical conditions; SmartyWorkout cannot. What SmartyWorkout does do is package the assessment, calculation and planning work of a coach into an always-available AI, at a one-time price of €9.99 instead of a per-session fee.",
  },
  {
    q: "How does the AI workout planner work?",
    a: "You answer a smart questionnaire (body, goals, activity, food preferences, allergies, schedule). SmartyWorkout computes your calorie and macro targets using the Mifflin-St Jeor equation, then the AI builds a workout plan that respects every constraint you entered. You get 2 refinements included.",
  },

  {
    q: "How accurate are the calorie, BMI, BMR and macro calculators?",
    a: "SmartyWorkout uses the Mifflin-St Jeor equation for BMR and standard activity multipliers for TDEE — the same methods used by coachs. Any equation is an estimate; biology varies. Treat the numbers as a strong starting point and adjust based on how you feel and respond.",
  },
  {
    q: "How often should I update my workout plan?",
    a: "Most users benefit from revisiting their plan every 4–8 weeks or after any meaningful change (new goal, new activity level, weight change of a few kilograms, or a new schedule).",
  },
  {
    q: "How much does it cost?",
    a: "€9.99 as a one-time payment. That includes your initial personalized plan and 2 refinement credits (3 AI generations in total). There is no subscription.",
  },
  {
    q: "Is SmartyWorkout medical advice?",
    a: "No. SmartyWorkout is a general wellness tool. It is not medical advice, and it is not a substitute for a doctor, certified coach or other qualified healthcare professional. If you have a medical condition, are pregnant/breastfeeding, or take medication that affects diet, consult a professional before starting any plan.",
  },
  {
    q: "What if I have allergies?",
    a: "Allergies are a required field and the AI is explicitly instructed to exclude every allergen you list. Please be thorough — the plan is only as safe as what you tell us.",
  },
  {
    q: "Can I get a refund?",
    a: "If the plan generation fails for a technical reason and we cannot deliver a plan, contact us for a full refund. Because plans are personalized digital content delivered immediately, refunds are otherwise not guaranteed.",
  },
  {
    q: "What do you do with my data?",
    a: "Your questionnaire and plan are stored in your SmartyWorkout account so you can access them anytime. We do not sell your data. See our Privacy Policy for full details.",
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
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "h2", "p"],
      },
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">FAQ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your <span className="text-primary">questions</span>, answered
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          The answers we get most often. Still unsure? Reach out via the footer.
        </p>
      </div>
      <SmartyCard
        tone="cyan"
        eyebrow="FAQ"
        eyebrowIcon="?"
        cornerIcon={CircleHelp}
        title="Frequently asked"
        accent="questions."
        description="Tap a question to open the answer."
      >
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
          {ITEMS.map((it, i) => (
            <AccordionItem
              key={it.q}
              value={`item-${i}`}
              className="border-sky-100 last:border-b-0"
            >
              <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                <span className="grid min-w-0 flex-1 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-4 pr-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-200 bg-sky-50 text-xs font-extrabold text-sky-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 text-base font-extrabold leading-6 text-foreground sm:text-lg">
                    {it.q}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pl-[3.25rem] pr-10 pt-0 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SmartyCard>
    </div>
  );
}

