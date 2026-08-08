import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BMR_URL = "https://smartyworkout.com/tools/bmr-calculator";
const BMR_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${BMR_URL}#app`,
      name: "SmartyWorkout BMR Calculator",
      url: BMR_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      isPartOf: { "@id": "https://smartyworkout.com/#website" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free BMR calculator using the Mifflin-St Jeor equation to estimate basal metabolic rate and daily calorie needs.",
    },
    {
      "@type": "HowTo",
      name: "How to calculate your BMR with SmartyWorkout",
      description:
        "Use the Mifflin-St Jeor equation to estimate basal metabolic rate and total daily calorie needs.",
      step: [
        { "@type": "HowToStep", name: "Enter age", text: "Enter your age in years." },
        { "@type": "HowToStep", name: "Enter weight", text: "Enter your weight in kilograms." },
        { "@type": "HowToStep", name: "Enter height", text: "Enter your height in centimeters." },
        { "@type": "HowToStep", name: "Select gender", text: "Select your biological sex for the equation." },
        { "@type": "HowToStep", name: "Choose activity", text: "Pick your activity level to see TDEE." },
        { "@type": "HowToStep", name: "Read result", text: "Read your BMR and estimated daily calories." },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "Tools", item: "https://smartyworkout.com/tools" },
        { "@type": "ListItem", position: 3, name: "BMR Calculator", item: BMR_URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/tools/bmr-calculator")({
  head: () => ({
    meta: [
      { title: "Free BMR Calculator — Basal Metabolic Rate | SmartyWorkout" },
      {
        name: "description",
        content:
          "Free BMR calculator using the Mifflin-St Jeor equation. Estimate your basal metabolic rate and daily calorie needs across activity levels.",
      },
      { property: "og:title", content: "Free BMR Calculator | SmartyWorkout" },
      {
        property: "og:description",
        content: "Estimate your BMR and daily calorie needs — free tool by SmartyWorkout.",
      },
      { property: "og:url", content: BMR_URL },
    ],
    links: [{ rel: "canonical", href: BMR_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(BMR_JSONLD) }],
  }),
  component: BMRCalculatorPage,
});

function BMRCalculatorPage() {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (isNaN(w) || isNaN(h) || isNaN(a) || !gender) return;
    const bmr =
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;
    setResult(Math.round(bmr));
  };

  const activityLevels = result
    ? [
        { level: "Sedentary (little or no exercise)", calories: Math.round(result * 1.2) },
        { level: "Lightly active (1–3 days/week)", calories: Math.round(result * 1.375) },
        { level: "Moderately active (3–5 days/week)", calories: Math.round(result * 1.55) },
        { level: "Very active (6–7 days/week)", calories: Math.round(result * 1.725) },
        { level: "Extra active (2× per day)", calories: Math.round(result * 1.9) },
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyWorkout Tools — Free to Use
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          BMR Calculator
        </h1>
      </div>

      <Card className="mb-4 border-2 border-primary/40">
        <CardContent className="p-3">
          <p className="text-center text-sm text-muted-foreground">
            Uses the{" "}
            <span className="font-semibold text-primary">Mifflin–St Jeor equation</span> to
            calculate your basal metabolic rate — the calories you burn at rest.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
              />
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter your weight"
              />
            </div>

            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Enter your height"
              />
            </div>

            <Button onClick={calculate} className="w-full" size="lg">
              Calculate BMR
            </Button>
          </div>

          {result !== null && (
            <div className="space-y-4 pt-4">
              <div className="rounded-lg bg-primary/10 p-6 text-center">
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  Your Basal Metabolic Rate
                </h2>
                <p className="text-4xl font-bold text-primary">{result} cal/day</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Calories burned at complete rest
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">
                  Daily Calorie Needs by Activity Level
                </h3>
                <div className="space-y-3">
                  {activityLevels.map((item) => (
                    <div
                      key={item.level}
                      className="flex items-center justify-between rounded-lg bg-muted p-4"
                    >
                      <p className="text-sm">{item.level}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {item.calories} cal
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">What is BMR?</strong> Your Basal Metabolic
                  Rate is the number of calories your body needs at rest. The activity
                  multipliers give your Total Daily Energy Expenditure (TDEE).
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
