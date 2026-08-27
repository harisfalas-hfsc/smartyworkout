import type { SupabaseClient } from "@supabase/supabase-js";
import type { CronJobConfig } from "@/lib/cron/jobs.server";
import { TRAINING_TOPIC_SLUGS } from "@/lib/seo/training-topics";

type DB = SupabaseClient;

const MODEL = "google/gemini-2.5-pro";
const SITE_BASE_URL = "https://smartyworkout.com";
const DEFAULT_BLOG_RECIPIENT = "smartyworkout@outlook.com";
const NOTIFY_BATCH = 200;
const MAX_NOTIFY_MEMBERS = 5000;

/** Admin recipient for the "article published" report (editable in the Admin panel). */
export function blogRecipient(config?: CronJobConfig): string {
  const raw = config?.content?.recipient;
  const email = typeof raw === "string" ? raw.trim() : "";
  return email || DEFAULT_BLOG_RECIPIENT;
}
const AI_TIMEOUT_MS = 90_000;

export interface BlogGenerationResult {
  status: "ok" | "skipped" | "failed";
  changed: boolean;
  summary: string;
  title?: string;
  slug?: string;
  notified?: number;
  emailed?: boolean;
  failures: string[];
}

/** Every real page an article is allowed to link to. */
const VALID_PATHS: string[] = [
  "/",
  "/about",
  "/haris-falas",
  "/pricing",
  "/how-it-works",
  "/exercise-library",
  "/wod",
  "/faq",
  "/contact",
  "/glossary",
  "/training",
  "/tools",
  "/tools/workout-timer",
  "/tools/rounds-tracker",
  "/tools/1rm-calculator",
  "/blog",
  "/disclaimer",
  "/privacy",
  "/terms",
  ...TRAINING_TOPIC_SLUGS.map((slug) => `/training/${slug}`),
];

/** Links the writer is nudged to weave into the article. */
const SUGGESTED_LINKS = [
  "/how-it-works — how SmartyWorkout builds a personalized workout",
  "/exercise-library — the full SmartyWorkout exercise library",
  "/wod — the Workout of the Day",
  "/training — the training hub",
  "/tools/1rm-calculator — one-rep-max calculator",
  "/tools/workout-timer — interval and workout timer",
  "/pricing — membership",
];

const TOPICS = [
  "progressive overload done properly",
  "how to structure a training week",
  "strength training for beginners",
  "bodyweight training progressions",
  "metabolic conditioning explained",
  "AMRAP, EMOM and for-time formats compared",
  "mobility work that actually transfers to lifting",
  "warm-up design that prevents injury",
  "training with minimal equipment at home",
  "RPE: how to rate effort honestly",
  "recovery, sleep and training adaptation",
  "core training beyond crunches",
  "cardio and strength in the same week",
  "how to read your training load",
  "kettlebell fundamentals",
  "dumbbell-only full body training",
  "squat technique and common faults",
  "deadlift technique and common faults",
  "push-up progressions from zero",
  "pull-up progressions from zero",
  "training for longevity after 40",
  "returning to training after a long break",
  "training around a niggle or limitation",
  "conditioning for busy schedules: 20-minute sessions",
  "periodization for everyday athletes",
  "hybrid training: strength plus endurance",
  "why exercise selection matters more than variety",
  "tracking workouts and why logging changes results",
  "interval training methods compared",
  "glute and posterior chain training",
  "shoulder health for pressing athletes",
  "grip strength and why it matters",
  "how to pick a workout difficulty honestly",
  "deload weeks: when and how",
  "training consistency beats motivation",
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

function estimateReadTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  return `${Math.max(3, Math.ceil(words / 200))} min read`;
}

