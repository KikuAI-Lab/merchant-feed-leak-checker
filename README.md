# Merchant Feed Leak Checker

Browser-local checker for Google Merchant / Google Shopping product feeds.

Drop a Merchant feed export and, optionally, a Shopify product CSV export. The tool reports deterministic feed leaks such as missing required fields, duplicate IDs, malformed prices, unsupported availability values, invalid product or image URLs, weak product identifiers, and price or availability drift against Shopify.

## Privacy Boundary

- Runs entirely in the browser.
- No uploads, accounts, API calls, trackers, or telemetry.
- Feed rows, product names, prices, URLs, SKUs, and file names stay on the user's machine.
- Exported reports are generated locally with `Blob` downloads.

This is a static file tool. It can be hosted on GitHub Pages, Cloudflare Pages, Netlify, or any plain static server.

## Supported Inputs

- Google Merchant CSV
- Google Merchant TSV
- Google Merchant RSS/XML
- Optional Shopify product CSV or TSV export

## Checks

- Missing required Merchant fields.
- Duplicate product IDs.
- Malformed, negative, zero, or currency-less prices.
- `sale_price` greater than regular `price`.
- Unsupported `availability` values.
- Invalid product and image URLs.
- Missing or contradictory identifier groups.
- GTIN format and check-digit issues.
- Shopify comparison mismatches by SKU, handle, URL handle, or title.
- Shopify rows missing from the Merchant feed.

## Run Locally

```bash
npm test
npm run check
npm run preview
```

Then open:

```text
http://localhost:4179/
```

No install step is required for tests because the repo has no runtime dependencies.

## Reports

The UI can download:

- `merchant-feed-issues.csv`
- `merchant-feed-summary.html`
- `merchant-feed-fix-checklist.md`

## Boundaries

This tool is deterministic file triage, not a Google approval guarantee. It does not check live landing pages, policy violations, account suspensions, shipping or tax settings, ad performance, or Merchant Center account state.

Not affiliated with Google, Shopify, or Merchant Center.
