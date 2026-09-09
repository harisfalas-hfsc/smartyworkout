# One app, two brands: SmartyWorkout + SmartyGym

Keep this single project and publish it on both domains. The app looks at the address the visitor typed and dresses itself accordingly. Nothing is duplicated, nothing is forked.

- `smartyworkout.com` → everything exactly as today, "Smarty Workout".
- `smartygym.com` → same design, layout, pages and logic, rebranded to "SmartyGym".

## What the visitor experiences

On smartygym.com every place the name appears becomes SmartyGym: menus, page titles, buttons, headings, body text, footer copyright, sign-in screens, browser tab titles, phone home-screen name, and the social sharing preview. Logo, app icons, splash screens and the sharing image swap to the SmartyGym versions. Homepage gets its own headline "YOUR GYM RE-IMAGINED — ANYWHERE, ANYTIME.", the new description, and the buttons "Ask your coach", "Follow Workout of the Day", "See pricing", "A note from the founder", with the same membership subline (and the free-mode variant).

Emails sent to a SmartyGym visitor come from SMARTYGYM, and system mail for that brand goes to smartygym@outlook.com. Contact form messages still land in the admin Messages tab, plus that mailbox. Addresses, sitemap, robots and the AI-crawler files served on smartygym.com use smartygym.com links.

Everything else — Coach, Workout of the Day, Logbook, Community, Progress, Training Profile, Inbox, Account, Admin, How it works, Exercise Library, Tools, Blog, Pricing, FAQ, Contact, Glossary, Training topics, About, Haris Falas, Founder note, Privacy, Terms, Disclaimer — is the same page with the brand words swapped.

## What is shared (important to accept)

One database, one member list, one admin panel, one blog, one exercise library, one community, one payment setup. A member who signs up on smartygym.com can sign in on smartyworkout.com with the same account, and shared workouts/leaderboards are common to both. Admin stays harisfalas@gmail.com via the roles table, with the membership bypass. Free/paid master switch, manual grants, billing portal and all existing behaviour apply to both brands at once.

If you ever need fully separate members, content or admin, that is the "two projects" route instead — not this one.

## How it will be built

1. **Brand definition file** — one place holding, per brand: display name, tagline, homepage headline/description/button labels, system email address, sender name, domain, logo and icon paths, social image.
2. **Brand detection** — resolved on the server from the incoming host on every page request, so the correct brand is already in the delivered page (no flicker, and correct for Google). Localhost/preview defaults to Smarty Workout; a switch is available for previewing the other brand.
3. **Replace hard-coded names** — the brand name currently appears in ~89 files (pages, emails, SEO helpers, workout copy, admin, legal). Each becomes a read from the brand definition. Workout-generation rules and internal doctrine text are brand-neutralised too, so coaching output never says the wrong name.
4. **Assets** — add SmartyGym logo, favicon, 192/512 icons, apple touch icon, splash images and og-social image; the web manifest is served per brand.
5. **Emails** — sender name, system recipient, template headers/footers and links all read the brand of the request that triggered them; scheduled jobs and alerts keep going to the mailbox you designate.
6. **SEO per domain** — canonical URLs, sitemap, robots, llms.txt / llms-full.txt and structured data all built from the requesting domain, so the two sites never claim each other's pages.
7. **Old smartygym.com addresses** — the 717 legacy URLs redirect permanently to the closest matching page, retired articles to the blog index.
8. **Connect the domain** — smartygym.com (and www) pointed at this project, then publish once; both domains update together from then on.

## Technical notes

- Brand config in `src/lib/brand.ts` (data only) plus a server resolver reading the `Host` header in the root route loader, exposed through router context and a `useBrand()` hook.
- Server-side code (emails, cron, webhooks, SEO route handlers) receives the brand explicitly; cron jobs use a configured default brand since they have no request host.
- `src/routes/__root.tsx` head, every route `head()`, `sitemap.xml`, `robots.txt`, `llms.txt`, manifest and JSON-LD become brand/host-driven.
- Assets under `src/assets/brands/smartygym/*` and `public/brands/smartygym/*`.
- No database changes; no changes to workout logic, community logic, or billing logic.

## Outstanding items carried over

- After publishing, re-verify smartygym.com in Search Console and resubmit its sitemap.
- The existing database view-permission warning is left untouched (fixing it risks the community feed).
- README stays as the historical brief; the internal email-preview sample link stays as is.
