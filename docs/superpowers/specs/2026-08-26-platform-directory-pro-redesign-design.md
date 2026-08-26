# Platform Directory Pro 2.0 — Design Specification

Date: 2026-08-26
Repository: `devmyskilla/devmyskilla.github.io`
Published site: `https://devmyskilla.github.io/`
Status: Approved product direction; awaiting written-spec review before implementation

## 1. Goal

Upgrade the existing platform directory into a polished, platform-first discovery product without turning it into a course catalog.

The primary visitor question becomes:

> Which learning platform best fits my field, language, budget, certificate needs, and learning style?

The current platform search, filters, favorites, recent views, comparison, recommendation quiz, and learning-path tools are preserved and improved rather than replaced.

## 2. Current Product State

The current site already includes:
- platform-first landing content,
- platform statistics,
- featured platforms,
- text search,
- language and category filters,
- free/certificate filters,
- sorting,
- favorites,
- recent views,
- comparison of up to three platforms,
- recommendation quiz,
- learning-path builder,
- Arabic, English, and Turkish UI,
- dark mode,
- PWA/offline support.

Platform records currently live in `js/data.js` and include stable IDs such as `plat-1`, multilingual descriptions, category, free/certificate flags, language, official URL, and thumbnail.

The site is published directly from the `main` branch of `devmyskilla/devmyskilla.github.io`.

## 3. Product Direction

### Chosen direction: Platform Directory Pro 2.0

Keep the existing product identity and interaction model, but make the platform directory substantially more useful, trustworthy, and visually mature.

The redesign focuses on five outcomes:
1. Faster platform discovery.
2. Better decision support.
3. Clearer data quality and verification signals.
4. Stronger platform profiles and comparison.
5. A frontend architecture that can transition from static `js/data.js` to Supabase without breaking the site.

## 4. Scope

### In scope

1. New platform-first hero with immediate search and quick filters.
2. Improved statistics using real platform metadata.
3. Visual category discovery.
4. Redesigned featured-platform section.
5. Redesigned platform cards.
6. More powerful filters and sorting.
7. Improved comparison experience for up to three platforms.
8. A dedicated platform-detail page/profile.
9. Verification metadata and official content counts where known.
10. Supabase-backed platform data as the preferred source, with `js/data.js` as a safe fallback.
11. Existing quiz, favorites, recent views, theme, languages, and PWA support retained.
12. Responsive and accessibility improvements.

### Out of scope for this iteration

- User accounts.
- Public user reviews or ratings.
- Paid subscriptions.
- AI chat assistant.
- Full course catalog ingestion.
- Automatically scraping platform descriptions in the browser.
- Removing offline support.
- Replacing the current visual identity with an unrelated brand.

## 5. Homepage Information Architecture

The homepage order becomes:

### 5.1 Header
- Brand.
- Explore platforms.
- Categories.
- Featured.
- Compare.
- Theme control.
- Language switcher.

### 5.2 Platform-first hero
Primary headline example:

**اكتشف المنصة التعليمية الأنسب لك**

Hero contents:
- one large platform search input,
- quick chips such as:
  - Free content,
  - Certificates,
  - Arabic,
  - English,
  - Technology,
  - Business,
- primary CTA: Browse platforms,
- secondary CTA: Compare platforms,
- compact trust copy explaining that platform information is source-backed where verification exists.

The existing floating/orbit platform visual may remain, but it should support the directory identity instead of dominating the section.

### 5.3 Platform statistics
Display useful platform-level stats only:
- active platforms,
- platforms with free content,
- platforms offering certificates,
- supported languages or multilingual platforms.

No fabricated aggregate counts are displayed.

### 5.4 Browse by category
Visual category cards/chips:
- Programming & Technology,
- Data & AI,
- Business & Marketing,
- Languages,
- University / Academic,
- Career & Professional Skills,
- Other only when needed by the data.

Selecting a category scrolls/focuses the directory and applies the filter.

### 5.5 Featured platforms
A curated section for a small number of platforms.

Featured does **not** mean “best” unless a formal scoring system is created later.

### 5.6 All platforms directory
The main product surface:
- search,
- filters,
- sorting,
- result count,
- platform cards,
- comparison selection,
- empty state,
- fallback/data-status indicator when Supabase is unavailable.

### 5.7 Existing recommendation utilities
The current quiz and learning-path builder remain available, but visually secondary to the directory itself.

### 5.8 Footer
Keep project/developer attribution and product identity.

## 6. Platform Card Design

Each card should show only decision-relevant information.

### Required visible fields
- platform logo,
- platform name,
- concise localized description,
- primary category,
- language(s),
- free-content state,
- certificate availability,
- official content count when verified,
- content-count unit when not literally courses,
- verification status,
- Details,
- Compare,
- Official site.

### Pricing states
Move beyond one boolean `free` when data is available:
- free,
- freemium,
- paid,
- mixed,
- unknown.

