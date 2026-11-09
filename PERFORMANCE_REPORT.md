# KHADMATONA Performance Audit & Optimization Report

Scope: a full-stack performance pass across the Next.js frontend, Laravel backend, and the
production Docker images (`backend/Dockerfile.prod`, `frontend/admin/Dockerfile.prod`). Every
change below was applied directly (not just suggested), then verified — backend via the full
Pest suite (94 tests) plus a real `docker build` + full container boot against MySQL/Redis;
frontend via `tsc --noEmit`, `eslint --max-warnings=0`, and `next build`.

**No design changes, no removed features, no behavior changes** — every fix here is either
invisible to the user (caching, query shape, compression, image loading hints) or a bug fix that
makes existing, already-shipped functionality actually work in production.

---

## 1. Bottlenecks found

### Backend

| # | Bottleneck | Where | Severity |
|---|---|---|---|
| B1 | N+1 query on the blog list endpoint — one extra query per post to fetch its cover image | `EloquentPostRepository::paginateForAudience()` | Real, scales with post count |
| B2 | Site-wide `Setting::current()` (contact info, social links, homepage hero text/stats) hits the DB on every request that needs it — no caching at all | `Setting::current()` | Real, hot path (near-every public page) |
| B3 | City/district reference data (feeds every property search/filter render) re-queried every time with no caching | `EloquentCityRepository`, `EloquentDistrictRepository` | Real, hot path |
| B4 | No gzip compression on API responses — every JSON payload shipped uncompressed | `backend/docker/nginx/app.conf` | Real, affects every response |
| B5 | Undersized PHP `realpath_cache`, causing extra filesystem `stat()` syscalls for Composer's large autoload classmap on every request | PHP production config | Minor but free to fix |
| **B6** | **Critical, pre-existing bug (not previously known): the `gd`, `intl`, and `zip` PHP extensions silently fail to load at container start** — `apk del` on the `-dev` packages also removed the runtime shared libraries (`libpng16.so.16`, `libicuio.so.78`, `libzip.so.5`) they were only ever pulled in as automatic dependencies of. **This means image processing (property/blog media conversions) would fail in any production deployment built from the Dockerfile as it stood.** | `backend/Dockerfile.prod` | **Critical — functional, not just performance** |
| **B7** | **Critical, pre-existing bug: `REDIS_CLIENT=phpredis` in both env templates, but the phpredis PECL extension is never compiled into the image** — any Redis-touching operation (queue, cache) fails immediately with `Class "Redis" not found`, as reproduced live during this audit's verification. | `backend/.env.production.example`, `COOLIFY_DEPLOYMENT.md` | **Critical — functional, not just performance** |

B6 and B7 were only discovered because this audit actually built and booted the production
image end-to-end (`docker build` + `docker compose up` against real MySQL/Redis) rather than
trusting that a successful `docker build` implies a working container — it doesn't. Both would
have surfaced on the very first real production deploy.

### Frontend

