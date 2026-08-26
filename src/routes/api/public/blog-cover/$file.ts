import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves a blog cover image from the private `blog-images` bucket under a
 * stable, non-expiring URL so it can be used in <img>, og:image and JSON-LD.
 * Read-only and public by design: the bucket holds nothing but article covers.
 */
export const Route = createFileRoute("/api/public/blog-cover/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = String(params.file ?? "");
        // No traversal, no nested paths — plain image file names only.
        if (!/^[a-z0-9][a-z0-9-]*\.(png|jpg|jpeg|webp)$/i.test(file)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("blog-images").download(file);
        if (error || !data) return new Response("Not found", { status: 404 });

        const ext = file.split(".").pop()!.toLowerCase();
        const type =
          ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": type,
            // Immutable: every upload gets a unique file name.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
