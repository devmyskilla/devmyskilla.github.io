# Landing + Explore Split Design

Status: Approved design, awaiting written-spec review
Date: 2026-08-26
Repository: devmyskilla/devmyskilla.github.io
Branch: feat/landing-and-explore-split

## 1. Goal

Split the current single-page experience into two clear products:

1. `index.html` becomes a youthful, modern landing page that explains what Dunya Al-Dawrat is, who created it, why it exists, and how it helps students.
2. `explore.html` becomes the dedicated platform-discovery experience and retains the current search, filters, featured platforms, comparison, favorites, recent items, random platform, quiz, and learning-path tools.

The project remains a directory for discovering learning platforms, not a catalog of individual courses.

## 2. Product Positioning

Dunya Al-Dawrat is a discovery and comparison guide for learning platforms. It does not host or sell courses itself. Its purpose is to reduce student confusion by bringing platform information, filters, comparison tools, and official links into one structured experience.

The landing page should feel technical, youthful, modern, and student-oriented while still presenting Ummet Gençleri Birliği / اتحاد شباب الأمة clearly as the project developer.

## 3. Site Architecture

### `index.html` — Landing page

Responsibilities:
- Explain the project.
- Explain the student problem it solves.
- Explain why it was created.
- Present how the product works.
- Present live platform-level statistics.
- Present اتحاد شباب الأمة as the developer.
- Route users into `explore.html`.

It must not contain the full platform directory, advanced filters, favorites/recent tabs, comparison dock, quiz modal, or path-builder modal.

### `explore.html` — Platform discovery

Responsibilities:
- Own the entire existing discovery application.
- Search platforms.
- Filter by language, category, pricing, verification, free content, and certificate availability.
- Sort platforms.
- Show category groups and featured platforms.
- Support favorites and recent platforms.
- Support comparison of up to three platforms.
- Support random platform, recommendation quiz, and path builder.
- Link to `platform.html?id=...`.

### `platform.html` — Platform profile

Keep the existing profile architecture, but change navigation so that the main back action returns to `explore.html`, not `index.html#explore`.

### Legacy route compatibility

`course.html` continues redirecting legacy detail links to `platform.html` as it does now.

## 4. Landing Page Design

### 4.1 Header

Navigation:
- Home
- About / Why Dunya Al-Dawrat
- How it works
- About the developer
- Discover platforms (primary CTA)
- Language switcher
- Dark/light mode

The main CTA must link to `explore.html` and preserve the current language where practical.

### 4.2 Hero

Primary message:
- Arabic concept: “دليلك الذكي لاكتشاف أفضل منصات التعلّم”

Supporting message:
- Explain that the product helps users find and compare suitable learning platforms without wasting time moving between many websites.

Primary CTA:
- “اكتشف المنصات” → `explore.html`

Secondary CTA:
- “اعرف أكثر عن المشروع” → scroll to the project explanation section.

Visual direction:
- Youthful technical composition.
- Existing brand mark remains.
- Light platform-name motion/cloud elements are acceptable.
- Motion must respect `prefers-reduced-motion`.

### 4.3 The Problem

Present the main problems in compact visual cards:
- Too many learning platforms.
- Unclear free vs paid offerings.
- Differences in certificates and languages.
- Difficulty comparing platforms.
- Time lost researching where to learn.

No unsupported numerical claims should be added.

### 4.4 What Is Dunya Al-Dawrat?

Explain clearly that it is:
- A directory for learning platforms.
- A discovery and comparison tool.
- A bridge to official platform websites.

Explain clearly that it is not:
- A course marketplace.
- A university.
- A provider that awards its own certificates.

### 4.5 Why We Built It

Explain the project motivations:
- Reduce search fragmentation.
- Make learning opportunities easier to discover.
- Help students make better platform choices.
- Make free, certificate, language, and subject signals easier to compare.

Copy should be concise and student-centered rather than institutional marketing language.

### 4.6 How It Works

