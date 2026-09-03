# Platform Fields and Official Paths — Design Specification

Date: 2026-09-04
Status: Approved in chat, pending final spec review
Branch: `feat/platform-fields-paths`

## 1. Goal

Enrich every platform in the site with two clearly separated information groups inside the platform detail page:

1. **Platform fields / subject areas** — the broad learning or professional areas available on the platform, such as AI, cybersecurity, data science, business, languages, design, health, and similar areas.
2. **Official learning paths** — only structured paths or multi-step programs that the platform itself presents as a path, career track, professional program, skill path, learning path, role-based path, professional certificate series, specialization-style path, or an equivalent official structured sequence.

The two groups must never be mixed in the UI or data model.

## 2. Source and Verification Rules

Research must be done platform by platform, starting from the platform's official website and official documentation/catalog pages.

Preferred official source page types include:

- Learning Paths
- Career Paths
- Skill Paths
- Role-based Paths
- Professional Programs
- Professional Certificates
- Specializations or structured series when officially presented as a sequence
- Subjects
- Topics
- Categories
- Skills
- Catalog

Third-party aggregators, blogs, copied catalogs, social posts, and unofficial lists must not be used as the primary source for a stored path.

A single standalone course is not an official path and must not be stored as one.

When a platform has no verifiable official paths, the `officialPaths` list remains empty and the Official Paths UI section is hidden entirely.

## 3. Platform Fields Data Model

Each platform may contain:

```json
"fields": [
  {
    "id": "artificial-intelligence",
    "name": {
      "ar": "الذكاء الاصطناعي",
      "en": "Artificial Intelligence",
      "tr": "Yapay Zekâ"
    },
    "officialUrl": "https://example.com/ai"
  }
]
```

Rules:

- `id` is a stable normalized identifier within that platform record.
- `name` must support `ar`, `en`, and `tr`.
- `officialUrl` is optional and must point to the platform's official page for that field when such a page exists.
- Duplicate or near-duplicate fields must be merged.
- Fields must describe subject/professional areas, not individual courses.

## 4. Official Paths Data Model

Each platform may contain:

```json
"officialPaths": [
  {
    "id": "data-science-professional-path",
    "officialName": "Data Science Professional Certificate",
    "name": {
      "ar": "المسار المهني لعلوم البيانات",
      "en": "Data Science Professional Certificate",
      "tr": "Veri Bilimi Profesyonel Sertifika Programı"
    },
    "type": "professional-certificate",
    "officialUrl": "https://example.com/path/data-science",
    "fieldIds": ["data-science"],
    "featured": false
  }
]
```

Supported `type` values should be intentionally limited to stable normalized values such as:

- `learning-path`
- `career-path`
- `skill-path`
- `professional-certificate`
- `professional-program`
- `specialization`
- `role-path`
- `structured-series`
- `other-official-path`

Rules:

- `officialName` preserves the official source name as published by the platform.
- `name` provides localized display labels in Arabic, English, and Turkish.
- `officialUrl` is required for every stored path and must be an official direct path/program URL whenever possible.
- `fieldIds` connects the path to one or more entries in the platform's `fields` list.
- Individual courses are excluded.
- Duplicate paths that resolve to the same official program must be stored once.

## 5. Large Catalog Rule

If a platform has 20 or fewer verified official paths, all verified paths may be shown on the platform page.

If a platform has more than 20 verified official paths:

- Store the researched set when practical.
- Display up to 20 priority paths on the platform page.
- Prioritize paths that are official, current, broadly useful, representative of the platform's main fields, and directly linkable.
- Provide a localized **View all official paths** button linking to the platform's official paths/catalog page.

The display cap is a UI rule, not a requirement to discard valid researched data.

## 6. Research Metadata

Each platform should receive research metadata so future maintenance can distinguish verified data from stale or inferred data.

Recommended structure:

```json
"pathResearch": {
  "lastVerified": "2026-09-04",
  "fieldsSourceUrl": "https://example.com/topics",
  "pathsSourceUrl": "https://example.com/paths",
  "allPathsUrl": "https://example.com/paths"
}
```

Rules:

- `lastVerified` records the most recent manual verification date for the fields/paths research.
- `fieldsSourceUrl` may be omitted if no single canonical field listing exists.
- `pathsSourceUrl` may be omitted when the platform has no official paths page.
- `allPathsUrl` is used for the View all official paths action when needed.

## 7. Platform Detail Page UI

The platform detail page should present the new sections after the core platform facts and before the existing editorial sections.

Recommended order:

1. Platform hero and actions
2. Platform facts
3. **Fields / Subject Areas**
4. **Official Paths**
5. Best For
6. Strengths
7. Limitations
8. Similar Platforms

