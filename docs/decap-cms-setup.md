# Decap CMS setup for Dunya Al-Dawrat

The public site remains a static GitHub Pages site. Decap CMS only edits `data.json` in this repository; the browser then reads that file with the Fetch API.

## What is already configured

- Admin page: `/admin/`
- Backend: GitHub
- Repository: `devmyskilla/devmyskilla.github.io`
- Publish branch: `main`
- Editable content file: `data.json`
- Platform fields include pricing, free-content status, certificates, free certificates, languages, links, optional verification/count data, descriptions and editorial fields.
- All current Arabic, English and Turkish `siteText` keys are generated into the CMS configuration.

## One-time authentication setup

GitHub authentication for Decap needs an OAuth server/proxy; GitHub Pages itself cannot keep an OAuth client secret.

1. Create a GitHub OAuth App in GitHub developer settings.
2. Deploy a Decap-compatible OAuth proxy. A lightweight Cloudflare Worker/serverless OAuth proxy is a suitable option.
3. Configure the OAuth App callback URL to the callback URL required by that proxy.
4. Store the GitHub OAuth client secret only in the proxy's secret/environment store. Never commit it to this repository.
5. In `admin/config.yml`, uncomment `base_url` and replace `https://YOUR-OAUTH-PROXY.example.com` with the proxy origin. Keep `auth_endpoint: auth` unless your proxy documents a different path.
6. Anyone who publishes through the GitHub backend must have push/write access to `devmyskilla/devmyskilla.github.io`.
7. After GitHub Pages deploys, open `https://devmyskilla.github.io/admin/` and sign in with GitHub.

## Editing content

Edit **النصوص والمنصات** in Decap CMS. Saving/publishing commits the changed `data.json` to `main`. GitHub Pages then redeploys the static site, and `js/data-loader.js` fetches the updated JSON on the next page load.

## Adding a new text key

If a developer adds a new key under `siteText` directly in `data.json`, regenerate the CMS field list with:

```bash
node scripts/generate-decap-config.cjs
```

CI verifies that `admin/config.yml` still matches the current `siteText` schema by running the generator with `--check`.

## Important data rules

- Use `pricingModel: free` for fully free platforms. The Arabic UI displays `مجاناً`.
- Set `freeCertificate: true` only when certificates are actually free; the Arabic UI then displays `الشهادات المجانية`.
- Leave `officialCount` or `lastVerified` empty when unknown. The site omits those facts instead of displaying an “unknown/unverified” warning.
