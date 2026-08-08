import { createFileRoute } from "@tanstack/react-router";

const URL = "https://smartyworkout.com/training-science";
const TITLE = "The Diet Science — Evidence, Macros, Myths & Evolution of Eating";
const DESCRIPTION =
  "A comprehensive, science-based look at diet: how popular schedules work, the role of protein, carbs and fats, the evolution of human training, and the myths that refuse to die.";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${URL}#article`,
      headline: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      url: URL,
      author: { "@type": "Organization", name: "SmartyWorkout" },
      publisher: { "@type": "Organization", name: "SmartyWorkout" },
      isPartOf: { "@id": "https://smartyworkout.com/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "The Diet Science", item: URL },
      ],
    },
  ],
};

type DietSchedule = {
  emoji: string;
  name: string;
  how: string;
  best: string;
  watch: string;
};

const SCHEDULES: DietSchedule[] = [
  {
    emoji: "🕰️",
    name: "Intermittent Fasting (16:8)",
    how: "Eating window compressed to ~8 hours; weight loss driven mainly by reduced calorie intake.",
    best: "People who prefer fewer, larger meals and struggle with snacking.",
    watch: "Hard to hit high protein targets in one or two meals — plan protein first.",
  },
  {
    emoji: "🥩",
    name: "High-Protein",
    how: "1.6–2.2 g protein per kg body weight, spread across 3–5 meals.",
    best: "Fat loss with muscle retention, muscle gain, active adults, older adults.",
    watch: "Pair with fiber and water; protein alone isn't a diet.",
  },
  {
    emoji: "🥑",
    name: "Low-Carb / Keto",
    how: "Carbs cut sharply (keto: <50 g/day); body shifts to fat and ketones for fuel.",
    best: "Insulin resistance, appetite control, some neurological indications.",
    watch: "Endurance performance can drop; long-term adherence is the real challenge.",
  },
  {
    emoji: "🫒",
    name: "Mediterranean",
    how: "Vegetables, legumes, whole grains, olive oil, fish, moderate dairy, limited red meat.",
    best: "Long-term cardiovascular and metabolic health — the most consistent evidence base.",
    watch: "Portions still matter; olive oil is calorie-dense.",
  },
  {
    emoji: "🌱",
    name: "Plant-Based / Vegan",
    how: "Mostly or entirely plant foods; protein from legumes, tofu, tempeh, seitan.",
    best: "High fiber, low saturated fat, environmental footprint.",
    watch: "Plan for B12, iron, omega-3, and enough protein (harder without animal foods).",
  },
  {
    emoji: "⚖️",
    name: "Flexible Dieting (IIFYM)",
    how: "Hit daily calorie and macro targets; food choices flexible within those limits.",
    best: "Sustainability, social eating, athletes tracking performance.",
    watch: "Flexibility ≠ junk — micronutrient density still matters.",
  },
];

type Macro = {
  emoji: string;
  name: string;
  role: string;
  target: string;
  quality: string;
};

const MACROS: Macro[] = [
  {
    emoji: "🥩",
    name: "Protein",
    role: "Builds and repairs muscle, bone, skin, enzymes and hormones. Most satiating macro per calorie.",
    target: "1.6–2.2 g / kg / day for active adults. Older adults benefit from the upper end.",
    quality: "Eggs, dairy, poultry, fish, lean red meat, tofu, tempeh, legumes + grains.",
  },
  {
    emoji: "🌾",
    name: "Carbohydrates",
    role: "Primary fuel for the brain and high-intensity training. Feeds gut microbiota via fiber.",
    target: "3–7 g / kg / day depending on activity; endurance athletes higher.",
    quality: "Intact whole grains, legumes, fruit, potatoes, vegetables. Minimize refined sugars.",
  },
  {
    emoji: "🥑",
    name: "Fats",
    role: "Hormone production, vitamin absorption (A, D, E, K), cell membranes, brain tissue.",
    target: "0.6–1.0 g / kg / day minimum; the rest of calories after protein and carbs.",
    quality: "Olive oil, nuts, seeds, avocado, fatty fish. Limit industrial trans fats.",
  },
];

type Evo = { year: string; title: string; body: string };

