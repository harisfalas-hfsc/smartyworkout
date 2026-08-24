# Search Console + metadata fixes (background only)

No visual, layout or copy changes anywhere. Every change is in head metadata, one hidden verification tag, one heading-level swap that keeps identical styling, and one footer link.

## 1. Google Search Console setup

- Connect your Google account to the project (you approve it in chat, one click).
- Request a verification token and add the single `<meta name="google-site-verification" ...>` tag to the site's head. Invisible to visitors.
- You publish once so the tag goes live.
- Verify ownership, add `https://smartyworkout.com/` as a property, and submit `https://smartyworkout.com/sitemap.xml`.

After that, Google reports indexing, crawl errors and search queries back to us, and I can diagnose visibility directly instead of guessing.

## 2. Social preview metadata (root)

Current state: the root head has `og:site_name`, `og:title`, `og:description` and `twitter:card`, but no `og:image` and no `og:url`. The `OG_IMAGE` constant already exists and `public/og-social.jpg` is present, so the file is correct — it just isn't referenced at root level.

- Add `og:image`, `twitter:image` (using the existing `OG_IMAGE` constant) and a root `og:url` pointing at `https://smartyworkout.com/`.
- The homepage already sets its own correct `og:image`/`og:url`; leave it as is.

Result: any page shared that doesn't set its own image (about, faq, terms, training pages, tools) shows the SmartyWorkout card instead of a bare text link.

## 3. Single H1 per page

Current state: the mobile hero uses `PageHeader`, which renders an `<h1>`. The desktop hero renders its headline as a `<p>`, so the desktop layout has no `<h1>` at all, and both blocks exist in the HTML at once.

- Add an optional `as` prop to `PageHeader` (defaults to `h1`, so no other page changes).
- Homepage: desktop hero headline becomes the `<h1>` with the exact same classes; the mobile `PageHeader` is passed `as="p"`.
- Net effect: exactly one `<h1>` in the HTML, pixel-identical rendering at every breakpoint.

## 4. Title and description lengths

- Root meta description is ~165 characters; trim to under 160 without losing the Smarty Coach / Haris Falas mention.
- `exercise-library` title is 63 characters — shorten to fit under 60.
- `tools.index` title is 71 characters — shorten to fit under 60.
- Root title (55) and homepage title (55) are already fine; leave them.

These only affect what Google shows in results, not anything on the page.

## 5. Footer YouTube link

`SiteFooter.tsx` has the YouTube icon pointing at `href="#"`. A dead link on a paid product is a trust and crawl signal issue.

Two options, tell me which:
- Give me the real YouTube URL and I'll wire it in.
- Remove the YouTube icon until the channel exists (this one is a small visual change — one icon disappears — so I won't do it unless you say so).

Default if you say nothing: leave it untouched and flag it again later.

## Also checked and already correct (the SEO scan is stale, from early August)

- Homepage hero alt text already describes workout content, not food.
- The OG image file is `og-social.jpg`, not a SmartyDiet asset.
- `robots.txt` is comprehensive and correctly references the sitemap.
- Exercise library search input: adding an `aria-label` for screen readers is a zero-visual accessibility win, so I'll include it.

## Technical notes

- Files touched: `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/components/PageHeader.tsx`, `src/routes/exercise-library.tsx`, `src/routes/tools.index.tsx`.
- The verification meta tag goes in the root `head()` meta array so it is server-rendered at `/`.
- No route, canonical, sitemap, robots, JSON-LD or content changes beyond what's listed.
- Verification: full test suite plus a production build before I report back.