`has_free_content` remains a separate yes/no signal.

### Official count behavior
Examples:
- `1673 courses`
- `286 job simulations`
- `300+ modules`
- `Not officially confirmed`

The UI must never relabel modules, simulations, learning paths, or certificates as courses.

### Verification behavior
- verified within 30 days: Recently verified,
- older than 30 days: Verification outdated,
- no verification date: Not yet verified.

Verification must be represented by text as well as color.

## 7. Search, Filters, and Sorting

### Search
Search across:
- platform name,
- localized description,
- category,
- languages,
- useful tags/keywords when available.

### Filters
- category,
- language,
- pricing model,
- has free content,
- certificates,
- verification state,
- optional platform type when enough records have reliable values.

### Sorting
- featured/recommended first,
- name A–Z,
- recently verified,
- official content count with unknown counts placed after known counts,
- free-content availability.

The existing “viewed” sorting may remain for local personalization but should not be presented as a global popularity ranking.

## 8. Favorites, Recent Views, and Local Personalization

Keep existing local-only behavior.

Recommended storage keys remain separate by concern:
- favorites,
- recent views,
- comparison,
- theme.

No account is required.

Privacy copy should continue to explain that personal selections are stored on the device.

## 9. Platform Comparison

Users may compare up to three platforms.

### Comparison fields
- logo and name,
- category,
- pricing model,
- free content,
- certificate availability,
- languages,
- official content count + unit,
- verification date/state,
- concise “best for” summary,
- official website.

The current comparison dock/modal interaction should be retained and visually upgraded.

The comparison storage must use a platform-specific key and must not conflict with any course-oriented project.

## 10. Platform Detail Page

Add or evolve a dedicated platform profile page, preferably `platform.html?id=plat-N`.

### Hero
- logo,
- name,
- localized description,
- category,
- pricing model,
- languages,
- certificates,
- free-content signal,
- official content count,
- verification badge/date,
- official site button,
- official catalog button when different from the main site.

### Profile sections

1. **Overview**
   - what the platform is,
   - learning model / provider type when known.

2. **Best for**
   - short practical use cases.

3. **Strengths**
   - concise structured list.

4. **Limitations**
   - concise structured list.

5. **Facts**
   - pricing,
   - certificates,
   - languages,
   - count + unit,
   - last verification date,
   - official links.

6. **Optional related action**
   - if a verified course catalog exists elsewhere in the ecosystem, provide a secondary link such as “Explore courses from this platform.”
   - The page itself remains platform-first.

## 11. Data Model

### 11.1 Current fallback model
`js/data.js` remains usable as a static fallback and compatibility layer.

It should continue to support at minimum:
- `id`,
- `name`,
- localized descriptions,
- category,
- language,
- official link,
- logo/thumbnail,
- free-content flag,
- certificate flag.

### 11.2 Preferred Supabase model
Use the existing Supabase `platforms` table as the primary source when reachable.

Fields reused:
- `external_id`,
- `name`,
- `description`,
- `logo_url`,
- `official_url`,
- `catalog_url`,
- `status`,
- `expected_count`,
- `expected_count_type`,
- `last_verified`.

Fields to add/enrich as needed:
- `description_ar text`,
- `description_en text`,
- `description_tr text`,
- `category text`,
- `pricing_model text`,
- `has_free_content boolean`,
- `certificate_available boolean`,
- `languages text[]`,
- `platform_type text`,
- `best_for_ar text[]`,
- `best_for_en text[]`,
- `best_for_tr text[]`,
- `strengths_ar text[]`,
- `strengths_en text[]`,
- `strengths_tr text[]`,
- `limitations_ar text[]`,
- `limitations_en text[]`,
- `limitations_tr text[]`,
- `featured boolean not null default false`,
- `display_order integer`.

Missing editorial fields are allowed during enrichment.

## 12. Data Integrity Rules

- Do not infer an exact official count from local records.
- Do not display `0` when the actual state is unknown.
- Do not call non-course units “courses”.
- Preserve the source URL used for verification outside the UI or in supporting metadata.
- A platform can remain visible with partial data.
- Missing fields should be hidden or shown as unknown, not guessed.
- Static fallback data should not overwrite newer verified Supabase metadata.

## 13. Supabase Access and Security

The public frontend uses only a browser-safe publishable key.

Requirements:
- RLS enabled on exposed tables,
- anonymous read access limited to rows safe for public display, normally `status = 'active'`,
- no `service_role` or secret key committed to the repository,
- explicit Data API grants verified,
- no client-side writes are required for platform metadata.

If Supabase fails, the site uses static fallback data instead of becoming unusable.

## 14. Frontend Architecture

### `js/data.js`
Fallback/legacy source only once Supabase integration is active.

### New `js/platform-data.js`
Owns normalization and source selection:
- load from Supabase,
- map Supabase rows into the frontend platform shape,
- fall back to `PLATFORMS_DATA`,
- expose a single normalized platform array.