const EVOLUTION: Evo[] = [
  {
    year: "2.5M–10K BCE",
    title: "Hunter-gatherers",
    body: "Animal protein, fish, tubers, fruit, wild plants. High protein and micronutrient density, high physical activity.",
  },
  {
    year: "10,000 BCE",
    title: "Agricultural revolution",
    body: "Grains and dairy scale up. Calorie surplus becomes possible; average height and dental health temporarily drop.",
  },
  {
    year: "1800s",
    title: "Industrialization",
    body: "Refined flour, sugar, seed oils and canned foods become cheap and abundant. Chronic disease patterns shift.",
  },
  {
    year: "1980s–90s",
    title: "The low-fat era",
    body: "Fat gets blamed for heart disease. Sugar-loaded 'low-fat' products flood shelves. Obesity accelerates.",
  },
  {
    year: "2000s",
    title: "Low-carb & protein return",
    body: "Atkins, paleo, keto and high-protein diets restore protein and fat to the plate.",
  },
  {
    year: "Today",
    title: "Personalized, AI-driven training",
    body: "Plans adapt to the individual — body, goals, culture, allergies. Adherence beats ideology.",
  },
];

type Myth = { myth: string; truth: string };

const MYTHS: Myth[] = [
  {
    myth: "Eating protein damages your kidneys.",
    truth: "In healthy adults, high-protein diets do not impair kidney function. This warning applies to pre-existing kidney disease.",
  },
  {
    myth: "Carbs after 6 PM make you fat.",
    truth: "Total daily calories drive body-fat change, not the clock on the wall.",
  },
  {
    myth: "Fat makes you fat.",
    truth: "Excess calories make you fat. Dietary fat is essential for hormones and vitamin absorption.",
  },
  {
    myth: "You need to eat every 2–3 hours to 'stoke metabolism'.",
    truth: "Meal frequency has a negligible effect on metabolic rate. Total intake and protein distribution matter more.",
  },
  {
    myth: "Detox teas and cleanses flush toxins.",
    truth: "Your liver and kidneys already do that. There is no clinical evidence that commercial detoxes add benefit.",
  },
];

const SOURCES: { name: string; note: string; url: string }[] = [
  {
    name: "Dietary Guidelines for Americans, 2020–2025",
    note: "USDA & HHS — foundational guidance on nutrients, food groups and dietary patterns.",
    url: "https://www.dietaryguidelines.gov/",
  },
  {
    name: "WHO — Healthy diet fact sheet",
    note: "World Health Organization overview of population-level dietary recommendations.",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  },
  {
    name: "EFSA — Dietary Reference Values",
    note: "European Food Safety Authority reference values for energy and nutrients.",
    url: "https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values",
  },
  {
    name: "ISSN Position Stand: Protein and Exercise (Jäger et al., 2017)",
    note: "International Society of Sports Training — evidence review on protein intake for active adults.",
    url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8",
  },
  {
    name: "PREDIMED Trial (Estruch et al., NEJM 2018)",
    note: "Landmark randomized trial on the Mediterranean diet and cardiovascular events.",
    url: "https://www.nejm.org/doi/full/10.1056/NEJMoa1800389",
  },
  {
    name: "USDA FoodData Central",
    note: "Reference database for food composition, calories and nutrients.",
    url: "https://fdc.nal.usda.gov/",
  },
];

export const Route = createFileRoute("/training-science")({
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
  component: DietSciencePage,
});

