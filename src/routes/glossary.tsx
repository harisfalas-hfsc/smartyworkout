import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TRAINING_CATEGORIES } from "@/lib/training-categories";

const URL = "https://smartyworkout.com/glossary";
const TITLE =
  "Training Glossary & Workout Categories Explained — Strength, Cardio, Metabolic, Pilates | SmartyWorkout";
const DESCRIPTION =
  "Every SmartyWorkout training category explained — Strength, Muscle Building, Calorie Burning, Metabolic, Cardio, Mobility & Stability, Challenge, Pilates, Recovery, Micro Workout and Workout of the Day — plus plain-language definitions of 25+ fitness terms: what each workout type is, the formats it uses, who it suits and when to choose it.";
const KEYWORDS = [
  "workout categories",
  "types of workouts",
  "strength training workout",
  "muscle building workout",
  "calorie burning workout",
  "metabolic conditioning",
  "AMRAP workout",
  "EMOM workout",
  "Tabata workout",
  "circuit training",
  "cardio workout",
  "mobility and stability training",
  "pilates workout",
  "recovery workout",
  "micro workout",
  "workout of the day",
  "WOD",
  "reps and sets",
  "fitness glossary",
  "training terms defined",
  "personalized workout categories",
].join(", ");

const TERMS: { term: string; def: string }[] = [
  {
    term: "Smarty Metabolic Age™",
    def: "An estimate of the age a user's metabolism is behaving like, derived from BMR, body composition, activity, and dietary patterns.",
  },
  {
    term: "Smarty Macro Index™",
    def: "How closely a user's actual protein, carb and fat intake matches the optimal split for their body and goal.",
  },
  {
    term: "BMI (Body Mass Index)",
    def: "Weight in kilograms divided by height in meters squared. A population-level screening metric, not a diagnosis.",
  },
  {
    term: "BMR (Basal Metabolic Rate)",
    def: "Calories the body burns at complete rest to keep vital functions running. SmartyWorkout uses the Mifflin-St Jeor equation.",
  },
  {
    term: "TDEE (Total Daily Energy Expenditure)",
    def: "BMR multiplied by an activity factor — total calories burned per day including movement and exercise.",
  },
  {
    term: "Macronutrients",
    def: "Protein, carbohydrates and fats — the energy-providing nutrients measured in grams and calories.",
  },
  {
    term: "Micronutrients",
    def: "Vitamins and minerals required in small amounts for enzyme function, immunity, bone health and energy metabolism.",
  },
  {
    term: "Calorie Deficit",
    def: "Eating fewer calories than TDEE. Sustained deficit is the physiological driver of fat loss.",
  },
  {
    term: "Calorie Surplus",
    def: "Eating more calories than TDEE. Required alongside resistance training for meaningful muscle gain.",
  },
  {
    term: "Maintenance Calories",
    def: "Calorie intake equal to TDEE, holding body weight stable over time.",
  },
  {
    term: "Glycemic Index",
    def: "A ranking of carbohydrate foods by how quickly they raise blood glucose relative to pure glucose.",
  },
  {
    term: "Protein Timing",
    def: "Distributing protein across the day (typically 3–5 meals of 20–40 g) to maximize muscle protein synthesis.",
  },
  {
    term: "Meal Frequency",
    def: "The number of eating occasions per day. Total intake matters most; frequency is a preference and adherence lever.",
  },
  {
    term: "Intermittent Fasting",
    def: "Time-restricted eating patterns such as 16:8 or 5:2 that compress daily calorie intake into a shorter window.",
  },
  {
    term: "Mediterranean Diet",
    def: "An eating pattern rich in vegetables, legumes, whole grains, olive oil, fish and moderate dairy, with limited red meat.",
  },
  {
    term: "Ketogenic Diet",
    def: "A very-low-carb, high-fat pattern that shifts primary fuel from glucose to ketone bodies.",
  },
  {
    term: "Nutrient Density",
    def: "The amount of beneficial nutrients per calorie of food. Vegetables, fish and legumes are examples of high nutrient density.",
  },
  {
    term: "Whole Foods",
    def: "Foods eaten close to their natural state, with minimal industrial processing.",
  },
  {
    term: "Ultra-Processed Foods",
    def: "Industrial formulations combining refined ingredients and additives — typically high in calories and low in nutrient density.",
  },
  {
    term: "Fiber",
    def: "Indigestible plant carbohydrate that supports satiety, glucose control and gut microbiome health.",
  },
  {
    term: "Hydration",
    def: "Adequate daily fluid intake to support circulation, temperature regulation and cognitive function.",
  },
  {
    term: "Portion Control",
    def: "Managing serving sizes so total intake matches calorie targets without needing to eliminate food groups.",
  },
  {
    term: "Mindful Eating",
    def: "Eating with attention to hunger, fullness and food quality, reducing distraction-driven overconsumption.",
  },
  {
    term: "Metabolic Flexibility",
    def: "The body's ability to switch between using fats and carbohydrates as fuel based on availability and demand.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "DefinedTermSet",
      "@id": `${URL}#terms`,
      name: "SmartyWorkout Training Glossary",
      hasDefinedTerm: TERMS.map((t) => ({
        "@type": "DefinedTerm",
        name: t.term,
        description: t.def,
        inDefinedTermSet: `${URL}#terms`,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "Glossary", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: GlossaryPage,
});

function GlossaryPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 pb-16 sm:py-16">
      <PageHeader
        eyebrow="Glossary"
        title="Training Glossary"
        subtitle="Every metric, training pattern and concept SmartyWorkout uses, defined in plain language."
      />

      <section aria-labelledby="training-categories" className="mt-8">
        <h2 id="training-categories" className="text-xs font-semibold uppercase tracking-wider text-primary">
          Smarty Workout Training Categories
        </h2>
        <Accordion type="single" collapsible className="mt-3 rounded-2xl border-2 border-primary px-4">
          {TRAINING_CATEGORIES.map((cat) => (
            <AccordionItem key={cat.id} value={cat.id}>
              <AccordionTrigger className="text-left text-sm font-bold">{cat.name}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{cat.brief}</p>
                {cat.topicSlug && (
                  <Link
                    to="/training/$slug"
                    params={{ slug: cat.topicSlug }}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Read more
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 text-[13px] text-muted-foreground">
          <Link to="/training" className="font-semibold text-primary hover:underline">
            Explore the training hub
          </Link>
        </p>
      </section>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-primary">Terms</h2>
      <dl className="mt-3 divide-y divide-border">
        {TERMS.map((t) => (
          <div key={t.term} className="py-4">
            <dt className="text-lg font-semibold text-foreground">{t.term}</dt>
            <dd className="mt-1 text-muted-foreground">{t.def}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
