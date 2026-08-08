export type Units = "metric" | "imperial";
export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "weight_loss" | "maintenance" | "muscle_gain" | "recomposition";
export type DietStyle =
  | "balanced"
  | "mediterranean"
  | "keto"
  | "carnivore"
  | "vegetarian"
  | "vegan"
  | "low_carb"
  | "high_protein"
  | "intermittent_fasting"
  | "other";
export type Budget = "low" | "medium" | "high";
export type Sleep = "poor" | "average" | "good";
export type CookingSkill = "beginner" | "intermediate" | "advanced";
export type FastingWindow = "16:8" | "18:6" | "20:4" | "OMAD" | "custom";
export type FastingApproach = "balanced" | "aggressive" | "very_aggressive";

export interface QuestionnaireData {
  basics: {
    age?: number;
    gender?: Gender;
    height?: number;
    weight?: number;
    units: Units;
    country?: string;
  };
  body: {
    bmr?: number | "auto";
    bmi?: number | "auto";
    bodyFat?: number;
    muscleMass?: number;
    inbodyNotes?: string;
  };
  activity: {
    trains: boolean;
    trainingType?: string;
    trainingFrequency?: number;
    trainingDurationMin?: number;
    trainingIntensity?: "low" | "medium" | "high";
    activityLevel: ActivityLevel;
    stepsPerDay?: number;
    tdee?: number | "auto";
    sleep: Sleep;
  };
  goal: {
    goal: Goal;
    targetWeight?: number;
    timelineWeeks?: number;
    calorieTarget?: number; // optional exact calorie target user wants
  };
  eating: {
    dietStyle: DietStyle;
    dietStyleOther?: string;
    mealsPerDay: number;
    preferredMealTimes?: string;
    likedFoods: string[];
    likedFoodsOther?: string;
    dislikedFoods: string[];
    dislikedFoodsOther?: string;
    allergyTags: string[];
    allergies: string; // free-text extra
    culturalRestrictions: string[];
    culturalRestrictionsOther?: string;
    alcohol?: string;
    caffeine?: string;
    waterLitersPerDay?: number;
    fasting?: {
      window?: FastingWindow;
      customWindow?: string;
      approach?: FastingApproach;
    };
  };
  constraints: {
    cookingSkill: CookingSkill;
    cookingMinutesPerDay?: number;
    budget: Budget;
    equipment?: string[];
    eatingOutFrequency?: string;
  };
  health: {
    conditions?: string;
    medications?: string;
    pregnancyBreastfeeding?: "none" | "pregnant" | "breastfeeding";
    disclaimerAcknowledged: boolean;
  };
  notes: string;
}

export const DEFAULT_QUESTIONNAIRE: QuestionnaireData = {
  basics: { units: "metric" },
  body: {},
  activity: { trains: false, activityLevel: "moderate", sleep: "average" },
  goal: { goal: "maintenance" },
  eating: {
    dietStyle: "balanced",
    mealsPerDay: 3,
    likedFoods: [],
    dislikedFoods: [],
    allergyTags: [],
    allergies: "",
    culturalRestrictions: [],
  },
  constraints: { cookingSkill: "intermediate", budget: "medium" },
  health: { disclaimerAcknowledged: false },
  notes: "",
};

export const STEP_LABELS = [
  "Basics",
  "Body",
  "Activity",
  "Goal",
  "Eating",
  "Constraints",
  "Health",
  "Notes",
];

export const FOOD_CATEGORIES: Array<{ label: string; foods: string[] }> = [
  {
    label: "Proteins",
    foods: ["chicken", "beef", "pork", "turkey", "eggs", "fish", "tuna", "salmon", "shrimp", "tofu"],
  },
  {
    label: "Dairy",
    foods: ["milk", "yogurt", "cheese", "cottage cheese", "butter"],
  },
  {
    label: "Carbs",
    foods: ["rice", "potatoes", "pasta", "bread", "oats", "quinoa", "couscous"],
  },
  {
    label: "Vegetables",
    foods: ["spinach", "broccoli", "tomato", "cucumber", "salad greens", "peppers", "carrots", "zucchini"],
  },
  {
    label: "Fruits",
    foods: ["banana", "apple", "berries", "orange", "grapes", "watermelon"],
  },
  {
    label: "Legumes & Nuts",
    foods: ["lentils", "chickpeas", "beans", "almonds", "walnuts", "peanuts", "peanut butter"],
  },
];

export const ALLERGY_TAGS = [
  "none",
  "nuts",
  "peanuts",
  "dairy/lactose",
  "gluten",
  "eggs",
  "shellfish",
  "fish",
  "soy",
  "sesame",
];

export const CULTURAL_TAGS = ["halal", "kosher", "no pork", "no beef", "no alcohol"];