function DietSciencePage() {
  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          🔬 The Diet Science
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          The <span className="text-primary">science</span> behind what you eat
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          A plain-language tour of diet schedules, macronutrients, the evolution
          of human eating, and the myths that keep coming back.
        </p>
      </header>

      {/* At a glance */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { emoji: "🥩", label: "Protein first", value: "1.6–2.2 g/kg" },
          { emoji: "🔥", label: "Calorie balance", value: "Still the master lever" },
          { emoji: "🧬", label: "Personalization", value: "Beats any single diet name" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm"
          >
            <div className="text-3xl">{s.emoji}</div>
            <div className="mt-2 text-lg font-bold text-foreground">{s.value}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Our philosophy */}
      <section className="mt-12 rounded-3xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="text-3xl">💡</span>
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              Our philosophy: protein-forward, not anti-anything
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              SmartyWorkout is built around one bias we're happy to admit — most
              people under-eat protein. Protein is the most satiating macro,
              protects muscle in a calorie deficit, and supports every tissue
              in the body. We don't demonize carbs or fat. We simply build
              plans that anchor protein first, then complete the plate with
              quality carbs, fats, fiber and micronutrients.
            </p>
          </div>
        </div>
      </section>

      {/* Diet schedules */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          📅 Diet schedules, decoded
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The most-studied dietary patterns, what they actually do, and where
          they shine.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {SCHEDULES.map((d) => (
            <div
              key={d.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{d.emoji}</span>
                <h3 className="text-lg font-bold text-foreground">{d.name}</h3>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="inline font-semibold text-foreground">How it works: </dt>
                  <dd className="inline text-muted-foreground">{d.how}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-foreground">Best for: </dt>
                  <dd className="inline text-muted-foreground">{d.best}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-foreground">Watch out: </dt>
                  <dd className="inline text-muted-foreground">{d.watch}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* Macros deep dive */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          🧪 The macronutrients
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every calorie you eat is protein, carbohydrate, fat or alcohol. Here's
          what each one actually does.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {MACROS.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <h3 className="text-lg font-bold text-foreground">{m.name}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{m.role}</p>
              <div className="mt-3 rounded-xl bg-primary/10 p-3 text-xs">
                <div className="font-semibold text-foreground">🎯 Target</div>
                <div className="text-muted-foreground">{m.target}</div>
              </div>
              <div className="mt-2 rounded-xl bg-secondary/60 p-3 text-xs">
                <div className="font-semibold text-foreground">✨ Best sources</div>
                <div className="text-muted-foreground">{m.quality}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Simple ASCII-style macro split */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            📊 A common protein-forward split
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div>
              <div className="mb-1 text-foreground">Protein · 30%</div>
              <div className="h-3 rounded-full bg-primary" />
            </div>
            <div>
              <div className="mb-1 text-foreground">Carbs · 40%</div>
              <div className="h-3 rounded-full bg-green-500" />
            </div>
            <div>
              <div className="mb-1 text-foreground">Fats · 30%</div>
              <div className="h-3 rounded-full bg-amber-500" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Splits shift by goal and body size. SmartyWorkout calculates yours
            individually — this is only an illustration.
          </p>
        </div>
      </section>

      {/* Case study */}
      <section className="mt-14 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          📖 Case study
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
          Two people, same calories, different results
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-secondary/50 p-5">
            <h3 className="text-lg font-bold text-foreground">👤 Person A — 1,800 kcal</h3>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>• 60 g protein (13%)</li>
              <li>• 260 g carbs (mostly refined)</li>
              <li>• 55 g fat</li>
              <li>• Little fiber, hungry by 3 PM</li>
            </ul>
            <p className="mt-3 text-sm">
              <span className="font-semibold text-foreground">Result: </span>
              <span className="text-muted-foreground">
                Weight drops for a week, then muscle loss, cravings, and
                rebound.
              </span>
            </p>
          </div>
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
            <h3 className="text-lg font-bold text-foreground">👤 Person B — 1,800 kcal</h3>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>• 140 g protein (31%)</li>
              <li>• 170 g carbs (whole grains, fruit, legumes)</li>
              <li>• 55 g fat (olive oil, nuts, fish)</li>
              <li>• 30 g fiber, satiated between meals</li>
            </ul>
            <p className="mt-3 text-sm">
              <span className="font-semibold text-foreground">Result: </span>
              <span className="text-muted-foreground">
                Steady fat loss, muscle preserved, energy stable, sustainable
                for months.
              </span>
            </p>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Same calorie budget, radically different outcomes — because
          composition, protein and food quality all matter.
        </p>
      </section>

      {/* Evolution timeline */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          🕰️ How our diet evolved
        </h2>
        <div className="mt-6 relative border-l-2 border-primary/30 pl-6">
          {EVOLUTION.map((e) => (
            <div key={e.year} className="relative mb-8 last:mb-0">
              <span className="absolute -left-[33px] top-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                •
              </span>
              <div className="text-xs font-bold uppercase tracking-widest text-primary">
                {e.year}
              </div>
              <div className="text-lg font-bold text-foreground">{e.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Myths */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          ❌ Diet myths that refuse to die
        </h2>
        <div className="mt-6 space-y-4">
          {MYTHS.map((m) => (
            <div
              key={m.myth}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">❌</span>
                <p className="text-sm font-semibold text-foreground">{m.myth}</p>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <span className="text-lg">✅</span>
                <p className="text-sm text-muted-foreground">{m.truth}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          📚 Sources & further reading
        </h2>
        <ul className="mt-4 space-y-3">
          {SOURCES.map((s) => (
            <li
              key={s.url}
              className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm"
            >
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {s.name} ↗
              </a>
              <p className="mt-1 text-muted-foreground">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        SmartyWorkout is a general wellness tool, not medical advice. Always consult
        a qualified professional for clinical conditions.
      </p>
    </article>
  );
}