Use a five-step flow:
1. Search.
2. Filter.
3. Compare.
4. Choose.
5. Continue to the official platform.

Each step should link conceptually to the tools available in `explore.html`.

### 4.7 Live Statistics

Read platform-level statistics from the same platform data layer used by the discovery page.

Show:
- Active platform count.
- Platforms with free content.
- Platforms marked as offering certificates.
- Number of represented languages.

Do not hardcode old values such as 110.

If Supabase fails, use the existing local fallback data exactly as the discovery experience does.

### 4.8 Developer Section

Present اتحاد شباب الأمة / Ummet Gençleri Birliği as the developer of the project.

The section should explain that the project was developed to help students access and compare educational opportunities more easily.

The landing page must not become a general organization profile; the focus remains Dunya Al-Dawrat.

### 4.9 Closing CTA

Strong final message encouraging the user to start discovery.

Primary CTA:
- “ابدأ الآن واكتشف المنصة المناسبة لك” → `explore.html`

## 5. Explore Page Design

The current discovery experience moves from `index.html` into `explore.html` with minimal behavioral change.

### 5.1 Header

Navigation:
- Home → `index.html`
- Discover platforms → current page
- Compare → opens comparison modal
- Language switcher
- Theme switcher

### 5.2 Compact Discovery Hero

Use a smaller hero than the current landing-style hero.

Contains:
- “اكتشف المنصة الأنسب لك”
- Main platform search field.
- Quick filter chips.
- Optional buttons for quiz and comparison.

### 5.3 Platform Statistics

Keep the current live platform statistics near the top of the discovery page.

### 5.4 Categories

Keep category groups based on actual loaded platform data.

### 5.5 Featured Platforms

Keep featured platform cards.

### 5.6 Directory

Keep all current controls and behaviors:
- Main search.
- Language filter.
- Category filter.
- Pricing filter.
- Verification filter.
- Free-only toggle.
- Certificate toggle.
- Sorting.
- All / Favorites / Recent tabs.
- Reset.

### 5.7 Comparison

Keep the current platform comparison storage and maximum of three platforms.

Comparison remains platform-level and shows:
- Category.
- Pricing.
- Free content.
- Certificate availability.
- Languages.
- Official content count where source-backed.
- Verification state.
- Last verification date.
- Best-for field where available.
- Official site.

### 5.8 Smart Tools

Keep:
- Recommendation quiz.
- Random platform.
- Learning path builder.

These tools belong only on `explore.html`.

## 6. Shared Data Architecture

Continue using:
- `js/platform-core.js`
- `js/platform-data.js`
- `js/supabase-config.js`
- `js/i18n.js`
- `js/data.js` as fallback

The landing page must use the same normalized platform data as the explore page for statistics; it must not create a second data interpretation layer.

Recommended new separation:
- `js/landing.js` — landing-only behavior, live stats, theme/language hooks, section interactions.
- Existing discovery application logic remains in `js/app.js` initially unless implementation review shows a safe rename to `js/explore.js` is worthwhile.

Avoid duplicating platform filtering or comparison logic in `landing.js`.

## 7. Navigation and URL Rules

### From landing page
- Primary discovery CTA → `explore.html?lang=<currentLang>` when needed.

### From explore page
- Platform card → `platform.html?id=<platformId>&lang=<currentLang>`.
- Home navigation → `index.html?lang=<currentLang>`.

### From platform page
- Back action → `explore.html?lang=<currentLang>`.

### Language switching
- Preserve language when moving between the three principal pages where possible.
- Arabic remains default.

## 8. Internationalization

All new landing-page copy must support:
- Arabic.
- English.
- Turkish.

Use `js/i18n.js` for UI strings.

The landing page must preserve:
- RTL for Arabic.
- LTR for English/Turkish.

Do not hardcode Arabic-only navigation except organization brand names where intentional.

## 9. Theme and Visual System

Preserve existing design tokens and theme behavior.