### `js/app.js`
Keeps page-level interaction wiring, but platform query/filter/sort/render logic should be extracted where practical to avoid a monolithic file.

### New `js/platform-directory.js`
Owns:
- search,
- filters,
- sorting,
- result counts,
- categories,
- featured selection,
- platform-card rendering,
- platform comparison state helpers.

### New/updated `platform.html` + `js/platform-detail.js`
Owns the platform profile view.

### `js/i18n.js`
Retains UI translations.
Database enum values stay language-neutral; labels are translated in the frontend.

## 15. Data Flow

### Homepage
1. Initialize theme and language.
2. Request active platforms from Supabase.
3. Normalize returned rows.
4. If request fails, normalize `PLATFORMS_DATA` instead.
5. Render stats, categories, featured section, and directory from the same normalized array.
6. Search/filter/sort client-side because the platform set is small.
7. Favorites/recent/comparison remain local.

### Platform detail page
1. Read `id` from URL.
2. Look up the platform in the normalized Supabase result.
3. If Supabase fails, use the matching static fallback entry.
4. If the ID does not exist, render a proper not-found state.
5. Render profile sections only when data exists.

The page must never silently default to another platform when an invalid ID is requested.

## 16. Error Handling

- Supabase unavailable: use static fallback and show a subtle source-status message.
- Invalid platform ID: dedicated not-found state.
- Missing logo: local `icon.svg` fallback.
- Broken image: swap to fallback without infinite error loops.
- Missing count: unknown state, not zero.
- Missing translation: fall back to English, then legacy description.
- Missing profile array such as strengths: hide the section.
- Invalid official URL: hide or disable the affected action.

## 17. Visual Direction

Keep the existing indigo/purple visual identity and Cairo typography, but make the directory more editorial and less generic.

### Design changes
- more deliberate spacing,
- stronger information hierarchy,
- cleaner platform cards,
- less decorative clutter in dense browsing areas,
- richer category/featured sections,
- clearer verification/status badges,
- larger official logos where appropriate,
- consistent card heights,
- polished hover/focus states,
- improved mobile controls.

Do not turn the site into a dashboard aesthetic; it should remain approachable and educational.

## 18. Responsive Design

- desktop: 3–4 platform cards per row depending on width,
- tablet: 2 cards,
- mobile: 1 card,
- filter controls collapse into a mobile-friendly panel,
- comparison dock remains usable on narrow screens,
- hero visual simplifies on mobile,
- tap targets remain comfortable.

## 19. Accessibility

- keyboard-operable search, filters, tabs, comparison, and modals,
- visible focus states,
- text labels for verification states,
- meaningful alt text for platform logos when informative,
- decorative imagery uses empty alt,
- modals preserve sensible focus behavior,
- controls have accessible names.

## 20. Performance

- platform data is small enough to load in one request,
- do not load course datasets to render platform cards,
- lazy-load below-the-fold logos,
- keep filtering client-side,
- preserve lightweight static delivery on GitHub Pages,
- PWA cache version must be bumped when production assets change.

## 21. Testing Strategy

Implementation follows test-first development for behavior changes.

Tests should cover:
- Supabase row normalization,
- fallback behavior,
- search across multilingual text,
- filters,
- sort rules,
- unknown count handling,
- unit labels (`courses`, `job_simulations`, `modules`, etc.),
- verification-state calculation,
- comparison limit of three,
- invalid platform detail ID,
- localStorage isolation,
- syntax checks for JavaScript files.

Before completion:
- run all automated tests,
- run JS syntax checks,
- run `git diff --check`,
- verify Supabase public read when integration is enabled,
- verify GitHub Pages deployment for the final commit.

## 22. Migration Strategy

Implementation should be incremental so the live site never depends on unfinished Supabase metadata.

### Phase 1 — frontend structure and normalized data layer
- create the normalized platform model,
- keep static data fallback fully functional,
- redesign hero, category discovery, cards, filters, comparison.

### Phase 2 — platform profile page
- add the rich detail view,
- preserve direct official links.

### Phase 3 — Supabase platform source
- enable Supabase reads,
- keep fallback,
- verify RLS/Data API access.

### Phase 4 — metadata enrichment
- populate verified counts, verification dates, pricing model, languages, strengths/limitations, and featured flags platform by platform.

The site remains functional between phases.

## 23. Success Criteria

The redesign is complete when:
- `https://devmyskilla.github.io/` is clearly a platform-discovery product,
- visitors can quickly search and filter the platform list,
- cards expose meaningful decision data without fabricated values,
- comparison works for up to three platforms,
- each platform has a useful detail/profile page,
- platform data can come from Supabase with a static fallback,
- Arabic, English, Turkish, dark mode, PWA, favorites, and recent views still work,
- mobile browsing is polished,
- automated verification passes,
- the final GitHub Pages deployment succeeds.
