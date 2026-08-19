/**
 * Deterministic (zero AI credits) support answering machine.
 *
 * Every answer below is written from the product itself: pricing, billing,
 * cancellation, the workout engine, WOD, the tools, offline mode, accounts and
 * the community. Classification is pure keyword scoring — no model call, no
 * network, no cost.
 */

export type SupportTopic =
  | "payments"
  | "cancellation"
  | "subscription"
  | "account"
  | "workout"
  | "wod"
  | "coach"
  | "tools"
  | "offline"
  | "community"
  | "technical"
  | "privacy";

export interface AutoAnswer {
  topic: SupportTopic;
  /** Short human label used in the admin panel / emails. */
  label: string;
  /** Plain-text answer sent to the member. */
  body: string;
  /** How strongly the message matched (number of keyword hits). */
  score: number;
}

interface Rule {
  topic: SupportTopic;
  label: string;
  keywords: string[];
  /** Strong keywords count double. */
  strong?: string[];
  body: string;
}

const RULES: Rule[] = [
  {
    topic: "cancellation",
    label: "Cancellation / refund",
    strong: ["cancel", "cancellation", "unsubscribe", "refund", "stop my subscription", "stop payment"],
    keywords: ["end my plan", "quit", "terminate", "money back", "charged again"],
    body:
      "How to cancel your Smarty Workout membership:\n\n" +
      "1. Sign in and open the avatar menu (top right).\n" +
      "2. Go to Account.\n" +
      "3. Open Manage subscription — this opens the secure billing portal.\n" +
      "4. Choose Cancel plan.\n\n" +
      "Your membership stays active until the end of the period you already paid for, so you keep Smarty Coach, the Workout of the Day and the full library until that date. Nothing is charged after that, and your workouts and history stay in your account if you come back.\n\n" +
      "If you were charged by mistake or something went wrong with a payment, tell us the date and the last 4 digits of the card and we will sort the refund out for you.",
  },
  {
    topic: "payments",
    label: "Payment / billing",
    strong: ["payment", "billing", "invoice", "receipt", "card declined", "charged", "credit card", "stripe"],
    keywords: ["pay", "paid", "price", "cost", "euro", "9.99", "vat", "double charge", "checkout"],
    body:
      "About payments and billing:\n\n" +
      "• Smarty Workout has one single plan: 9.99 EUR per month. No hidden extras, no tiers.\n" +
      "• Payments are processed by our secure payment provider — we never see or store your card details.\n" +
      "• Invoices and receipts: Account → Manage subscription → Billing history. Every receipt can be downloaded there as a PDF.\n" +
      "• Card declined? It is almost always the bank's 3-D Secure step. Retry the checkout and confirm the prompt from your banking app, or try another card.\n" +
      "• If you see a charge you do not recognise, send us the date and the amount and we will check it immediately.",
  },
  {
    topic: "subscription",
    label: "Membership / access",
    strong: ["subscription", "membership", "premium", "upgrade", "free trial", "locked"],
    keywords: ["plan", "renew", "renewal", "access", "member", "pro", "paywall"],
    body:
      "About your membership:\n\n" +
      "• One plan, 9.99 EUR per month, renewing automatically until you cancel.\n" +
      "• It unlocks Smarty Coach (personalised workout generation), the Workout of the Day, the full logbook, progress tracking and the community.\n" +
      "• The Exercise Library, the tools (Workout Timer, Rounds Tracker, 1RM Calculator) and all the guides stay free for everyone.\n" +
      "• If a feature still looks locked right after paying, sign out and back in once — the access flag refreshes on a new session.\n" +
      "• Manage everything from Account → Manage subscription.",
  },
  {
    topic: "account",
    label: "Account / sign-in",
    strong: ["password", "sign in", "log in", "login", "cannot log", "can't log", "reset password", "email change"],
    keywords: ["account", "sign up", "register", "verification", "confirm email", "delete my account", "locked out"],
    body:
      "About your account:\n\n" +
      "• Forgot your password: on the Sign in page choose Forgot password, and we send a reset link to your email. Check the spam folder if it does not arrive within a couple of minutes.\n" +
      "• You can also sign in with Google using the same email address.\n" +
      "• Change your name, avatar or training details in Profile.\n" +
      "• Want your account and data deleted? Reply here with the word DELETE and we remove everything permanently.",
  },
  {
    topic: "coach",
    label: "Smarty Coach",
    strong: ["smarty coach", "generate a workout", "generation", "questionnaire", "create my workout"],
    keywords: ["coach", "personalised", "personalized", "adapt", "recommendation", "difficulty", "stars"],
    body:
      "How Smarty Coach builds your training:\n\n" +
      "1. Complete your Training Profile once (age, level, goal, equipment, limitations). This is mandatory — Coach will not guess your body.\n" +
      "2. Open Coach and answer the short questionnaire (time available, focus, environment, mood).\n" +
      "3. Coach filters the exercise library down to what you actually can and want to do — it only ever uses exercises from our library, never invented ones.\n" +
      "4. It builds the session in blocks (soft tissue, activation, warm-up, main work, finisher, cool-down) and shows a 1–3 star difficulty.\n" +
      "5. Everything you log afterwards (sets, reps, load, RPE, feedback) feeds back into the next recommendation.\n\n" +
      "Tip: if the sessions feel too easy or too hard, complete the short feedback after a workout — that is the fastest way for Coach to correct itself.",
  },
  {
    topic: "wod",
    label: "Workout of the Day",
    strong: ["workout of the day", "wod"],
    keywords: ["daily workout", "today's workout", "cycle", "variant"],
    body:
      "About the Workout of the Day:\n\n" +
      "• The WOD is the same session for every member — a fixed programmed calendar, not a generated one, so the whole community trains together.\n" +
      "• A new WOD appears every day at midnight in your own timezone, with the last 3 days kept in the history strip.\n" +
      "• It skips the questionnaire and uses your Training Profile only, so make sure your equipment and limitations are up to date.\n" +
      "• You can play it, log it and share it exactly like any other workout, and it counts towards your streak and badges.",
  },
  {
    topic: "workout",
    label: "Workouts / player / logbook",
    strong: ["player", "logbook", "log a workout", "schedule", "reps", "sets", "timer during workout"],
    keywords: ["workout", "exercise", "training", "history", "favourite", "favorite", "calendar", "rest", "share"],
    body:
      "Using your workouts:\n\n" +
      "• Reader mode shows the full session; press Start Workout to open the player, which walks you through every step with automatic rest timers and keeps the screen awake.\n" +
      "• Log what you actually did (reps, weight, time, rounds, RPE) as you go — that is what powers Progress and the training load.\n" +
      "• Logbook holds everything: completed, scheduled and favourite sessions in a calendar. Scheduled dates are colour-coded — red if missed, blue for today, green for upcoming.\n" +
      "• Use Mark done, Reschedule or Remove schedule under a card to fix a plan.\n" +
      "• Any workout can be shared with the Share button, or posted to the community.",
  },
  {
    topic: "tools",
    label: "Free tools",
    strong: ["1rm", "rounds tracker", "workout timer", "calculator"],
    keywords: ["tool", "tools", "amrap", "emom", "tabata", "stopwatch"],
    body:
      "The free tools live under Tools and work without a membership:\n\n" +
      "• Workout Timer — intervals, EMOM, Tabata and AMRAP countdowns with audio cues.\n" +
      "• Rounds Tracker — a big tap target to count rounds and reps without losing your place.\n" +
      "• 1RM Calculator — estimates your one-rep max from a set you actually performed, and gives you the percentage table for programming.\n\n" +
      "They all keep running with the screen locked on and work offline once the app has been opened at least once.",
  },
  {
    topic: "offline",
    label: "Offline mode / app",
    strong: ["offline", "no internet", "install the app", "android", "ios", "pwa"],
    keywords: ["app store", "download", "sync", "airplane", "gym has no signal", "cache"],
    body:
      "About offline mode:\n\n" +
      "• Smarty Workout is offline-first: once you sign in, your profile, your workouts, your logbook and the exercise library are stored on your device automatically — you do not need to visit each page first.\n" +
      "• In the gym with no signal you can still open, play and log workouts. Everything you log is queued and syncs the moment you are back online (you will see the sync pill confirm it).\n" +
      "• You stay signed in offline on a device you already used to sign in.\n" +
      "• You can install it like a native app: in your browser menu choose Add to Home Screen / Install app.",
  },
  {
    topic: "community",
    label: "Community",
    strong: ["community", "leaderboard", "badge", "comment", "report a user"],
    keywords: ["share workout", "rating", "member", "achievement", "streak", "points"],
    body:
      "About the community:\n\n" +
      "• Share any of your workouts from the workout page — other members can copy it, rate it and comment on it.\n" +
      "• Badges and points come from real activity: workouts completed, active days, streaks and months of membership. They update automatically.\n" +
      "• The leaderboard ranks members by those points.\n" +
      "• If you see something abusive or unsafe, use the Report button on the card or comment — it reaches us straight away and we review it the same day.",
  },
  {
    topic: "privacy",
    label: "Privacy / data",
    strong: ["privacy", "gdpr", "my data", "delete my data"],
    keywords: ["personal data", "terms", "disclaimer", "medical", "injury", "waiver"],
    body:
      "About your data and safety:\n\n" +
      "• We store only what the app needs to train you: your training profile, your workouts and your logs. We never sell data and we never share it with advertisers.\n" +
      "• Full details are in our Privacy Policy and Terms pages, linked in the footer.\n" +
      "• Smarty Workout is not medical advice. If you have an injury or a health condition, declare it in your Training Profile limitations so Coach avoids those movements, and check with your doctor before starting.\n" +
      "• Want a copy or a deletion of your data? Reply here and we handle it.",
  },
  {
    topic: "technical",
    label: "Technical issue",
    strong: ["bug", "error", "crash", "not working", "doesn't work", "does not work", "blank screen", "stuck", "loading forever"],
    keywords: ["slow", "freeze", "broken", "glitch", "white page", "issue", "problem"],
    body:
      "Sorry about that — here is what fixes almost every technical issue:\n\n" +
      "1. Pull the page down / press the logo to refresh the app.\n" +
      "2. Sign out and sign back in once — this refreshes your session and your access flags.\n" +
      "3. If a page stays blank, close the app completely and reopen it so the latest version loads.\n" +
      "4. On mobile, make sure you are on the installed app or an up-to-date browser.\n\n" +
      "Still broken? Reply with the page you were on, the device and browser you use, and what you tapped just before it happened — that is enough for us to reproduce and fix it.",
  },
];

