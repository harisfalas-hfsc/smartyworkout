import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { resolveBrand } from "@/lib/brand";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const brand = resolveBrand(getRequest()?.headers.get("host"));
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /api/",
          "Disallow: /checkout",
          "",
          `Sitemap: ${brand.siteUrl}/sitemap.xml`,
          `Host: ${brand.domain}`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});