/** Keeps external links and valid internal links; strips invented ones. */
export function validateAndFixLinks(content: string): string {
  return content.replace(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
    const href = /href=["']([^"']*)["']/i.exec(attrs)?.[1];
    if (!href) return inner;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return full;
    if (VALID_PATHS.includes(href)) return full;
    if (href.startsWith("/blog/")) return full;
    return inner;
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Writes and publishes one new Fitness article. Skips silently when an article
 * was already published in the last 6 days, so a retry can never double-post.
 */
export async function runWeeklyBlogArticle(
  db: DB,
  options: {
    config?: CronJobConfig;
    trigger: "schedule" | "manual";
    force?: boolean;
    /** Optional editorial brief for an on-demand article. */
    brief?: { titleKeywords?: string; topicKeywords?: string };
  } = {
    trigger: "schedule",
  },
): Promise<BlogGenerationResult> {
  const failures: string[] = [];
  const briefTitle = options.brief?.titleKeywords?.trim() ?? "";
  const briefTopic = options.brief?.topicKeywords?.trim() ?? "";
  const hasBrief = Boolean(briefTitle || briefTopic);

  if (!options.force) {
    const sinceIso = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("blog_articles")
      .select("title, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = recent as { title?: string } | null;
    if (row?.title) {
      return {
        status: "skipped",
        changed: false,
        summary: `An article was already published this week (“${row.title}”) — nothing to write.`,
        failures,
      };
    }
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return {
      status: "failed",
      changed: false,
      summary: "Blog generation failed: AI key is not configured.",
      failures: ["missing LOVABLE_API_KEY"],
    };
  }

  // Titles from the last 90 days, so nothing is repeated or paraphrased.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: titleRows } = await db
    .from("blog_articles")
    .select("title")
    .gte("created_at", ninetyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(40);
  const recentTitles = ((titleRows as { title: string }[] | null) ?? []).map((r) => r.title);

  const extraTopics = Array.isArray(options.config?.content?.lines)
    ? (options.config?.content?.lines ?? []).map((l) => String(l).trim()).filter(Boolean)
    : [];
  const pool = [...TOPICS, ...extraTopics];
  const hints = [...pool].sort(() => Math.random() - 0.5).slice(0, 5).join(", ");

  const prompt = `You are a professional fitness content writer for SmartyWorkout, an AI-powered training platform that builds personalized workouts from a vetted exercise library. Write a comprehensive, SEO-optimized blog article for the "Fitness" category.

TOPIC INSPIRATION (pick one or combine): ${hints}
${
  recentTitles.length
    ? `\nDo NOT repeat or closely paraphrase any of these recent titles:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
    : ""
}

REQUIREMENTS:
1. Write a unique, engaging title (under 60 characters if possible)
2. Write an SEO-optimized excerpt (under 160 characters) summarizing the article
3. Write the full article body in HTML format (800-1200 words)
4. Use <h2> tags for section headings (4-6 sections)
5. Use <p> tags for paragraphs
6. Include <ul> and <li> for any lists
7. Use <strong> for emphasis on key terms
8. Include at least 3 of these internal links naturally within the content:
${SUGGESTED_LINKS.map((l) => `  ${l}`).join("\n")}
9. Make content evidence-based, citing studies or scientific principles where relevant
10. Write in a professional but accessible tone
11. Do NOT include the title as an H1 in the content — it is displayed separately

VALID INTERNAL LINKS — ONLY use links from this list. Do NOT invent or guess any URLs:
${VALID_PATHS.map((p) => `  ${p}`).join("\n")}
  /blog/[slug] — for linking to another SmartyWorkout article (only if you know the exact slug)

Any link not on this list will be removed automatically.

AUTHOR CONTEXT: Written by Haris Falas, Sports Scientist with CSCS certification and 20+ years experience.

RESPOND WITH EXACTLY THIS JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "title": "Your Article Title Here",
  "excerpt": "Your 1-sentence SEO excerpt here",
  "content": "<p>Your full HTML article content here...</p>"
}`;

  let parsed: { title: string; excerpt: string; content: string } | null = null;
  let lastFailure = "unknown error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a professional fitness blog content writer. Always respond with valid JSON only, no markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
          }),
        },
        AI_TIMEOUT_MS,
      );
      if (!res.ok) {
        lastFailure = `AI error ${res.status}`;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (json.choices?.[0]?.message?.content ?? "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
      const candidate = JSON.parse(text) as { title?: string; excerpt?: string; content?: string };
      if (!candidate.title || !candidate.content) {
        lastFailure = "AI returned an incomplete article";
        continue;
      }
      parsed = {
        title: candidate.title.trim(),
        excerpt: (candidate.excerpt || candidate.title).trim(),
        content: candidate.content,
      };
      break;
    } catch (e) {
      lastFailure = e instanceof Error ? e.message : "AI request failed";
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  if (!parsed) {
    failures.push(lastFailure);
    return {
      status: "failed",
      changed: false,
      summary: `Weekly blog article failed after 3 attempts: ${lastFailure}`,
      failures,
    };
  }

  const content = validateAndFixLinks(parsed.content);
  const slug = generateSlug(parsed.title);

  const { data: existing } = await db
    .from("blog_articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return {
      status: "skipped",
      changed: false,
      summary: `An article with the address “${slug}” already exists — nothing published.`,
      title: parsed.title,
      slug,
      failures,
    };
  }

  const readTime = estimateReadTime(content);
  const publishedAt = new Date().toISOString();

  // A cover image is part of publishing, never an optional extra: every other
  // article on /blog has one, and the cards, the hero and the social preview
  // all depend on it. No image -> nothing is published.
  let imageUrl: string;
  try {
    const { createBlogCoverImage } = await import("@/lib/cron/blog-image.server");
    imageUrl = await createBlogCoverImage(db, {
      title: parsed.title,
      excerpt: parsed.excerpt,
      slug,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "cover image failed";
    failures.push(`cover image: ${reason}`);
    return {
      status: "failed",
      changed: false,
      summary: `Article “${parsed.title}” was written but not published: its cover image could not be created (${reason}). Nothing goes live without a picture.`,
      title: parsed.title,
      slug,
      failures,
    };
  }

  const { error } = await db.from("blog_articles").insert({
    title: parsed.title,
    slug,
    category: "Fitness",
    excerpt: parsed.excerpt.slice(0, 300),
    content,
    image_url: imageUrl,
    author_name: "Haris Falas",
    author_credentials: "Sports Scientist | CSCS Certified | 20+ Years Experience",
    read_time: readTime,
    is_published: true,
    published_at: publishedAt,
  } as never);


  if (error) {
    failures.push(error.message);
    return {
      status: "failed",
      changed: false,
      summary: `Weekly blog article could not be saved: ${error.message}`,
      title: parsed.title,
      slug,
      failures,
    };
  }

  // Tell every member, in their inbox, with a link to the article.
  const notified = await notifyMembers(db, {
    title: parsed.title,
    excerpt: parsed.excerpt,
    slug,
    failures,
  });

  // Tell the administrator what was published.
  const emailed = await emailAdmin({
    recipient: blogRecipient(options.config),
    title: parsed.title,
    excerpt: parsed.excerpt,
    slug,
    readTime,
    publishedAt,
    trigger: options.trigger,
    notified,
    failures,
  });

  return {
    status: "ok",
    changed: true,
    summary: `Published “${parsed.title}” (/blog/${slug}). ${notified} member${
      notified === 1 ? "" : "s"
    } notified in their inbox; admin report ${emailed ? "emailed" : "not emailed"}.`,
    title: parsed.title,
    slug,
    notified,
    emailed,
    failures,
  };
}

/** Inserts one inbox notification per member, in bounded batches. */
async function notifyMembers(
  db: DB,
  args: { title: string; excerpt: string; slug: string; failures: string[] },
): Promise<number> {
  try {
    const { data } = await db.from("profiles").select("id").limit(MAX_NOTIFY_MEMBERS);
    const ids = ((data as { id: string }[] | null) ?? []).map((r) => r.id);
    if (!ids.length) return 0;

    const body = `${args.excerpt.slice(0, 240)} — tap “Read article” to open it.`;
    let inserted = 0;
    for (let i = 0; i < ids.length; i += NOTIFY_BATCH) {
      const rows = ids.slice(i, i + NOTIFY_BATCH).map((id) => ({
        user_id: id,
        kind: "blog",
        title: `New article: ${args.title}`,
        body,
        dedupe_key: `blog:${args.slug}`,
      }));
      // dedupe_key is uniquely indexed per user, so a re-run of the same slug
      // simply fails the insert instead of double-notifying anyone.
      const { error } = await db.from("notifications").insert(rows as never);
      if (error) {
        args.failures.push(`notify: ${error.message}`);
        break;
      }
      inserted += rows.length;
    }
    return inserted;
  } catch (e) {
    args.failures.push(`notify: ${e instanceof Error ? e.message : "failed"}`);
    return 0;
  }
}

async function emailAdmin(args: {
  recipient: string;
  title: string;
  excerpt: string;
  slug: string;
  readTime: string;
  publishedAt: string;
  trigger: "schedule" | "manual";
  notified: number;
  failures: string[];
}): Promise<boolean> {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("blog-published", args.recipient, {
      templateData: {
        title: args.title,
        excerpt: args.excerpt,
        slug: args.slug,
        url: `${SITE_BASE_URL}/blog/${args.slug}`,
        readTime: args.readTime,
        publishedAt: args.publishedAt,
        trigger: args.trigger,
        notified: args.notified,
      },
      idempotencyKey: `blog-published:${args.slug}`,
    });
    return true;
  } catch (e) {
    args.failures.push(`admin email: ${e instanceof Error ? e.message : "failed"}`);
    return false;
  }
}

