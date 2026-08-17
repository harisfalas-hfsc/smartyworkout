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
import { PageHeader } from "@/components/PageHeader";

const URL = "https://smartyworkout.com/tools/1rm-calculator";
const TITLE = "1RM Calculator — One rep max (Brzycki) | SmartyWorkout";
const DESCRIPTION =
  "Free 1RM calculator using the Brzycki formula. Estimate your one rep max and get training percentages for strength programming.";

export const Route = createFileRoute("/tools/1rm-calculator")({
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
              "@type": "WebApplication",
              name: "1RM Calculator",
              url: URL,
              applicationCategory: "HealthApplication",
              operatingSystem: "Web",
              description: DESCRIPTION,
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              publisher: { "@id": "https://smartyworkout.com/#organization" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                { "@type": "ListItem", position: 2, name: "Tools", item: "https://smartyworkout.com/tools" },
                { "@type": "ListItem", position: 3, name: "1RM Calculator", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: OneRMCalculatorPage,
});

const EXERCISES = [
  "Bench Press",
  "Back Squats",
  "Deadlifts",
  "Bulgarian Split Squats, Right Leg",
  "Bulgarian Split Squats, Left Leg",
  "Shoulder Press, Right Arm",
  "Shoulder Press, Left Arm",
  "Military Presses",
  "Single Leg RDL, Right Leg",
  "Single Leg RDL, Left Leg",
  "Barbell Bicep Curls",
  "Concentrated Bicep Curls, Right Arm",
  "Concentrated Bicep Curls, Left Arm",
] as const;

const PERCENTS = [95, 90, 85, 80, 75, 70, 65, 60];

function OneRMCalculatorPage() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const calculateOneRM = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0 || r >= 37) return;
    const oneRM = w * (36 / (37 - r));
    setResult(Math.round(oneRM * 10) / 10);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="SmartyWorkout tools"
        title={
          <>
            1RM <span className="text-primary">Calculator</span>
          </>
        }
        subtitle="Uses the Brzycki formula to estimate your one-rep maximum — essential for programming strength training."
      />

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="exerciseName">Exercise Name</Label>
              <Select value={exerciseName} onValueChange={setExerciseName}>
                <SelectTrigger id="exerciseName">
                  <SelectValue placeholder="Select exercise..." />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISES.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weight">Weight Lifted (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight"
                step="0.5"
              />
            </div>

            <div>
              <Label htmlFor="reps">Number of Repetitions</Label>
              <Input
                id="reps"
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Enter reps (1-12)"
                max="12"
                min="1"
              />
            </div>

            <Button onClick={calculateOneRM} className="w-full">
              Calculate 1RM
            </Button>
          </div>

          {result !== null && (
            <div className="space-y-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-6 text-center">
                <h2 className="mb-2 text-lg font-semibold">Your Estimated 1RM</h2>
                <p className="text-4xl font-bold text-primary">{result} kg</p>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold">Training Percentages</h3>
                <div className="grid grid-cols-2 gap-3">
                  {PERCENTS.map((p) => (
                    <div key={p} className="rounded-lg bg-muted p-3">
                      <p className="text-sm text-muted-foreground">{p}%</p>
                      <p className="text-lg font-semibold">
                        {Math.round(result * (p / 100) * 10) / 10} kg
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-blue-400 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> This is an estimate using the Brzycki formula. Actual 1RM
                  may vary. Always use proper form and have a spotter when testing maximum lifts.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