const WOD_AND_MANUAL_GENERATION_BODY =
  "No. Workout of the Day mode and manual Smarty Coach generation cannot be used at the same time.\n\n" +
  "Workout of the Day already creates your two workouts for the day automatically: one equipment workout and one bodyweight workout. Those two workouts are your daily pair, so manual generation is paused while Workout of the Day mode is active.\n\n" +
  "If you prefer to create your own two workouts with the Smarty Coach questionnaire, unsubscribe from Workout of the Day mode first. You can switch between the two options, but you cannot receive the two automatic Workout of the Day workouts and generate two additional workouts on the same day.";

const ESCALATION_BODY =
  "Thanks for coming back to us.\n\n" +
  "This one needs a human, so it is now in front of Haris personally. You will get a proper answer here (and by email) within 24–48 hours — usually much sooner.\n\n" +
  "Nothing else is needed from you; if you have extra details (screenshots, the exact page, the date of a payment), add them in a reply and they will be waiting with the ticket.\n\n" +
  "Yours in good health,\nHaris Falas, BSc Sports Science, Exo Specialist, CSCS";

export function escalationMessage(): string {
  return ESCALATION_BODY;
}

/** Pure keyword classifier — returns the best confident answer or null. */
export function classifySupportMessage(subject: string, message: string): AutoAnswer | null {
  const text = `${subject ?? ""} \n ${message ?? ""}`.toLowerCase();
  if (text.trim().length < 3) return null;

  const asksAboutWod = text.includes("workout of the day") || text.includes("wod");
  const asksAboutManualGeneration = [
    "generate",
    "create a workout",
    "create my workout",
    "make a workout",
    "own workout",
    "another workout",
    "additional workout",
    "two workouts",
    "2 workouts",
  ].some((phrase) => text.includes(phrase));
  if (asksAboutWod && asksAboutManualGeneration) {
    return {
      topic: "subscription",
      label: "Workout of the Day or manual workouts",
      body: WOD_AND_MANUAL_GENERATION_BODY,
      score: 10,
    };
  }

  let best: AutoAnswer | null = null;
  for (const rule of RULES) {
    let score = 0;
    for (const k of rule.strong ?? []) if (text.includes(k)) score += 2;
    for (const k of rule.keywords) if (text.includes(k)) score += 1;
    if (score > 0 && (!best || score > best.score)) {
      best = { topic: rule.topic, label: rule.label, body: rule.body, score };
    }
  }
  // Require at least one strong hit (2) or two weak hits before answering.
  if (!best || best.score < 2) return null;
  return best;
}
