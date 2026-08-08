import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchFood, type FoodItem } from "@/lib/food-search.functions";

const CC_URL = "https://smartyworkout.com/tools/calorie-counter";
const CC_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${CC_URL}#app`,
      name: "SmartyWorkout Calorie Counter",
      url: CC_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      isPartOf: { "@id": "https://smartyworkout.com/#website" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free calorie counter powered by the USDA FoodData Central database — 300,000+ foods.",
    },
    {
      "@type": "HowTo",
      name: "How to look up calories and macros with SmartyWorkout",
      description: "Search any food and see calories, protein, carbs, fat and fiber for your portion.",
      step: [
        { "@type": "HowToStep", name: "Search a food", text: "Type any food name — e.g. chicken breast, feta, oats." },
        { "@type": "HowToStep", name: "Pick a match", text: "Select the closest food from the USDA results." },
        { "@type": "HowToStep", name: "Enter portion", text: "Enter the grams you plan to eat." },
        { "@type": "HowToStep", name: "Read training", text: "See calories, protein, carbs, fat and fiber for that portion." },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "Tools", item: "https://smartyworkout.com/tools" },
        { "@type": "ListItem", position: 3, name: "Calorie Counter", item: CC_URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/tools/calorie-counter")({
  head: () => ({
    meta: [
      { title: "Calorie Counter — Search 300,000+ Foods | SmartyWorkout" },
      {
        name: "description",
        content:
          "Free calorie counter powered by the USDA FoodData Central database. Search any food — Greek, American, Mediterranean and more — and instantly see calories, protein, carbs, fat and fiber per portion.",
      },
      { property: "og:title", content: "Calorie Counter | SmartyWorkout" },
      {
        property: "og:description",
        content:
          "Search 300,000+ foods and instantly see calories, protein, carbs, fat and fiber per portion.",
      },
      { property: "og:url", content: CC_URL },
    ],
    links: [{ rel: "canonical", href: CC_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(CC_JSONLD) }],
  }),
  component: CalorieCounterPage,
});

function CalorieCounterPage() {
  const search = useServerFn(searchFood);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      const id = ++requestIdRef.current;
      setLoading(true);
      try {
        const data = await search({ data: { query: q } });
        if (id !== requestIdRef.current) return;
        setResults(data.foods || []);
        setShowDropdown(true);
      } catch (e) {
        console.error("Food search error:", e);
        if (id === requestIdRef.current) setResults([]);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected) return;
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, selected]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectFood = (f: FoodItem) => {
    setSelected(f);
    setQuery(f.name);
    setShowDropdown(false);
  };

  const gramsNum = parseFloat(grams) || 0;
  const multiplier = gramsNum / 100;

  const adjustGrams = (d: number) =>
    setGrams((p) => String(Math.max(1, (parseInt(p) || 0) + d)));

  const macros = selected
    ? [
        { label: "Calories", value: (selected.calories * multiplier).toFixed(0), unit: "kcal", Icon: Flame },
        { label: "Protein", value: (selected.protein * multiplier).toFixed(1), unit: "g", Icon: Beef },
        { label: "Carbs", value: (selected.carbs * multiplier).toFixed(1), unit: "g", Icon: Wheat },
        { label: "Fat", value: (selected.fat * multiplier).toFixed(1), unit: "g", Icon: Droplets },
        { label: "Fiber", value: (selected.fiber * multiplier).toFixed(1), unit: "g", Icon: Leaf },
      ]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyWorkout Tools — Free to Use
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Calorie Counter
        </h1>
      </div>

      <Card className="mb-4 border-2 border-primary/40">
        <CardContent className="p-3">
          <p className="text-center text-sm text-muted-foreground">
            Search any food from{" "}
            <span className="font-semibold text-primary">300,000+ items</span> and
            instantly see calories, protein, carbs, fat and fiber.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search food (e.g. chicken, feta, rice, banana)…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selected) setSelected(null);
                }}
                className="pl-10 pr-10"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {showDropdown && results.length > 0 && (
              <Card className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto shadow-lg">
                <CardContent className="p-1">
                  {results.map((f) => (
                    <button
                      key={f.fdcId}
                      onClick={() => selectFood(f)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {f.calories.toFixed(0)} kcal/100g
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm font-semibold text-foreground">{selected.name}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Portion (grams)
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => adjustGrams(-10)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    className="text-center"
                  />
                  <Button variant="outline" size="icon" onClick={() => adjustGrams(10)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {macros && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {macros.map(({ label, value, unit, Icon }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-card p-3 text-center"
                    >
                      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-lg font-bold text-foreground">
                        {value}
                        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                          {unit}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                  setGrams("100");
                  setResults([]);
                }}
              >
                Search another food
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Data from USDA FoodData Central. For planning use only.
      </p>
    </div>
  );
}