### Fields Section

- Show a localized section title.
- Render fields as compact chips/cards.
- If a field has an `officialUrl`, the field may link to the official platform field page.
- If no fields are available, hide the section rather than showing an empty state.

### Official Paths Section

- Show a localized section title.
- Each path card shows its localized name and a small localized type label.
- Preserve the official name where helpful for clarity when the translated title differs materially.
- Each card links to the official direct path URL.
- If more than 20 are available for display, render the prioritized first 20 and a localized View all official paths action.
- If there are zero verified official paths, hide the entire section. This is an explicit product requirement.

## 8. Localization

All new user-visible labels must support Arabic, English, and Turkish through the existing content/localization system.

New UI text should include at least:

- Fields / Subject Areas
- Official Paths
- View field on official site
- View official path
- View all official paths
- Path type labels for normalized path types

Path and field names should be localized without replacing or losing the official source wording.

## 9. Existing Inline Editor Compatibility

The new data should be designed so that future inline editing can safely expose localized field/path labels and URLs without granting arbitrary JSON path editing.

The first implementation must not weaken the existing Worker allowlist or permit editing arbitrary object paths.

If inline editing for the new structures is included in the implementation, it must use stable IDs and explicit descriptor/Worker allowlist support in the same manner as existing platform fields.

## 10. Research Workflow

The research pass will iterate through every platform record currently present in `data.json`.

For each platform:

1. Open the official site/catalog.
2. Identify official subject/category/topic pages.
3. Extract and normalize the platform's broad fields.
4. Search official pages for structured paths/programs.
5. Verify that each candidate is not merely a standalone course.
6. Record direct official URLs.
7. Translate display labels into Arabic and Turkish while preserving the official English/original name.
8. Deduplicate fields and paths.
9. Record verification metadata.
10. Validate the resulting platform record against the site schema/tests.

Research should be executed in manageable batches so errors can be reviewed and corrected without risking one giant unreviewable content change.

## 11. Data Quality Rules

- Do not invent paths from a platform's ordinary course catalog.
- Do not infer a path merely because several courses share a topic.
- Do not label a standalone certificate course as a path unless the platform officially presents it as a structured multi-course program or sequence.
- Prefer direct path URLs over generic homepage URLs.
- Do not add dead, redirected-to-homepage, or obviously obsolete links when a current canonical page is available.
- Retain an empty `officialPaths` list or omit the property consistently according to the implementation schema; the renderer must treat missing and empty as equivalent.
- Do not show an empty Official Paths UI section.

## 12. Code Areas Expected to Change

Implementation is expected to touch at least:

- `data.json` — new platform fields, paths, and verification metadata
- `js/platform-detail.js` — detail-page model and rendering
- `js/content-api.js` and/or localization content — localized labels/helpers
- site CSS for field/path presentation
- content validation tests
- platform detail tests
- possibly Decap CMS schema if the new data is intended to be editable there
- possibly inline editor descriptor/Worker schema only if explicit editing support for fields/paths is added

Existing Decap OAuth and inline OAuth infrastructure are out of scope and must not be altered unless a new-field editing requirement makes a minimal safe schema extension necessary.

## 13. Testing Requirements

Tests must verify at minimum:

- fields are normalized and localized correctly
- official paths are rendered separately from fields
- a platform with no official paths has no Official Paths section
- a platform with paths renders correct official links
- the 20-item display cap is enforced without deleting stored data
- View all official paths appears only when appropriate and has a valid official URL
- missing optional research URLs do not break rendering
- invalid path entries without required direct URLs are rejected by validation
- individual platform pages still render existing facts/editorial content correctly
- Arabic, English, and Turkish labels render correctly
- current inline editor and Decap configuration tests continue to pass

## 14. Rollout Strategy

Implementation should happen on `feat/platform-fields-paths` rather than directly on `main`.

Recommended rollout:

1. Implement schema/model/UI/tests using a small representative sample of platforms.
2. Verify layout and behavior for platforms with: no paths, a few paths, and more than 20 paths.
3. Research the remaining platforms in batches.
4. Run full validation and CI after every substantial batch.
5. Review the final diff for accidental changes to existing platform data.
6. Merge to `main` only after CI and a live preview/smoke check succeed.

## 15. Success Criteria

The feature is complete when:

- every current platform has been researched against its official site for broad fields and official structured paths
- fields and official paths are stored separately
- no unsupported or invented paths are added
- platforms without official paths show no empty paths section
- large path catalogs use the 20-item presentation rule plus an official View all link
- all new content works in Arabic, English, and Turkish
- verification metadata is present for researched records
- all automated tests and deployment checks pass
- the normal public site remains stable and existing platform detail functionality is preserved
