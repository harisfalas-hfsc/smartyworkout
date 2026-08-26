import { supabaseAdmin } from "../integrations/supabase/client.server";
import { createBlogCoverImage } from "../lib/cron/blog-image.server";

const { data } = await supabaseAdmin
  .from("blog_articles")
  .select("id,title,excerpt,slug,image_url")
  .is("image_url", null);
const rows = (data ?? []) as Array<{ id: string; title: string; excerpt: string; slug: string }>;
console.log("missing covers:", rows.map((r) => r.slug));
for (const r of rows) {
  const url = await createBlogCoverImage(supabaseAdmin as never, {
    title: r.title,
    excerpt: r.excerpt,
    slug: r.slug,
  });
  const { error } = await supabaseAdmin
    .from("blog_articles")
    .update({ image_url: url } as never)
    .eq("id", r.id);
  console.log(r.slug, url, error?.message ?? "ok");
}
