import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cover images for blog articles.
 *
 * Every article on /blog has a cover image — the listing cards, the article
 * page hero and the social preview (og:image) all read `blog_articles.image_url`.
 * A published article without a cover looks broken next to the rest of the blog,
 * so the generator treats the cover as part of publishing, not an extra.
 *
 * Images are generated with the Lovable AI Gateway, stored in the private
 * `blog-images` bucket and served through the stable public route
 * `/api/public/blog-cover/<file>` so the URL never expires and is safe to put
 * in og:image and structured data.
 */

const BUCKET = "blog-images";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";
const IMAGE_SIZE = "1536x1024";
const SITE_BASE_URL = "https://smartyworkout.com";
const IMAGE_TIMEOUT_MS = 120_000;

export const BLOG_IMAGE_BUCKET = BUCKET;

/** Public, non-expiring URL for a stored cover file. */
export function blogCoverUrl(fileName: string): string {
  return `${SITE_BASE_URL}/api/public/blog-cover/${fileName}`;
}

function coverPrompt(title: string, excerpt: string): string {
  return [
    "Editorial cover photograph for a fitness magazine article.",
    `Article title: "${title}".`,
    `Article subject: ${excerpt}`,
    "Photorealistic, cinematic, wide 3:2 composition with generous negative space.",
    "A modern, clean gym or outdoor training setting, real athletic people training with correct form,",
    "cool blue accent lighting on a dark background to match a dark-blue app theme.",
    "No text, no words, no letters, no numbers, no logos, no watermarks, no collage, no borders.",
  ].join(" ");
}

async function generateImageBytes(prompt: string, apiKey: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, n: 1, size: IMAGE_SIZE }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 402/403 are terminal (credits / policy); everything else may be retried.
      throw new Error(`image gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("image gateway returned no image data");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length < 5_000) throw new Error("image gateway returned an empty image");
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generates a cover image for an article and stores it.
 * Returns the permanent URL to put in `blog_articles.image_url`.
 * Throws when no image could be produced — the caller must not publish
 * a pictureless article.
 */
export async function createBlogCoverImage(
  db: SupabaseClient,
  args: { title: string; excerpt: string; slug: string },
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const prompt = coverPrompt(args.title, args.excerpt);
  let bytes: Uint8Array | null = null;
  let lastError = "image generation failed";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      bytes = await generateImageBytes(prompt, apiKey);
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (/ 40[23]:/.test(lastError)) break; // terminal — retrying cannot help
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  if (!bytes) throw new Error(lastError);

  const fileName = `${args.slug}-${Date.now()}.png`;
  const { error } = await db.storage.from(BUCKET).upload(fileName, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`cover upload failed: ${error.message}`);

  return blogCoverUrl(fileName);
}