Landing-specific requirements:
- Modern technical/student visual language.
- Large typography in hero.
- Spacious sections.
- Gradient/ambient visual elements allowed.
- Reuse existing brand colors.
- Avoid excessive animation.

Explore page:
- More utility-dense than landing page.
- Existing platform cards and controls remain recognizable.

Responsive targets:
- Desktop.
- Tablet.
- Mobile.

## 10. Accessibility

Maintain existing accessibility work and add the same standard to the new landing page.

Requirements:
- Visible focus states.
- Semantic headings.
- Buttons/links correctly typed.
- Theme/language controls with accessible names.
- No information conveyed by color alone.
- Motion honors reduced-motion preference.
- Modals stay on `explore.html` with current dialog semantics.

## 11. PWA and Offline Behavior

Update `sw.js` cache version.

Cache at minimum:
- `index.html`
- `explore.html`
- `platform.html`
- shared CSS
- profile CSS
- new landing CSS if separated
- shared JS
- `landing.js`
- discovery JS
- manifest/icons/offline page

Navigation remains network-first as in the current service worker.

Both landing and explore pages should remain reachable after a successful prior load when offline.

## 12. SEO and Metadata

### Landing page
Use the main project title and description focused on:
- discovering learning platforms
- comparing learning platforms
- Dunya Al-Dawrat

### Explore page
Use metadata focused on platform discovery/search.

Avoid misleading “course marketplace” language.

## 13. Compatibility and Migration

The feature must not reset or rename existing user LocalStorage data for:
- favorites
- comparison
- recent platforms
- view counts
- language
- theme

Existing platform detail URLs remain valid.

Existing comparison migration behavior remains unchanged.

## 14. Error Handling

### Landing page
If Supabase cannot load:
- use local platform fallback for live stats.
- do not block the rest of the landing page.

### Explore page
Retain current Supabase → local fallback behavior and visible source status.

### Platform page
Retain current exact-ID lookup and not-found behavior.

No page should silently redirect an invalid platform ID to a real platform.

## 15. Testing

### Landing tests
Verify:
- `index.html` contains no full directory grid or discovery modal application.
- Primary CTA points to `explore.html`.
- Landing stats use shared normalized data.
- Developer section identifies اتحاد شباب الأمة.
- All new UI strings exist for ar/en/tr.

### Explore tests
Verify:
- `explore.html` contains directory, filters, categories, featured platforms, comparison, quiz, and path tools.
- Existing platform filtering/comparison tests remain green.
- LocalStorage keys remain unchanged.

### Navigation tests
Verify:
- landing → explore.
- explore → platform.
- platform → explore.
- language query parameter is preserved.

### PWA tests
Verify:
- new cache version.
- `explore.html` and landing runtime assets are cached.

### Regression tests
Retain:
- platform-core tests.
- platform-data tests.
- platform-detail tests.
- seed tests.
- Supabase REST smoke test.
- syntax checks.
- `git diff --check`.

## 16. Rollout Order

1. Add tests for the page split and navigation.
2. Create `explore.html` from the current discovery UI.
3. Update discovery navigation and links.
4. Replace `index.html` with the new landing page.
5. Add `landing.js` and landing-specific styles.
6. Add all ar/en/tr landing strings.
7. Update `platform.html` back navigation.
8. Update service worker cache.
9. Run all regression and Supabase smoke tests.
10. Review on feature branch.
11. Merge to `main` only after green CI.
12. Verify GitHub Pages deployment.

## 17. Success Criteria

The redesign is successful when:
- A first-time visitor immediately understands what Dunya Al-Dawrat is.
- The landing page clearly states why the project exists and who developed it.
- The landing page has a clear CTA into discovery.
- The full platform directory no longer dominates the landing page.
- `explore.html` contains all current discovery functionality without feature loss.
- Favorites, recent history, comparison, theme, and language survive the split.
- Platform detail links continue working.
- Supabase remains authoritative with local fallback.
- GitHub Actions pass after the split.
- GitHub Pages deploys the new architecture successfully.
