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

const MACRO_URL = "https://smartyworkout.com/tools/macro-calculator";
const MACRO_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${MACRO_URL}#app`,
      name: "SmartyWorkout Macro Calculator",
      url: MACRO_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      isPartOf: { "@id": "https://smartyworkout.com/#website" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free macro calculator for personalized calories, protein, carbs, fats, fiber and water targets.",
    },
    {
      "@type": "HowTo",
      name: "How to calculate your macros with SmartyWorkout",
      description:
        "Compute personalized calorie and macronutrient targets based on body, activity and goal.",
      step: [
        { "@type": "HowToStep", name: "Enter body stats", text: "Enter age, gender, height and weight." },
        { "@type": "HowToStep", name: "Set activity", text: "Choose your weekly activity level." },
        { "@type": "HowToStep", name: "Choose goal", text: "Pick weight loss, maintenance or muscle gain." },
        { "@type": "HowToStep", name: "Read targets", text: "Read your calorie, protein, carb, fat, fiber and water targets." },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "Tools", item: "https://smartyworkout.com/tools" },
        { "@type": "ListItem", position: 3, name: "Macro Calculator", item: MACRO_URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/tools/macro-calculator")({
  head: () => ({
    meta: [
      { title: "Macro Calculator — Calories, protein, carbs & fats | SmartyWorkout" },
      {
        name: "description",
        content:
          "Free macro calculator: personalized calories, protein, carbs, fats, fiber and water targets for weight loss, maintenance or muscle gain.",
      },
      { property: "og:title", content: "Macro Calculator | SmartyWorkout" },
      {
        property: "og:description",
        content: "Personalized calorie & macro targets for your goal — free tool by SmartyWorkout.",
      },
      { property: "og:url", content: MACRO_URL },
    ],
    links: [{ rel: "canonical", href: MACRO_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(MACRO_JSONLD) }],
  }),
  component: MacroCalculatorPage,
});

type Result = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  water: number;
  meals: number;
  bmr: number;
  tdee: number;
  deficitPercent: number;
  safetyFloorApplied: boolean;
};

function MacroCalculatorPage() {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [intensity, setIntensity] = useState("moderate");
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (isNaN(w) || isNaN(h) || isNaN(a) || !gender || !activityLevel || !goal) return;

    const bmr =
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very: 1.725,
      extra: 1.9,
    };
    const tdee = bmr * activityMultipliers[activityLevel];

    const deficitMap: Record<string, number> = {
      conservative: 0.1,
      moderate: 0.2,
      aggressive: 0.3,
    };
    const surplusMap: Record<string, number> = {
      conservative: 0.1,
      moderate: 0.15,
      aggressive: 0.2,
    };

    let targetCalories = tdee;
    let deficitPercent = 0;
    let safetyFloorApplied = false;

    if (goal === "lose") {
      deficitPercent = deficitMap[intensity] ?? 0.2;
      targetCalories = tdee * (1 - deficitPercent);
      const floor = gender === "female" ? 1200 : 1500;
      if (targetCalories < floor) {
        targetCalories = floor;
        safetyFloorApplied = true;
      }
    } else if (goal === "gain") {
      deficitPercent = surplusMap[intensity] ?? 0.15;
      targetCalories = tdee * (1 + deficitPercent);
    }

    let protein = 0;
    let carbs = 0;
    let fats = 0;
    if (goal === "lose") {
      protein = Math.round((targetCalories * 0.35) / 4);
      carbs = Math.round((targetCalories * 0.35) / 4);
      fats = Math.round((targetCalories * 0.3) / 9);
    } else if (goal === "gain") {
      protein = Math.round((targetCalories * 0.3) / 4);
      carbs = Math.round((targetCalories * 0.45) / 4);
      fats = Math.round((targetCalories * 0.25) / 9);
    } else {
      protein = Math.round((targetCalories * 0.3) / 4);
      carbs = Math.round((targetCalories * 0.4) / 4);
      fats = Math.round((targetCalories * 0.3) / 9);
    }

    const fiber = Math.round((targetCalories / 1000) * 14);
    const water = Math.round(((w * 35) / 1000) * 10) / 10;

    let meals = 3;
    if (targetCalories > 3000) meals = 6;
    else if (targetCalories > 2500) meals = 5;
    else if (targetCalories > 2000) meals = 4;

    setResult({
      calories: Math.round(targetCalories),
      protein,
      carbs,
      fats,
      fiber,
      water,
      meals,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      deficitPercent: Math.round(deficitPercent * 100),
      safetyFloorApplied,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyWorkout Tools — Free to Use
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Macro Calculator
        </h1>
      </div>

      <Card className="mb-4 border-2 border-primary/40">
        <CardContent className="p-3">
          <p className="text-center text-sm text-muted-foreground">
            Get complete <span className="font-semibold text-primary">training recommendations</span>{" "}
            including calories, macros, fiber, water and meal frequency.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <div>
              <Label htmlFor="activity">Activity Level</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger id="activity">
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Lightly active (1–3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderately active (3–5 days/week)</SelectItem>
                  <SelectItem value="very">Very active (6–7 days/week)</SelectItem>
                  <SelectItem value="extra">Extra active (2× per day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="goal">Goal</Label>
              <Select
                value={goal}
                onValueChange={(v) => {
                  setGoal(v);
                  if (v === "maintain") setIntensity("moderate");
                }}
              >
                <SelectTrigger id="goal">
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose weight</SelectItem>
                  <SelectItem value="maintain">Maintain weight</SelectItem>
                  <SelectItem value="gain">Gain weight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(goal === "lose" || goal === "gain") && (
              <div>
                <Label htmlFor="intensity">Intensity</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger id="intensity">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      Conservative — gentle, easier to sustain
                    </SelectItem>
                    <SelectItem value="moderate">Moderate — balanced approach</SelectItem>
                    <SelectItem value="aggressive">
                      Aggressive — faster results, harder to maintain
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={calculate} className="w-full" size="lg">
              Calculate My Macros
            </Button>
          </div>

          {result && (
            <div className="space-y-4 pt-4">
              <div className="rounded-lg border-2 border-primary/20 bg-primary/10 p-6 text-center">
                <p className="mb-1 text-sm text-muted-foreground">Daily Calorie Target</p>
                <p className="text-4xl font-bold text-primary">{result.calories}</p>
                <p className="mt-1 text-xs text-muted-foreground">calories per day</p>
                {result.safetyFloorApplied && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    Adjusted up to a safe minimum for your gender.
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-3 text-center font-semibold text-foreground">
                  Your Daily Macros
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.protein}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="rounded bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.carbs}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="rounded bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.fats}g</p>
                    <p className="text-xs text-muted-foreground">Fats</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xl font-bold text-primary">{result.fiber}g</p>
                  <p className="text-xs text-muted-foreground">Fiber</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xl font-bold text-primary">{result.water}L</p>
                  <p className="text-xs text-muted-foreground">Water</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xl font-bold text-primary">{result.meals}</p>
                  <p className="text-xs text-muted-foreground">Meals/Day</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-4">
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Behind the numbers
                </h4>
                <p className="text-xs text-muted-foreground">
                  BMR: <strong>{result.bmr}</strong> cal · TDEE:{" "}
                  <strong>{result.tdee}</strong> cal
                  {result.deficitPercent > 0 && (
                    <>
                      {" "}
                      · {goal === "lose" ? "Deficit" : "Surplus"}:{" "}
                      <strong>{result.deficitPercent}%</strong>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
