import { createServerFn } from "@tanstack/react-start";

const USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients?: { nutrientId: number; value?: number }[];
  dataType?: string;
}

export interface FoodItem {
  fdcId: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

function extractNutrients(food: USDAFood): FoodItem {
  const n: Record<string, number> = {};
  for (const x of food.foodNutrients || []) {
    const v = x.value ?? 0;
    if (x.nutrientId === 1008) n.calories = v;
    if (x.nutrientId === 1003) n.protein = v;
    if (x.nutrientId === 1005) n.carbs = v;
    if (x.nutrientId === 1004) n.fat = v;
    if (x.nutrientId === 1079) n.fiber = v;
  }
  return {
    fdcId: food.fdcId,
    name: food.description,
    calories: n.calories ?? 0,
    protein: n.protein ?? 0,
    carbs: n.carbs ?? 0,
    fat: n.fat ?? 0,
    fiber: n.fiber ?? 0,
  };
}

async function searchUSDA(query: string, apiKey: string, pageSize = 20): Promise<USDAFood[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    pageSize: String(pageSize),
    dataType: "Foundation,SR Legacy",
  });
  const res = await fetch(`${USDA_API_URL}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.foods || [];
}

function scoreFood(food: USDAFood, q: string): number {
  const name = food.description.toLowerCase();
  const words = name.split(/[\s,]+/).filter(Boolean);
  let score = 0;
  if (name === q) score = 100;
  else if (name.startsWith(q)) score = 80;
  else if (words.some((w) => w === q)) score = 70;
  else if (words.some((w) => w.startsWith(q))) score = 60;
  else if (name.includes(q)) score = 40;
  else score = 20;
  const penalty = ["babyfood", "baby food", "infant", "toddler", "formula", "junior", "strained"];
  if (penalty.some((p) => name.includes(p))) score -= 30;
  const brands = ["chick-fil-a", "mcdonald", "wendy", "burger king", "subway", "taco bell", "pizza hut", "kfc", "popeye", "denny", "applebee"];
  if (brands.some((b) => name.includes(b))) score -= 20;
  score -= Math.min(words.length, 8);
  if (food.dataType === "Foundation") score += 5;
  return Math.max(1, score);
}

export const searchFood = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<{ foods: FoodItem[] }> => {
    const query = (data.query ?? "").trim();
    if (query.length < 2) return { foods: [] };

    const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
    const q = query.toLowerCase();

    const [exact, wildcard] = await Promise.all([
      searchUSDA(query, apiKey),
      searchUSDA(query + "*", apiKey, 20),
    ]);
    let raw = [...exact, ...wildcard];

    if (raw.length < 5 && query.length <= 8) {
      const common = [
        "chicken", "cheese", "cherry", "chips", "chocolate", "chickpea",
        "banana", "bacon", "bean", "beef", "bread", "broccoli", "butter",
        "rice", "salmon", "steak", "sugar", "tomato", "tuna", "turkey",
        "potato", "pasta", "pork", "pepper", "peanut", "pizza",
        "milk", "mango", "mushroom", "oat", "onion", "orange", "egg",
        "fish", "flour", "apple", "avocado", "almond", "carrot", "corn",
        "cream", "cucumber", "garlic", "grape", "honey", "lemon", "lettuce",
        "lobster", "lamb", "yogurt", "walnut", "shrimp", "spinach", "soy",
        "feta", "olive", "hummus", "lentil", "quinoa", "yiaourti",
      ];
      const matches = common.filter((f) => f.startsWith(q)).slice(0, 2);
      const more = await Promise.all(matches.map((w) => searchUSDA(w, apiKey, 20)));
      for (const foods of more) raw = [...raw, ...foods];
    }

    const noise = ["babyfood", "baby food", "infant formula", "gerber"];
    raw = raw.filter((f) => {
      const n = f.description.toLowerCase();
      return !noise.some((p) => n.includes(p));
    });

    const seen = new Set<number>();
    const unique: USDAFood[] = [];
    for (const f of raw) {
      if (!seen.has(f.fdcId)) {
        seen.add(f.fdcId);
        unique.push(f);
      }
    }

    const scored = unique
      .map((f) => ({ food: f, score: scoreFood(f, q) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return { foods: scored.map((s) => extractNutrients(s.food)) };
  });