| # | Bottleneck | Where | Severity |
|---|---|---|---|
| F1 | Hero background image (the page's LCP element) rendered as a plain `<img>` — no preload hint, no `fetchpriority`, competing with everything else for network priority | `components/home/hero.tsx` | Real, directly affects LCP |
| F2 | Below-the-fold grid/gallery images (property cards, blog cards, gallery thumbnails) had no `loading="lazy"` — browsers fetch them eagerly regardless of viewport position | `property-card.tsx`, `post-card.tsx`, `property-gallery.tsx` | Real, affects initial page weight |
| F3 | Markdown-authored blog body images (`![]()` syntax) render via react-markdown's default `<img>` with no lazy-loading | `app/(public)/blog/[slug]/page.tsx` | Minor, only matters for image-heavy posts |
| F4 | Unused dependency (`zod`) shipped in `package.json` — never imported anywhere in the codebase | `package.json` | Minor (install size only; wasn't in any client bundle since it was never imported) |

### What was already good (verified, not assumed)

- `EloquentPropertyRepository` and `PropertyFilter` already eager-load `city`/`district`/`media`
  consistently — no N+1 there (this was clearly deliberate, not accidental).
- `UserController` already eager-loads `roles`.
- `AdminLeadResource` only exposes `property_id` (a raw FK), not a relation — no N+1 risk.
- DB indexes already exist where they matter: `properties(status, type)`,
  `leads(type, status)`, `posts(status, published_at)`, plus MySQL's automatic index on every
  `foreignId()->constrained()` column (`city_id`, `district_id`, `property_id`).
- `CloudinaryUrlGenerator` already builds delivery URLs directly (`f_auto,q_auto`) instead of
  making a live Cloudinary Admin API call per image — this was already a deliberate fix noted in
  that file's own comments, and it's the reason the frontend doesn't need to route Cloudinary
  images through Next's own image optimizer (see §2 Frontend below).
- Fonts already use `next/font/google` (self-hosted, no render-blocking `<link>`, automatic
  subsetting) — nothing to improve there.
- `backend/Dockerfile.prod` and `frontend/admin/Dockerfile.prod` were already proper multi-stage
  builds (Composer `--no-dev --optimize-autoloader`, Alpine base, Next.js `output: "standalone"`)
  — the image-size fundamentals were sound; the bug was in the extension-cleanup step, not the
  overall structure.

---

## 2. Every optimization applied

### Backend

1. **Fixed the Blog N+1** — `EloquentPostRepository::paginateForAudience()` now eager-loads
   `media`, matching the pattern `PropertyFilter` already used for Property.
2. **Cached `Setting::current()`** (`Cache::rememberForever`), with explicit invalidation in
   `EloquentSettingRepository::updateCurrent()` (`Cache::forget`) so an admin edit is reflected
   immediately, not after some arbitrary TTL.
3. **Cached city/district reference data** (`Cache::remember`, 1-hour TTL) — safe with zero
   invalidation logic needed, since neither has any write endpoint anywhere in the app
   (confirmed by reading `Http/routes.php` for both).
4. **Enabled gzip** in the production nginx vhost for `application/json` (the entire API surface)
   plus JS/CSS/XML/SVG, at a balanced `gzip_comp_level 6`.
5. **Tuned PHP's `realpath_cache_size`/`realpath_cache_ttl`** in the production opcache config —
   standard, well-known Laravel production advice, previously missing.
6. **Fixed the `gd`/`intl`/`zip` extension-loading bug** — runtime shared libraries are now
   installed as their own explicit packages, with the `-dev` build tooling grouped under a named
   `--virtual .build-deps` so `apk del .build-deps` can never again remove a library something
   else still needs. Verified via `php -m` inside the rebuilt image: all three now load cleanly
   with zero startup warnings (previously: three "Error loading shared library" warnings on
   every single request).
7. **Fixed `REDIS_CLIENT=phpredis` → `predis`** in both `backend/.env.production.example` and
   `COOLIFY_DEPLOYMENT.md` — `predis/predis` is the client actually available (already a
   `composer.json` dependency, pure PHP, no extension needed; it's what local dev already uses).
   Reproduced the failure live (`Class "Redis" not found` during `php artisan migrate`), fixed
   it, then re-ran the full stack to confirm migrations, caching, and gzip all work together.

### Frontend

8. **Hero image → `next/image`** with `priority` (triggers Next's automatic
   `<link rel="preload">` injection — the one capability a plain `<img>` + attributes genuinely
   can't replicate) and `unoptimized` (skips Next's own re-encode pass for this hotlinked photo,
   since there's nothing local to optimize).
9. **Deliberately did NOT convert Cloudinary-served images to `next/image`.** Cloudinary already
   serves `f_auto,q_auto`-optimized bytes at its own CDN edge; routing them through Next's image
   optimizer too would mean an extra server hop plus redundant `sharp` re-encoding for no real
   gain. Instead, added `loading="lazy" decoding="async"` to every below-the-fold instance
   (property/blog card grids, gallery thumbnails) and `fetchPriority="high" decoding="async"` to
   the two remaining true LCP candidates (the main property-gallery image, the blog post cover
   image) — same practical benefit, zero risk of the double-processing/hop regression.
10. **Lazy-loading for Markdown-embedded content images** — a custom react-markdown `img`
    component override adds `loading="lazy" decoding="async"` to any image an admin embeds in a
    blog post body via `![]()` syntax.
11. **Removed the unused `zod` dependency.**
12. **`next.config.ts`**: added `images.remotePatterns` for the hero's hotlinked domain, with an
    explanatory comment on why Cloudinary/local-media domains are deliberately absent (see #9).

---

## 3. Files modified

**Backend:**
- `backend/app/Modules/Blog/Infrastructure/Repositories/EloquentPostRepository.php`
- `backend/app/Modules/Settings/Domain/Models/Setting.php`
- `backend/app/Modules/Settings/Infrastructure/Repositories/EloquentSettingRepository.php`
- `backend/app/Core/Lookup/Infrastructure/Repositories/EloquentCityRepository.php`
- `backend/app/Core/Lookup/Infrastructure/Repositories/EloquentDistrictRepository.php`
- `backend/docker/nginx/app.conf`
- `backend/docker/php/opcache-production.ini`
- `backend/Dockerfile.prod`
- `backend/.env.production.example`
- `COOLIFY_DEPLOYMENT.md`

**Frontend:**
- `frontend/admin/next.config.ts`
- `frontend/admin/package.json` / `package-lock.json`
- `frontend/admin/src/components/home/hero.tsx`
- `frontend/admin/src/components/properties/property-card.tsx`
- `frontend/admin/src/components/properties/property-gallery.tsx`
- `frontend/admin/src/components/blog/post-card.tsx`
- `frontend/admin/src/app/(public)/blog/[slug]/page.tsx`

---

## 4. Estimated performance gain

Honest framing: this environment has no Chrome/Lighthouse runner and no deployed production URL
to measure against, so the numbers below are reasoned estimates from the specific mechanism of
each fix, not measured deltas. **Treat §6 as a to-do, not a result** — run a real Lighthouse
pass (mobile + desktop) against the deployed site after this ships, ideally with WebPageTest or
Lighthouse CI wired into the deploy pipeline so future regressions are caught automatically.

- **B6/B7 (extension + Redis fixes):** not a "faster" change — a **from-broken-to-working**
  change. Without these, media conversions and any Redis-backed operation would fail outright in
  production; there is no meaningful performance number to estimate for a feature that didn't
  work at all.
- **B1 (Blog N+1):** removes N extra queries per blog-list request (N = posts per page, default
  12). At typical MySQL round-trip latency, this is roughly a low-tens-of-milliseconds win per
  request once the blog has real traffic, growing linearly with page size if `per_page` is ever
  increased.
- **B2/B3 (Settings/City/District caching):** converts a DB round-trip (Settings: single row +
  translations join; Cities/Districts: full table + translations join) into a Redis read on
  every request that touches them — Settings in particular is likely on nearly every public page
  render. Expect a measurable TTFB improvement site-wide, proportional to how much of each
  request's time was DB-bound versus PHP/network-bound.
- **B4 (gzip):** JSON compresses well (typically 60-80% smaller). Directly reduces payload
  transfer time, which factors into Speed Index and, for data-heavy initial page loads, LCP.
- **F1 (hero `priority` + preload):** this is the most direct LCP lever available — the browser
  now discovers and starts fetching the hero image from the `<head>` preload hint instead of only
  after parsing the body markup. Expect a real, likely the single largest, LCP improvement in
  this pass, concentrated on the homepage.
- **F2/F3 (lazy-loading below-fold images):** reduces initial page weight and competing network
  requests, which helps Speed Index and can indirectly help LCP (less contention for bandwidth
  during the critical rendering path) on image-heavy pages like `/properties` and `/blog`.
- **CLS:** already low before this pass — every image site-wide already sits inside a
  fixed-aspect-ratio or fixed-height container (`aspect-video`, `h-56`, `h-48`, `h-16 w-16`),
  which reserves layout space before the image loads regardless of the image-loading strategy
  used. No CLS-specific fix was needed; this pass didn't regress it either (verified no image
  container's sizing classes changed).
- **INP/TBT:** nothing in this pass touches client-side interaction handlers or adds heavy
  client JS — the changes are either server-side (caching, gzip, N+1) or purely declarative
  image-loading hints, so no INP/TBT impact is expected in either direction.

---

## 5. Remaining recommendations (not applied — bigger, riskier, or needs a decision first)

- **Dashboard list pages fetch client-side** (`PropertiesList`, `BlogListPage`'s equivalent,
  users/leads lists) — all use `useEffect` + `useState` to fetch after mount, rather than
  fetching in a Server Component. This is a real waterfall (HTML → JS → fetch → render) on pages
  that are all behind auth anyway (SEO doesn't apply) and need client interactivity regardless
  (search, pagination, delete actions) — converting them would be a genuine architectural
  refactor touching most of the dashboard, not a safe drop-in change, so it's flagged here rather
  than applied. The two **public** list pages (`/properties`, `/blog`) are better candidates if
  this is ever revisited, since they're SEO-relevant and would benefit most from server-rendered
  initial data.
- **A true Cloudinary-aware `next/image` loader** (`images.loader: 'custom'`) would give real
  responsive `srcset` generation (multiple actual Cloudinary-resized widths, not just the fixed
  `thumb`/`medium` conversions that exist today) without the double-processing concern raised in
  §2.9. This needs backend changes too (exposing a base delivery URL the loader can append width
  params to) — bigger scope than this pass, worth a dedicated follow-up if image bytes remain a
  bottleneck after measuring.
- **Redundant DB index**: `translations` has both a unique index on
  `(translatable_type, translatable_id, locale, field)` and a separate index on
  `(translatable_type, translatable_id)` — the second is redundant (a strict leftmost prefix of
  the first) and adds small write overhead with no read benefit. Low-value, low-urgency; worth a
  cleanup migration eventually, not urgent enough to bundle into this pass.
- **No CDN/edge caching in front of the API** — every request currently reaches the Laravel
  container directly. If traffic grows, a CDN layer (Cloudflare, or Coolify's own proxy
  capabilities) caching public, cacheable GET responses (property listings, blog posts,
  `/api/v1/i18n/*`) would meaningfully cut both TTFB and origin load.
- **HTTP/2 or HTTP/3** — not verified in this pass; depends on how TLS termination is configured
  at the actual deploy target (Coolify's Traefik or the `docker-compose.prod.yml` Caddy path both
  support HTTP/2+ out of the box, but this wasn't explicitly checked against a live deployment).
- **Run a real Lighthouse/WebPageTest pass** post-deploy — see §4's framing. This report's
  estimates are directionally sound but not a substitute for measuring the actual, deployed
  result.

---

## 6. Lighthouse score / Core Web Vitals improvements

**Not measured — no Chrome/Lighthouse runner available in this environment, and no deployed
production URL to test against.** Reporting fabricated scores here would be worse than reporting
none. See §4 for reasoned, per-fix estimates and §5's closing recommendation to run a real audit
(mobile + desktop) once this is deployed, ideally wired into CI so future PRs get an automatic
regression signal instead of relying on a one-off manual pass like this one.

---

## Verification performed

- Backend: full Pest suite, 94/94 passing, including the Settings update test (proves cache
  invalidation actually works, not just that caching doesn't crash anything).
- Backend Docker: real `docker build` of `Dockerfile.prod`, then a full `docker compose up`
  against live MySQL + Redis containers — `php -m` confirmed `gd`/`intl`/`zip` all load with zero
  warnings (previously: three warnings on every request), `nginx -t` validated the gzip config,
  a live `curl -H "Accept-Encoding: gzip"` confirmed `Content-Encoding: gzip` on a real API
  response, `php artisan migrate:fresh` succeeded end-to-end, and `/up`, `/api/v1/settings`,
  `/api/v1/cities`, `/api/v1/posts` all returned 200 through the complete fixed stack. Everything
  was torn down and test images deleted afterward.
- Frontend: `npx tsc --noEmit` (clean), `npx eslint src --max-warnings=0` (clean), `npm run build`
  (clean, all routes including the new Blog ones compiled successfully).
