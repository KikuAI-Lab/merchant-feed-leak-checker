const REQUIRED_MERCHANT_FIELDS = [
  ["id", "Product ID"],
  ["title", "Title"],
  ["link", "Product link"],
  ["imageLink", "Image link"],
  ["price", "Price"],
  ["availability", "Availability"]
];

const SUPPORTED_AVAILABILITY = new Set([
  "in_stock",
  "out_of_stock",
  "preorder",
  "backorder"
]);

const SUPPORTED_CONDITIONS = new Set([
  "new",
  "used",
  "refurbished"
]);

const ISO_4217_CURRENCIES = new Set([
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BOV",
  "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHE", "CHF",
  "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUP", "CVE", "CZK",
  "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP",
  "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL",
  "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD",
  "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT",
  "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD",
  "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MXV", "MYR",
  "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN",
  "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF",
  "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD",
  "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP",
  "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "USN", "UYI", "UYU",
  "UYW", "UZS", "VED", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR",
  "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWG"
]);

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const PROMOTIONAL_TITLE_PATTERNS = [
  /\bfree shipping\b/i,
  /\b(?:\d{1,3}\s*)?%\s*off\b/i,
  /\bsale\b/i,
  /\bdiscount\b/i,
  /\blimited time\b/i,
  /\bcoupon\b/i,
  /\bpromo code\b/i
];
const IMAGE_FILE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const PAGE_FILE_EXTENSIONS = new Set([".aspx", ".htm", ".html", ".php"]);
const CANONICAL_FEED_FIELDS = [
  ["id", "id"],
  ["title", "title"],
  ["description", "description"],
  ["link", "link"],
  ["image_link", "imageLink"],
  ["price", "price"],
  ["sale_price", "salePrice"],
  ["availability", "availability"],
  ["condition", "condition"],
  ["brand", "brand"],
  ["gtin", "gtin"],
  ["mpn", "mpn"],
  ["sku", "sku"],
  ["item_group_id", "itemGroupId"],
  ["identifier_exists", "identifierExists"]
];
const AVAILABILITY_REPAIR_VALUES = new Map([
  ["available", "in_stock"],
  ["active", "in_stock"],
  ["yes", "in_stock"],
  ["true", "in_stock"],
  ["1", "in_stock"],
  ["unavailable", "out_of_stock"],
  ["sold_out", "out_of_stock"],
  ["soldout", "out_of_stock"],
  ["inactive", "out_of_stock"],
  ["no", "out_of_stock"],
  ["false", "out_of_stock"],
  ["0", "out_of_stock"],
  ["pre_order", "preorder"],
  ["preorder_available", "preorder"],
  ["back_order", "backorder"]
]);
const CONDITION_REPAIR_VALUES = new Map([
  ["brand_new", "new"],
  ["new_with_tags", "new"],
  ["new_without_tags", "new"],
  ["preowned", "used"],
  ["pre_owned", "used"],
  ["secondhand", "used"],
  ["second_hand", "used"],
  ["refurb", "refurbished"],
  ["renewed", "refurbished"]
]);

const FIELD_ALIASES = {
  id: ["id", "g:id", "item_id", "product_id"],
  title: ["title", "g:title"],
  description: ["description", "g:description"],
  link: ["link", "g:link", "product_url", "url"],
  imageLink: ["image_link", "g:image_link", "image link", "image", "image_url"],
  price: ["price", "g:price"],
  salePrice: ["sale_price", "g:sale_price", "sale price"],
  availability: ["availability", "g:availability"],
  brand: ["brand", "g:brand"],
  gtin: ["gtin", "g:gtin"],
  mpn: ["mpn", "g:mpn"],
  sku: ["sku", "variant_sku", "variant sku"],
  itemGroupId: ["item_group_id", "g:item_group_id"],
  identifierExists: ["identifier_exists", "g:identifier_exists"],
  condition: ["condition", "g:condition"]
};

const SHOPIFY_ALIASES = {
  handle: ["handle"],
  title: ["title"],
  sku: ["variant_sku", "variant sku", "sku"],
  price: ["variant_price", "variant price", "price"],
  inventoryQty: ["variant_inventory_qty", "variant inventory qty", "inventory"],
  status: ["status"],
  published: ["published"],
  variantId: ["variant_id", "variant id"],
  productUrl: ["product_url", "product url", "url", "link"]
};

export const RESULT_STATES = Object.freeze({
  PARSE_FAILED: "parse_failed",
  UNSUPPORTED_SCHEMA: "unsupported_schema",
  ZERO_ROWS: "zero_rows",
  COMPLETED_CLEAN: "completed_clean",
  COMPLETED_WITH_ISSUES: "completed_with_issues",
  COMPLETED_WITH_AMBIGUOUS_MATCHES: "completed_with_ambiguous_matches",
  TOO_LARGE: "too_large"
});

const SHOPIFY_MATCH_STATUSES = Object.freeze({
  MATCHED: "matched",
  NO_MATCH: "no_match",
  AMBIGUOUS: "ambiguous_match"
});

export function analyzeInputs({
  merchantText,
  merchantFileName = "merchant-feed.csv",
  shopifyText = "",
  shopifyFileName = "shopify-products.csv"
}) {
  const merchantParse = parseMerchantFeedWithOutcome(merchantText, merchantFileName);
  const merchantRecords = merchantParse.records;
  const shopifyRecords = shopifyText.trim()
    ? parseShopifyCsv(shopifyText, shopifyFileName)
    : [];
  const issues = merchantParse.terminal
    ? []
    : runChecks(merchantRecords, shopifyRecords);
  const outcome = buildOutcome(merchantParse, issues);
  const summary = summarize(merchantRecords, shopifyRecords, issues, outcome);

  return {
    state: outcome.state,
    outcome,
    merchantRecords,
    shopifyRecords,
    issues,
    summary
  };
}

export function parseMerchantFeed(text, fileName = "merchant-feed.csv") {
  return parseMerchantFeedWithOutcome(text, fileName).records;
}

function parseMerchantFeedWithOutcome(text, fileName = "merchant-feed.csv") {
  const source = String(fileName || "").toLowerCase();
  const trimmed = String(text || "").trim();
  const format = detectFeedFormat(trimmed, source);

  if (!trimmed) {
    return createParseOutcome({
      records: [],
      terminal: true,
      state: RESULT_STATES.ZERO_ROWS,
      reason: "empty_input",
      format,
      warnings: [createParseMessage("empty_input", "Merchant feed input is empty.")]
    });
  }

  if (format === "xml") {
    return parseMerchantXmlWithOutcome(trimmed, fileName);
  }

  const delimiter = source.endsWith(".tsv") ? "\t" : detectDelimiter(trimmed);
  const parsed = parseDelimitedData(trimmed, delimiter);
  const schema = classifyMerchantHeaders(parsed.headers);

  if (!schema.supported) {
    return createParseOutcome({
      records: [],
      terminal: true,
      state: RESULT_STATES.UNSUPPORTED_SCHEMA,
      reason: "unrecognized_headers",
      format,
      errors: [createParseMessage(
        "unrecognized_headers",
        "Merchant feed headers do not match supported Google Merchant fields.",
        { headers: parsed.headers }
      )]
    });
  }

  if (parsed.objects.length === 0) {
    return createParseOutcome({
      records: [],
      terminal: true,
      state: RESULT_STATES.ZERO_ROWS,
      reason: "header_only",
      format,
      warnings: [createParseMessage(
        "header_only",
        "Merchant feed has supported headers but no product rows.",
        { headers: parsed.headers }
      )]
    });
  }

  return createParseOutcome({
    records: parsed.objects.map((row, index) => normalizeMerchantRow(row, index + 2, fileName)),
    terminal: false,
    state: null,
    reason: "parsed",
    format
  });
}

export function parseShopifyCsv(text, fileName = "shopify-products.csv") {
  const delimiter = String(fileName || "").toLowerCase().endsWith(".tsv")
    ? "\t"
    : detectDelimiter(text);
  const objects = parseDelimitedObjects(text, delimiter);

  return objects
    .map((row, index) => normalizeShopifyRow(row, index + 2, fileName))
    .filter((record) => record.sku || record.handle || record.productUrl);
}

export function runChecks(merchantRecords, shopifyRecords = []) {
  const issues = [];
  const seenIds = new Map();
  const shopifyIndex = buildShopifyIndex(shopifyRecords);
  const hasShopifyComparison = shopifyRecords.length > 0;

  for (const record of merchantRecords) {
    for (const [fieldName, label] of REQUIRED_MERCHANT_FIELDS) {
      if (!record[fieldName] || !String(record[fieldName]).trim()) {
        issues.push(createIssue({
          severity: "blocking",
          code: "missing_required_field",
          record,
          field: fieldName,
          observed: "",
          expected: `${label} must be present`,
          message: `${label} is missing.`,
          suggestion: `Add a valid ${label.toLowerCase()} value to this feed row.`
        }));
      }
    }

    if (record.id) {
      const prior = seenIds.get(record.id);
      if (prior) {
        issues.push(createIssue({
          severity: "blocking",
          code: "duplicate_product_id",
          record,
          field: "id",
          observed: record.id,
          expected: "Product IDs must be unique within the feed",
          message: `Duplicate product ID also appears on row ${prior.sourceRow}.`,
          suggestion: "Give each product or variant a stable unique feed ID."
        }));
      } else {
        seenIds.set(record.id, record);
      }
    }

    addPriceIssues(record, record.price, "price", issues);
    addPriceIssues(record, record.salePrice, "sale_price", issues, { optional: true });
    addTextQualityIssues(record, issues);
    addConditionIssues(record, issues);

    if (record.price?.valid && record.salePrice?.valid && record.salePrice.amount > record.price.amount) {
      issues.push(createIssue({
        severity: "warning",
        code: "sale_price_above_price",
        record,
        field: "sale_price",
        observed: record.salePrice.raw,
        expected: "Sale price should not be greater than regular price",
        message: "Sale price is greater than regular price.",
        suggestion: "Check whether regular price and sale price are swapped."
      }));
    }

    if (record.availability) {
      const normalizedAvailability = normalizeAvailability(record.availability);
      if (!SUPPORTED_AVAILABILITY.has(normalizedAvailability)) {
        issues.push(createIssue({
          severity: "blocking",
          code: "unsupported_availability",
          record,
          field: "availability",
          observed: record.availability,
          expected: "in_stock, out_of_stock, preorder, or backorder",
          message: "Availability value is not supported.",
          suggestion: "Use one of the supported Google Merchant availability values."
        }));
      }
    }

    addUrlIssue(record, "link", record.link, issues);
    addUrlIssue(record, "image_link", record.imageLink, issues);
    addIdentifierIssues(record, issues);
    if (hasShopifyComparison) {
      addShopifyComparisonIssues(record, shopifyIndex, issues);
    }
  }

  if (hasShopifyComparison) {
    addShopifyRowsNotInFeedIssues(merchantRecords, shopifyRecords, shopifyIndex, issues);
  }

  return issues;
}

export function issuesToCsv(issues) {
  const headers = [
    "severity",
    "code",
    "row",
    "product_id",
    "field",
    "observed",
    "expected",
    "message",
    "suggestion",
    "evidence_source",
    "confidence",
    "match_key",
    "match_value"
  ];

  const rows = issues.map((issue) => [
    issue.severity,
    issue.code,
    issue.row,
    issue.productId,
    issue.field,
    issue.observed,
    issue.expected,
    issue.message,
    issue.suggestion,
    issue.evidenceSource,
    issue.confidence,
    issue.matchKey,
    issue.matchValue
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function buildRepairArtifacts(result) {
  const plan = buildRepairPlan(result);
  return {
    ...plan,
    fixedFeedCsv: repairPlanToFixedFeedCsv(result, plan),
    patchCsv: repairPlanToPatchCsv(plan),
    manualFixesMd: repairPlanToManualFixesMarkdown(result, plan)
  };
}

export function summaryToHtml(result) {
  const { summary, issues } = result;
  const issueRows = issues.map((issue) => `
    <tr>
      <td>${escapeHtml(issue.severity)}</td>
      <td>${escapeHtml(issue.code)}</td>
      <td>${escapeHtml(issue.row)}</td>
      <td>${escapeHtml(issue.productId)}</td>
      <td>${escapeHtml(issue.field)}</td>
      <td>${escapeHtml(issue.observed)}</td>
      <td>${escapeHtml(issue.message)}</td>
      <td>${escapeHtml(issue.suggestion)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Merchant Feed Check Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #172026; margin: 32px; line-height: 1.45; }
    h1 { font-size: 24px; margin-bottom: 6px; }
    .meta { color: #53616b; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #d8dee4; border-radius: 6px; padding: 12px; }
    .value { font-size: 24px; font-weight: 700; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #d8dee4; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; }
  </style>
</head>
<body>
  <h1>Merchant Feed Check Report</h1>
  <div class="meta">Generated locally in the browser. No feed upload is required by the checker.</div>
  <div class="grid">
    <div class="card"><div class="value">${summary.totalProducts}</div><div>Products parsed</div></div>
    <div class="card"><div class="value">${summary.totalIssues}</div><div>Total issues</div></div>
    <div class="card"><div class="value">${summary.blocking}</div><div>Blocking</div></div>
    <div class="card"><div class="value">${summary.warning}</div><div>Warnings</div></div>
  </div>
  <h2>Issue Details</h2>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Code</th>
        <th>Row</th>
        <th>Product ID</th>
        <th>Field</th>
        <th>Observed</th>
        <th>Message</th>
        <th>Suggested next step</th>
      </tr>
    </thead>
    <tbody>${issueRows}</tbody>
  </table>
</body>
</html>`;
}

function buildRepairPlan(result) {
  const merchantRecords = Array.isArray(result?.merchantRecords) ? result.merchantRecords : [];
  const issues = Array.isArray(result?.issues) ? result.issues : [];
  const recordsByRow = new Map(merchantRecords.map((record) => [record.sourceRow, record]));
  const inferredCurrency = inferSingleCurrency(merchantRecords);
  const repairs = [];
  const manual = [];

  for (const issue of issues) {
    const record = recordsByRow.get(issue.row);
    const repair = record ? safeRepairForIssue(issue, record, inferredCurrency) : null;
    if (repair) {
      repairs.push(repair);
    } else {
      manual.push(manualPatchForIssue(issue));
    }
  }

  return {
    repairs,
    manual,
    summary: {
      applied: repairs.length,
      manual: manual.length,
      autoFixableRows: new Set(repairs.map((repair) => repair.row)).size,
      manualRows: new Set(manual.map((patch) => patch.row)).size
    }
  };
}

function safeRepairForIssue(issue, record, inferredCurrency) {
  if (issue.code === "unsupported_availability") {
    const replacement = AVAILABILITY_REPAIR_VALUES.get(normalizeAvailability(record.availability));
    return replacement
      ? appliedPatch(issue, replacement, "Mapped common availability wording to a supported Google value.")
      : null;
  }

  if (issue.code === "unsupported_condition") {
    const replacement = CONDITION_REPAIR_VALUES.get(normalizeCondition(record.condition));
    return replacement
      ? appliedPatch(issue, replacement, "Mapped common condition wording to a supported Google value.")
      : null;
  }

  if (issue.code === "missing_price_currency" && inferredCurrency) {
    const replacement = priceWithCurrency(record, issue.field, inferredCurrency);
    return replacement
      ? appliedPatch(issue, replacement, `Applied inferred feed currency ${inferredCurrency}.`)
      : null;
  }

  if (issue.code === "title_too_long") {
    return appliedPatch(issue, trimText(record.title, MAX_TITLE_LENGTH), "Trimmed title to the deterministic length limit.");
  }

  if (issue.code === "description_too_long") {
    return appliedPatch(issue, trimText(record.description, MAX_DESCRIPTION_LENGTH), "Trimmed description to the deterministic length limit.");
  }

  if (issue.code === "promotional_title_text") {
    const replacement = cleanPromotionalTitle(record.title);
    return replacement && replacement !== record.title
      ? appliedPatch(issue, replacement, "Removed obvious promotional wording from the product title.")
      : null;
  }

  return null;
}

function appliedPatch(issue, replacement, reason) {
  return {
    status: "applied",
    code: issue.code,
    row: issue.row,
    productId: issue.productId,
    field: issue.field,
    observed: issue.observed,
    replacement,
    reason
  };
}

function manualPatchForIssue(issue) {
  return {
    status: "manual",
    code: issue.code,
    row: issue.row,
    productId: issue.productId,
    field: issue.field,
    observed: issue.observed,
    replacement: "",
    reason: issue.suggestion || issue.message || "Review this row manually."
  };
}

function repairPlanToFixedFeedCsv(result, plan) {
  const merchantRecords = Array.isArray(result?.merchantRecords) ? result.merchantRecords : [];
  const replacements = new Map();
  for (const repair of plan.repairs) {
    replacements.set(replacementKey(repair.row, repair.field), repair.replacement);
  }

  const rows = merchantRecords.map((record) => CANONICAL_FEED_FIELDS.map(([header, property]) => {
    const directReplacement = replacements.get(replacementKey(record.sourceRow, header));
    if (directReplacement !== undefined) {
      return directReplacement;
    }
    return recordValueForFeedField(record, property);
  }));

  return [
    CANONICAL_FEED_FIELDS.map(([header]) => header),
    ...rows
  ].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function repairPlanToPatchCsv(plan) {
  const headers = [
    "status",
    "code",
    "row",
    "product_id",
    "field",
    "observed",
    "replacement",
    "reason"
  ];
  const rows = [...plan.repairs, ...plan.manual].map((patch) => [
    patch.status,
    patch.code,
    patch.row,
    patch.productId,
    patch.field,
    patch.observed,
    patch.replacement,
    patch.reason
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function repairPlanToManualFixesMarkdown(result, plan) {
  const summary = result?.summary || {};
  const appliedRows = plan.repairs.slice(0, 10).map((patch) => (
    `- Row ${patch.row} / ${patch.productId}: ${patch.field} -> ${patch.replacement} (${patch.code})`
  ));
  const manualRows = plan.manual.slice(0, 25).map((patch) => (
    `- Row ${patch.row || "n/a"} / ${patch.productId || "unknown product"}: ${patch.reason} (${patch.code})`
  ));

  return [
    "# Merchant Feed Repair Pack",
    "",
    "Generated locally in the browser. Raw feed contents are not uploaded by this tool.",
    "",
    "## Summary",
    "",
    `- Products parsed: ${summary.totalProducts || 0}`,
    `- Total issues: ${summary.totalIssues || 0}`,
    `- Safe automatic repairs: ${plan.summary.applied}`,
    `- Manual fixes: ${plan.summary.manual}`,
    "",
    "## Safe Repairs Applied To Fixed Feed CSV",
    "",
    appliedRows.length > 0 ? appliedRows.join("\n") : "- No safe automatic repairs were available.",
    "",
    "## Manual Fixes",
    "",
    manualRows.length > 0 ? manualRows.join("\n") : "- No manual fixes are currently required.",
    "",
    "## Boundaries",
    "",
    "- The fixed feed CSV applies only deterministic safe repairs.",
    "- Review the patch CSV before replacing a production feed.",
    "- This is not a Google approval guarantee."
  ].join("\n");
}

export function summaryToFixChecklist(result) {
  const issues = result?.issues || [];
  const summary = result?.summary || {};
  const grouped = groupIssuesByCode(issues);
  const sections = Object.entries(grouped).map(([code, codeIssues]) => {
    const first = codeIssues[0];
    const examples = codeIssues.slice(0, 5)
      .map((issue) => `  - Row ${issue.row || "n/a"} / ${issue.productId || "unknown product"}: ${issue.suggestion}`)
      .join("\n");

    return [
      `## ${code}`,
      "",
      `Severity: ${first.severity}`,
      `Affected rows: ${codeIssues.length}`,
      `Rule: ${first.expected || "Deterministic local check"}`,
      "",
      "Suggested fixes:",
      examples || "  - Review the issue rows in the CSV report.",
      "",
      `Evidence source: ${first.evidenceSource || "merchant feed"}`
    ].join("\n");
  });

  const body = sections.length > 0
    ? sections.join("\n\n")
    : "No deterministic issues were found in this local check.";

  return [
    "# Merchant Feed Fix Checklist",
    "",
    "Generated locally in the browser. No feed upload is required by the checker.",
    "",
    "## Summary",
    "",
    `- Result state: ${summary.outcomeState || result?.state || "unknown"}`,
    `- Products parsed: ${summary.totalProducts || 0}`,
    `- Shopify rows: ${summary.shopifyProducts || 0}`,
    `- Total issues: ${summary.totalIssues || 0}`,
    `- Blocking: ${summary.blocking || 0}`,
    `- Warnings: ${summary.warning || 0}`,
    `- Informational: ${summary.informational || 0}`,
    "",
    body,
    "",
    "## Boundaries",
    "",
    "- This checklist is deterministic file triage, not a Google approval guarantee.",
    "- Live product pages, policy issues, account suspensions, and ad performance are not checked by this local report.",
    "- Use the CSV issue report for exact row-level fields and observed values."
  ].join("\n");
}

export function buildRepairResult(result, {
  merchantText,
  merchantFileName = "merchant-feed.csv",
  useShopifyAsSourceOfTruth = false
} = {}) {
  const format = result?.outcome?.format || detectFeedFormat(String(merchantText || "").trim(), String(merchantFileName || "").toLowerCase());
  const issues = result?.issues || [];
  const merchantRecords = result?.merchantRecords || [];
  const shopifyRecords = result?.shopifyRecords || [];

  if (format === "xml") {
    return createRepairResult({
      canAutoRepair: false,
      fixedFeedText: "",
      patches: [],
      manualIssues: issues,
      unsupportedReason: "XML automatic repair is not enabled in repair v1. Use the manual fixes report or export CSV/TSV for automatic repair."
    });
  }

  const trimmed = String(merchantText || "").trim();
  if (!trimmed || result?.outcome?.state === RESULT_STATES.UNSUPPORTED_SCHEMA || result?.outcome?.state === RESULT_STATES.PARSE_FAILED) {
    return createRepairResult({
      canAutoRepair: false,
      fixedFeedText: "",
      patches: [],
      manualIssues: issues,
      unsupportedReason: "Automatic repair needs a parsed CSV or TSV Merchant feed."
    });
  }

  const delimiter = String(merchantFileName || "").toLowerCase().endsWith(".tsv") ? "\t" : detectDelimiter(trimmed);
  const rows = parseDelimitedRows(trimmed, delimiter).filter((row) => row.some((cell) => cell.trim()));
  const headers = rows[0] || [];
  const headerIndex = buildMerchantHeaderIndex(headers);
  const repairedRows = rows.map((row) => [...row]);
  const patches = [];
  const fixedIssueKeys = new Set();
  const majorityCurrency = determineMajorityCurrency(merchantRecords);
  const shopifyIndex = shopifyRecords.length > 0 ? buildShopifyIndex(shopifyRecords) : null;

  for (const record of merchantRecords) {
    const rowIndex = record.sourceRow - 1;
    const row = repairedRows[rowIndex];
    if (!row) {
      continue;
    }

    const availabilityFix = canonicalAvailabilityForRepair(record.availability);
    if (availabilityFix && availabilityFix !== record.availability) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "availability",
        issueField: "availability",
        issueCodes: ["unsupported_availability"],
        fixedIssueKeys,
        newValue: availabilityFix,
        reason: "Normalize availability alias",
        confidence: "high"
      });
    }

    const conditionFix = CONDITION_REPAIR_VALUES.get(normalizeCondition(record.condition));
    if (conditionFix && conditionFix !== record.condition) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "condition",
        issueField: "condition",
        issueCodes: ["unsupported_condition"],
        fixedIssueKeys,
        newValue: conditionFix,
        reason: "Normalize condition alias",
        confidence: "high"
      });
    }

    const titleTrim = record.title && trimText(record.title, MAX_TITLE_LENGTH);
    if (titleTrim && titleTrim !== record.title) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "title",
        issueField: "title",
        issueCodes: ["title_too_long"],
        fixedIssueKeys,
        newValue: titleTrim,
        reason: "Trim title to deterministic length limit",
        confidence: "medium"
      });
    }

    const currentTitle = readRepairField(row, headerIndex, "title") || record.title;
    const promotionalTitle = cleanPromotionalTitle(currentTitle);
    if (promotionalTitle && promotionalTitle !== currentTitle) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "title",
        issueField: "title",
        issueCodes: ["promotional_title_text"],
        fixedIssueKeys,
        newValue: promotionalTitle,
        reason: "Remove obvious promotional title text",
        confidence: "medium"
      });
    }

    const descriptionTrim = record.description && trimText(record.description, MAX_DESCRIPTION_LENGTH);
    if (descriptionTrim && descriptionTrim !== record.description) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "description",
        issueField: "description",
        issueCodes: ["description_too_long"],
        fixedIssueKeys,
        newValue: descriptionTrim,
        reason: "Trim description to deterministic length limit",
        confidence: "medium"
      });
    }

    applyCurrencyRepair({
      patches,
      row,
      headerIndex,
      record,
      headerField: "price",
      issueField: "price",
      price: record.price,
      currency: majorityCurrency,
      fixedIssueKeys
    });

    applyCurrencyRepair({
      patches,
      row,
      headerIndex,
      record,
      headerField: "salePrice",
      issueField: "sale_price",
      price: record.salePrice,
      currency: majorityCurrency,
      fixedIssueKeys
    });

    if (useShopifyAsSourceOfTruth && shopifyIndex) {
      const match = matchShopifyRecord(record, shopifyIndex);
      if (match.status === SHOPIFY_MATCH_STATUSES.MATCHED) {
        applyShopifyRepairs({
          patches,
          row,
          headerIndex,
          record,
          shopify: match.record,
          majorityCurrency,
          fixedIssueKeys
        });
      }
    }
  }

  const manualIssues = issues.filter((issue) => !fixedIssueKeys.has(repairIssueKey(issue.code, issue.row, issue.field)));

  return createRepairResult({
    canAutoRepair: patches.length > 0,
    fixedFeedText: patches.length > 0 ? serializeDelimitedRows(repairedRows, delimiter) : "",
    patches,
    manualIssues
  });
}

function createRepairResult({
  canAutoRepair,
  fixedFeedText,
  patches,
  manualIssues,
  unsupportedReason = ""
}) {
  return {
    canAutoRepair,
    fixedFeedText,
    patches,
    patchCsv: repairPatchesToCsv(patches),
    manualIssues,
    manualFixesMarkdown: repairManualFixesToMarkdown(manualIssues, unsupportedReason),
    unsupportedReason,
    summary: {
      autoFixed: patches.length,
      manualFixes: manualIssues.length,
      unsupportedReason: unsupportedReason || ""
    }
  };
}

function buildMerchantHeaderIndex(headers) {
  const fieldToIndex = {};
  headers.forEach((header, index) => {
    const field = merchantFieldForHeader(header);
    if (field && !Object.prototype.hasOwnProperty.call(fieldToIndex, field)) {
      fieldToIndex[field] = index;
    }
  });
  return fieldToIndex;
}

function applyCurrencyRepair({
  patches,
  row,
  headerIndex,
  record,
  headerField,
  issueField,
  price,
  currency,
  fixedIssueKeys
}) {
  if (!currency || !price?.valid || price.currency || !price.raw) {
    return;
  }

  applyRepairPatch({
    patches,
    row,
    headerIndex,
    record,
    headerField,
    issueField,
    issueCodes: ["missing_price_currency"],
    fixedIssueKeys,
    newValue: formatPriceForFeed(price.amount, currency),
    reason: "Add majority currency",
    confidence: "high"
  });
}

function applyShopifyRepairs({
  patches,
  row,
  headerIndex,
  record,
  shopify,
  majorityCurrency,
  fixedIssueKeys
}) {
  if (record.price?.valid && shopify.price?.valid && Math.abs(record.price.amount - shopify.price.amount) > 0.005) {
    const currency = record.price.currency || shopify.price.currency || majorityCurrency;
    const wouldLeaveSalePriceAbovePrice = record.salePrice?.valid && record.salePrice.amount > shopify.price.amount;
    if (currency && !wouldLeaveSalePriceAbovePrice) {
      applyRepairPatch({
        patches,
        row,
        headerIndex,
        record,
        headerField: "price",
        issueField: "price",
        issueCodes: ["shopify_price_mismatch"],
        fixedIssueKeys,
        newValue: formatPriceForFeed(shopify.price.amount, currency),
        reason: "Use Shopify price as source of truth",
        confidence: "medium"
      });
    }
  }

  const feedAvailability = canonicalAvailabilityForRepair(readRepairField(row, headerIndex, "availability") || record.availability);
  if (shopify.availability && feedAvailability && feedAvailability !== shopify.availability) {
    applyRepairPatch({
      patches,
      row,
      headerIndex,
      record,
      headerField: "availability",
      issueField: "availability",
      issueCodes: ["shopify_availability_mismatch"],
      fixedIssueKeys,
      newValue: shopify.availability,
      reason: "Use Shopify availability as source of truth",
      confidence: "medium"
    });
  }
}

function applyRepairPatch({
  patches,
  row,
  headerIndex,
  record,
  headerField,
  issueField,
  issueCodes,
  fixedIssueKeys,
  newValue,
  reason,
  confidence
}) {
  const index = headerIndex[headerField];
  if (!Number.isInteger(index)) {
    return;
  }
  const oldValue = row[index] ?? "";
  if (String(oldValue) === String(newValue)) {
    return;
  }

  row[index] = String(newValue);
  patches.push({
    sourceRow: record.sourceRow,
    productId: record.id || "(missing)",
    field: issueField,
    oldValue,
    newValue,
    reason,
    confidence
  });

  for (const code of issueCodes) {
    fixedIssueKeys.add(repairIssueKey(code, record.sourceRow, issueField));
  }
}

function readRepairField(row, headerIndex, headerField) {
  const index = headerIndex[headerField];
  if (!Number.isInteger(index)) {
    return "";
  }
  return row[index] ?? "";
}

function determineMajorityCurrency(records) {
  const counts = new Map();
  for (const record of records) {
    for (const price of [record.price, record.salePrice]) {
      if (price?.valid && price.currency) {
        counts.set(price.currency, (counts.get(price.currency) || 0) + 1);
      }
    }
  }

  let winner = "";
  let winnerCount = 0;
  let tied = false;
  for (const [currency, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = currency;
      winnerCount = count;
      tied = false;
    } else if (count === winnerCount) {
      tied = true;
    }
  }

  return tied ? "" : winner;
}

function canonicalAvailabilityForRepair(value) {
  const normalized = normalizeAvailability(value);
  const aliases = {
    available: "in_stock",
    instock: "in_stock",
    in_stock: "in_stock",
    outofstock: "out_of_stock",
    out_stock: "out_of_stock",
    out_of_stock: "out_of_stock",
    soldout: "out_of_stock",
    sold_out: "out_of_stock",
    preorder: "preorder",
    pre_order: "preorder",
    backorder: "backorder",
    back_order: "backorder"
  };
  return aliases[normalized] || "";
}

function formatPriceForFeed(amount, currency) {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function repairPatchesToCsv(patches) {
  const headers = [
    "source_row",
    "product_id",
    "field",
    "old_value",
    "new_value",
    "reason",
    "confidence"
  ];
  const rows = patches.map((patch) => [
    patch.sourceRow,
    patch.productId,
    patch.field,
    patch.oldValue,
    patch.newValue,
    patch.reason,
    patch.confidence
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function repairManualFixesToMarkdown(manualIssues, unsupportedReason = "") {
  const lines = [
    "# Merchant Feed Manual Fixes",
    "",
    "Generated locally in the browser. No feed upload is required by the repair tool.",
    ""
  ];

  if (unsupportedReason) {
    lines.push("## Automatic Repair Not Available", "", unsupportedReason, "");
  }

  if (manualIssues.length === 0) {
    lines.push("No manual fixes remain after deterministic auto-repair.");
  } else {
    lines.push("## Needs Review", "");
    for (const issue of manualIssues) {
      lines.push(
        `- Row ${issue.row || "n/a"} / ${issue.productId || "unknown product"} / ${issue.code}: ${issue.suggestion || issue.message || "Review this issue manually."}`
      );
    }
  }

  lines.push(
    "",
    "## Boundaries",
    "",
    "- Auto-repair is conservative and deterministic.",
    "- Duplicate IDs, missing IDs, malformed prices, invalid URLs, invalid GTINs, and sale-price-above-price issues require review.",
    "- XML automatic repair is intentionally disabled in v1."
  );

  return lines.join("\n");
}

function serializeDelimitedRows(rows, delimiter) {
  return rows.map((row) => row.map((cell) => delimitedEscape(cell, delimiter)).join(delimiter)).join("\n");
}

function delimitedEscape(value, delimiter) {
  const stringValue = String(value ?? "");
  if (stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r") || stringValue.includes(delimiter)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function repairIssueKey(code, row, field) {
  return `${code}:${row}:${field}`;
}

export function summarize(merchantRecords, shopifyRecords, issues, outcome = null) {
  const countsByCode = {};
  for (const issue of issues) {
    countsByCode[issue.code] = (countsByCode[issue.code] || 0) + 1;
  }
  const shopifySummary = summarizeShopifyComparison(merchantRecords, shopifyRecords, outcome);

  return {
    totalProducts: merchantRecords.length,
    shopifyProducts: shopifyRecords.length,
    totalIssues: issues.length,
    blocking: issues.filter((issue) => issue.severity === "blocking").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    informational: issues.filter((issue) => issue.severity === "informational").length,
    countsByCode,
    shopifyMatched: shopifySummary.shopifyMatched,
    shopifyUnmatched: shopifySummary.shopifyUnmatched,
    shopifyAmbiguousMatches: shopifySummary.shopifyAmbiguousMatches,
    merchantUnmatchedInShopify: shopifySummary.merchantUnmatchedInShopify,
    shopifyRowsNotInFeed: shopifySummary.shopifyRowsNotInFeed,
    outcomeState: outcome?.state || null,
    parseErrors: outcome?.errors?.length || 0,
    parseWarnings: outcome?.warnings?.length || 0
  };
}

function buildOutcome(merchantParse, issues) {
  if (merchantParse.terminal) {
    return {
      state: merchantParse.state,
      reason: merchantParse.reason,
      format: merchantParse.format,
      errors: merchantParse.errors,
      warnings: merchantParse.warnings
    };
  }

  return {
    state: determineCompletedState(issues),
    reason: "analysis_completed",
    format: merchantParse.format,
    errors: [],
    warnings: []
  };
}

function determineCompletedState(issues) {
  if (issues.some((issue) => [
    "shopify_ambiguous_match",
    "ambiguous_shopify_match"
  ].includes(issue.code))) {
    return RESULT_STATES.COMPLETED_WITH_AMBIGUOUS_MATCHES;
  }

  if (issues.length > 0) {
    return RESULT_STATES.COMPLETED_WITH_ISSUES;
  }

  return RESULT_STATES.COMPLETED_CLEAN;
}

function createParseOutcome({
  records,
  terminal,
  state,
  reason,
  format,
  errors = [],
  warnings = []
}) {
  return {
    records,
    terminal,
    state,
    reason,
    format,
    errors,
    warnings
  };
}

function createParseMessage(code, message, details = {}) {
  return {
    code,
    message,
    details
  };
}

function detectFeedFormat(trimmed, source) {
  if (source.endsWith(".xml") || trimmed.startsWith("<")) {
    return "xml";
  }
  if (source.endsWith(".tsv")) {
    return "tsv";
  }
  return "delimited";
}

function parseMerchantXmlWithOutcome(text, fileName) {
  const parseError = getXmlParseError(text);
  if (parseError) {
    return createParseOutcome({
      records: [],
      terminal: true,
      state: RESULT_STATES.PARSE_FAILED,
      reason: "malformed_xml",
      format: "xml",
      errors: [createParseMessage("malformed_xml", parseError)]
    });
  }

  const records = parseMerchantXml(text, fileName);
  if (records.length > 0) {
    return createParseOutcome({
      records,
      terminal: false,
      state: null,
      reason: "parsed",
      format: "xml"
    });
  }

  if (hasMerchantXmlContainer(text)) {
    return createParseOutcome({
      records: [],
      terminal: true,
      state: RESULT_STATES.ZERO_ROWS,
      reason: "xml_no_items",
      format: "xml",
      warnings: [createParseMessage("xml_no_items", "Merchant XML feed has no item or entry rows.")]
    });
  }

  return createParseOutcome({
    records: [],
    terminal: true,
    state: RESULT_STATES.UNSUPPORTED_SCHEMA,
    reason: "xml_unsupported_schema",
    format: "xml",
    errors: [createParseMessage(
      "xml_unsupported_schema",
      "XML input does not contain supported Merchant feed item or entry rows."
    )]
  });
}

function classifyMerchantHeaders(headers) {
  const fields = new Set();
  for (const header of headers) {
    const field = merchantFieldForHeader(header);
    if (field) {
      fields.add(field);
    }
  }

  return {
    supported: fields.size > 0,
    fields: [...fields]
  };
}

function merchantFieldForHeader(header) {
  const normalizedHeader = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.map(normalizeHeader).includes(normalizedHeader)) {
      return field;
    }
  }
  return "";
}

function parseDelimitedObjects(text, delimiter) {
  return parseDelimitedData(text, delimiter).objects;
}

function parseDelimitedData(text, delimiter) {
  const rows = parseDelimitedRows(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) {
    return {
      rows: [],
      headers: [],
      objects: []
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const objects = rows.slice(1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });
    return object;
  });

  return {
    rows,
    headers,
    objects
  };
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function detectDelimiter(text) {
  const firstLine = String(text || "").split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", "\t", ";"];
  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function getXmlParseError(text) {
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const document = parser.parseFromString(text, "application/xml");
    const parserError = document.querySelector("parsererror");
    return parserError ? "XML could not be parsed as well-formed XML." : "";
  }

  return findXmlWellFormednessError(text);
}

function findXmlWellFormednessError(text) {
  const withoutComments = String(text || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  const stack = [];
  const tagPattern = /<([^<>]+)>/g;
  let sawTag = false;
  let cursor = 0;
  let match = tagPattern.exec(withoutComments);

  while (match) {
    sawTag = true;
    const betweenTags = withoutComments.slice(cursor, match.index);
    if (betweenTags.includes("<")) {
      return "XML contains a malformed tag.";
    }

    const content = match[1].trim();
    if (!content) {
      return "XML contains an empty tag.";
    }

    if (!content.startsWith("!") && !content.startsWith("?")) {
      if (content.startsWith("/")) {
        const closingName = xmlTagName(content.slice(1));
        const openingName = stack.pop();
        if (!openingName) {
          return `XML contains an unexpected closing tag </${closingName}>.`;
        }
        if (openingName !== closingName) {
          return `XML closing tag </${closingName}> does not match <${openingName}>.`;
        }
      } else if (!content.endsWith("/")) {
        stack.push(xmlTagName(content));
      }
    }

    cursor = tagPattern.lastIndex;
    match = tagPattern.exec(withoutComments);
  }

  if (!sawTag) {
    return "XML does not contain tags.";
  }

  if (withoutComments.slice(cursor).includes("<")) {
    return "XML contains an incomplete tag.";
  }

  if (stack.length > 0) {
    return `XML has an unclosed <${stack[stack.length - 1]}> tag.`;
  }

  return "";
}

function xmlTagName(content) {
  return String(content || "")
    .trim()
    .replace(/\/$/, "")
    .split(/\s+/)[0]
    .toLowerCase();
}

function hasMerchantXmlContainer(text) {
  return /<(rss|feed|channel)\b/i.test(text);
}

function parseMerchantXml(text, fileName) {
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const document = parser.parseFromString(text, "application/xml");
    if (!document.querySelector("parsererror")) {
      const nodes = [
        ...Array.from(document.getElementsByTagName("item")),
        ...Array.from(document.getElementsByTagName("entry"))
      ];
      if (nodes.length > 0) {
        return nodes.map((node, index) => normalizeMerchantRow(xmlNodeToRow(node), index + 1, fileName));
      }
    }
  }

  return parseMerchantXmlFallback(text, fileName);
}

function xmlNodeToRow(node) {
  return {
    id: getXmlText(node, ["g:id", "id"]),
    title: getXmlText(node, ["g:title", "title"]),
    description: getXmlText(node, ["g:description", "description"]),
    link: getXmlText(node, ["g:link", "link"]),
    image_link: getXmlText(node, ["g:image_link", "image_link"]),
    price: getXmlText(node, ["g:price", "price"]),
    sale_price: getXmlText(node, ["g:sale_price", "sale_price"]),
    availability: getXmlText(node, ["g:availability", "availability"]),
    brand: getXmlText(node, ["g:brand", "brand"]),
    gtin: getXmlText(node, ["g:gtin", "gtin"]),
    mpn: getXmlText(node, ["g:mpn", "mpn"]),
    item_group_id: getXmlText(node, ["g:item_group_id", "item_group_id"]),
    identifier_exists: getXmlText(node, ["g:identifier_exists", "identifier_exists"]),
    condition: getXmlText(node, ["g:condition", "condition"])
  };
}

function getXmlText(node, names) {
  for (const name of names) {
    const exact = node.getElementsByTagName(name)[0];
    if (exact && exact.textContent) {
      return exact.textContent.trim();
    }

    const localName = name.includes(":") ? name.split(":").pop() : name;
    const byNamespace = node.getElementsByTagNameNS("*", localName)[0];
    if (byNamespace && byNamespace.textContent) {
      return byNamespace.textContent.trim();
    }
  }
  return "";
}

function parseMerchantXmlFallback(text, fileName) {
  const blocks = [...text.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  return blocks.map((match, index) => {
    const block = match[2];
    const row = {
      id: extractXmlTag(block, ["g:id", "id"]),
      title: extractXmlTag(block, ["g:title", "title"]),
      description: extractXmlTag(block, ["g:description", "description"]),
      link: extractXmlTag(block, ["g:link", "link"]),
      image_link: extractXmlTag(block, ["g:image_link", "image_link"]),
      price: extractXmlTag(block, ["g:price", "price"]),
      sale_price: extractXmlTag(block, ["g:sale_price", "sale_price"]),
      availability: extractXmlTag(block, ["g:availability", "availability"]),
      brand: extractXmlTag(block, ["g:brand", "brand"]),
      gtin: extractXmlTag(block, ["g:gtin", "gtin"]),
      mpn: extractXmlTag(block, ["g:mpn", "mpn"]),
      item_group_id: extractXmlTag(block, ["g:item_group_id", "item_group_id"]),
      identifier_exists: extractXmlTag(block, ["g:identifier_exists", "identifier_exists"]),
      condition: extractXmlTag(block, ["g:condition", "condition"])
    };
    return normalizeMerchantRow(row, index + 1, fileName);
  });
}

function extractXmlTag(block, names) {
  for (const name of names) {
    const escaped = name.replace(":", "\\:");
    const pattern = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
    const match = block.match(pattern);
    if (match) {
      return decodeEntities(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
    }
  }
  return "";
}

function normalizeMerchantRow(row, sourceRow, sourceFile) {
  const normalized = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    normalized[field] = coalesce(row, aliases);
  }

  return {
    sourceRow,
    sourceFile,
    raw: row,
    id: normalized.id,
    title: normalized.title,
    description: normalized.description,
    link: normalized.link,
    imageLink: normalized.imageLink,
    price: parsePrice(normalized.price),
    salePrice: parsePrice(normalized.salePrice),
    availability: normalized.availability,
    brand: normalized.brand,
    gtin: normalized.gtin,
    mpn: normalized.mpn,
    sku: normalized.sku,
    itemGroupId: normalized.itemGroupId,
    identifierExists: normalized.identifierExists,
    condition: normalized.condition
  };
}

function normalizeShopifyRow(row, sourceRow, sourceFile) {
  const rawPrice = coalesce(row, SHOPIFY_ALIASES.price);
  const inventoryRaw = coalesce(row, SHOPIFY_ALIASES.inventoryQty);
  const inventoryNumber = inventoryRaw === "" ? null : Number(inventoryRaw);
  let availability = "";

  if (Number.isFinite(inventoryNumber)) {
    availability = inventoryNumber > 0 ? "in_stock" : "out_of_stock";
  }

  return {
    sourceRow,
    sourceFile,
    raw: row,
    handle: coalesce(row, SHOPIFY_ALIASES.handle),
    title: coalesce(row, SHOPIFY_ALIASES.title),
    sku: coalesce(row, SHOPIFY_ALIASES.sku),
    price: parsePrice(rawPrice),
    inventoryQty: inventoryRaw,
    availability,
    status: coalesce(row, SHOPIFY_ALIASES.status),
    published: coalesce(row, SHOPIFY_ALIASES.published),
    variantId: coalesce(row, SHOPIFY_ALIASES.variantId),
    productUrl: coalesce(row, SHOPIFY_ALIASES.productUrl)
  };
}

function addPriceIssues(record, price, field, issues, options = {}) {
  if (options.optional && !price.raw) {
    return;
  }

  if (!price.raw) {
    return;
  }

  if (!price.valid) {
    issues.push(createIssue({
      severity: "blocking",
      code: "malformed_price",
      record,
      field,
      observed: price.raw,
      expected: "Numeric amount with optional ISO currency, for example 19.99 USD",
      message: "Price value is malformed.",
      suggestion: "Use a numeric price and include an ISO currency where possible."
    }));
    return;
  }

  if (price.amount < 0) {
    issues.push(createIssue({
      severity: "blocking",
      code: "negative_price",
      record,
      field,
      observed: price.raw,
      expected: "Price must not be negative",
      message: "Price is negative.",
      suggestion: "Replace the value with the correct product price."
    }));
  } else if (price.amount === 0) {
    issues.push(createIssue({
      severity: "warning",
      code: "zero_price",
      record,
      field,
      observed: price.raw,
      expected: "Price is usually greater than zero",
      message: "Price is zero.",
      suggestion: "Confirm that this is an intentional free product."
    }));
  }

  if (!price.currency) {
    issues.push(createIssue({
      severity: "warning",
      code: "missing_price_currency",
      record,
      field,
      observed: price.raw,
      expected: "ISO currency code such as USD or EUR",
      message: "Price has no currency code.",
      suggestion: "Include a currency code in the feed price value."
    }));
  } else if (!ISO_4217_CURRENCIES.has(price.currency)) {
    issues.push(createIssue({
      severity: "blocking",
      code: "unsupported_price_currency",
      record,
      field,
      observed: price.raw,
      expected: "ISO 4217 currency code such as USD, EUR, GBP, CAD, AUD, or UAH",
      message: "Price currency code is not recognized as ISO 4217.",
      suggestion: "Replace the currency with the correct three-letter ISO 4217 code for this feed target."
    }));
  }
}

function addTextQualityIssues(record, issues) {
  const titleLength = characterLength(record.title);
  if (titleLength > MAX_TITLE_LENGTH) {
    issues.push(createIssue({
      severity: "warning",
      code: "title_too_long",
      record,
      field: "title",
      observed: `${titleLength} characters`,
      expected: `Title should be ${MAX_TITLE_LENGTH} characters or fewer`,
      message: "Title exceeds the common Google Merchant title length limit.",
      suggestion: "Shorten the product title while keeping the product type, brand, and key variant details."
    }));
  }

  const descriptionLength = characterLength(record.description);
  if (descriptionLength > MAX_DESCRIPTION_LENGTH) {
    issues.push(createIssue({
      severity: "warning",
      code: "description_too_long",
      record,
      field: "description",
      observed: `${descriptionLength} characters`,
      expected: `Description should be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
      message: "Description exceeds the common Google Merchant description length limit.",
      suggestion: "Trim the description to product facts that help matching and approval."
    }));
  }

  const promotionalPhrase = findPromotionalTitlePhrase(record.title);
  if (promotionalPhrase) {
    issues.push(createIssue({
      severity: "warning",
      code: "promotional_title_text",
      record,
      field: "title",
      observed: promotionalPhrase,
      expected: "Product title without promotional claims",
      message: "Title contains promotional text that can cause product-data quality issues.",
      suggestion: "Move promotion, sale, or shipping claims out of the title and keep the title factual."
    }));
  }

  if (hasExcessiveTitleCapitals(record.title)) {
    issues.push(createIssue({
      severity: "warning",
      code: "excessive_title_capitals",
      record,
      field: "title",
      observed: "mostly uppercase title",
      expected: "Normal product-title capitalization",
      message: "Title appears to use excessive capitalization.",
      suggestion: "Use normal capitalization unless the uppercase text is an actual brand or model identifier."
    }));
  }
}

function addConditionIssues(record, issues) {
  if (!record.condition) {
    issues.push(createIssue({
      severity: "warning",
      code: "missing_condition",
      record,
      field: "condition",
      observed: "",
      expected: "new, used, or refurbished",
      message: "Product condition is missing.",
      suggestion: "Add condition when the product feed target requires it; use new, used, or refurbished."
    }));
    return;
  }

  const normalizedCondition = normalizeCondition(record.condition);
  if (!SUPPORTED_CONDITIONS.has(normalizedCondition)) {
    issues.push(createIssue({
      severity: "blocking",
      code: "unsupported_condition",
      record,
      field: "condition",
      observed: record.condition,
      expected: "new, used, or refurbished",
      message: "Product condition value is not supported.",
      suggestion: "Use one of the supported Google Merchant condition values."
    }));
  }
}

function addUrlIssue(record, field, value, issues) {
  if (!value) {
    return;
  }

  const url = parseHttpUrl(value);
  if (!url) {
    issues.push(createIssue({
      severity: "blocking",
      code: "invalid_url",
      record,
      field,
      observed: value,
      expected: "Absolute http or https URL",
      message: `${field} is not a valid absolute URL.`,
      suggestion: "Use a full product or image URL starting with http:// or https://."
    }));
    return;
  }

  if (field === "link" && hasImageFileExtension(url.pathname)) {
    issues.push(createIssue({
      severity: "warning",
      code: "product_link_points_to_image",
      record,
      field,
      observed: value,
      expected: "Product landing page URL",
      message: "Product link appears to point directly to an image file.",
      suggestion: "Use the product landing page URL for link and keep image files in image_link."
    }));
  }

  if (field === "image_link" && hasPageFileExtension(url.pathname)) {
    issues.push(createIssue({
      severity: "warning",
      code: "image_link_points_to_page",
      record,
      field,
      observed: value,
      expected: "Direct image asset URL",
      message: "Image link appears to point to a web page instead of an image asset.",
      suggestion: "Use a direct product image URL for image_link."
    }));
  }
}

function addIdentifierIssues(record, issues) {
  const identifierExists = normalizeBoolean(record.identifierExists);
  const hasIdentifierValue = Boolean(record.brand || record.gtin || record.mpn);

  if (identifierExists === false && hasIdentifierValue) {
    issues.push(createIssue({
      severity: "blocking",
      code: "identifier_exists_contradiction",
      record,
      field: "identifier_exists",
      observed: `identifier_exists=${record.identifierExists} with identifier values present`,
      expected: "identifier_exists=no only when brand, GTIN, and MPN are all absent",
      message: "identifier_exists contradicts the provided product identifiers.",
      suggestion: "Remove identifier_exists=no or remove the identifier values if this product truly has no identifiers."
    }));
  }

  if (identifierExists === false && !hasIdentifierValue) {
    return;
  }

  if (!hasIdentifierValue) {
    issues.push(createIssue({
      severity: "warning",
      code: "missing_identifier_group",
      record,
      field: "brand/gtin/mpn",
      observed: "",
      expected: "At least one stable product identifier group when applicable",
      message: "Brand, GTIN, and MPN are all missing.",
      suggestion: "Add brand plus GTIN/MPN when the product has manufacturer identifiers."
    }));
  }

  if (record.gtin && !isValidGtin(record.gtin)) {
    issues.push(createIssue({
      severity: "warning",
      code: "invalid_gtin",
      record,
      field: "gtin",
      observed: record.gtin,
      expected: "Valid GTIN-8, GTIN-12, GTIN-13, or GTIN-14 digits",
      message: "GTIN does not pass a deterministic format/check-digit test.",
      suggestion: "Verify the GTIN against the product packaging or source catalog."
    }));
  }
}

function addShopifyComparisonIssues(record, shopifyIndex, issues) {
  const match = matchShopifyRecord(record, shopifyIndex);

  if (match.status === SHOPIFY_MATCH_STATUSES.AMBIGUOUS) {
    issues.push(createIssue({
      severity: "warning",
      code: "shopify_ambiguous_match",
      record,
      field: "shopify_match",
      observed: `${match.key}=${match.value} matched Shopify rows ${shopifyRowsLabel(match.records)}`,
      expected: "Exactly one Shopify row should match each merchant feed row",
      message: `Shopify comparison is ambiguous for ${match.key}; duplicate Shopify rows match this feed row.`,
      suggestion: "Deduplicate the Shopify export key or compare the rows manually before trusting price or availability drift.",
      evidenceSource: `merchant feed + Shopify rows ${shopifyRowsLabel(match.records)}`,
      confidence: match.confidence,
      matchKey: match.key,
      matchValue: match.value
    }));
    return;
  }

  if (match.status === SHOPIFY_MATCH_STATUSES.NO_MATCH) {
    if (match.attemptedKeys.length > 0) {
      issues.push(createIssue({
        severity: "informational",
        code: "merchant_product_not_in_shopify",
        record,
        field: "shopify_match",
        observed: match.attemptedKeys.join("; "),
        expected: "A deterministic Shopify CSV match by SKU, variant ID, handle, or URL handle",
        message: "No deterministic Shopify CSV row matched this merchant feed row.",
        suggestion: "Confirm whether the feed ID/SKU/handle scheme matches the Shopify export before treating this as a missing product.",
        evidenceSource: "merchant feed + Shopify CSV",
        confidence: "medium",
        matchKey: "none",
        matchValue: ""
      }));
    }
    return;
  }

  const shopify = match.record;

  if (record.price?.valid && shopify.price?.valid && Math.abs(record.price.amount - shopify.price.amount) > 0.005) {
    issues.push(createIssue({
      severity: "warning",
      code: "shopify_price_mismatch",
      record,
      field: "price",
      observed: `${record.price.raw} vs Shopify ${shopify.price.raw}`,
      expected: "Feed price should match the storefront export for the matched product",
      message: `Feed price differs from Shopify export matched by ${match.key}.`,
      suggestion: "Check whether the feed is stale or the Shopify export contains the newer price.",
      evidenceSource: `merchant feed + Shopify row ${shopify.sourceRow}`,
      confidence: match.confidence,
      matchKey: match.key,
      matchValue: match.value
    }));
  }

  const feedAvailability = normalizeAvailability(record.availability);
  if (SUPPORTED_AVAILABILITY.has(feedAvailability) && shopify.availability && feedAvailability !== shopify.availability) {
    issues.push(createIssue({
      severity: "warning",
      code: "shopify_availability_mismatch",
      record,
      field: "availability",
      observed: `${record.availability} vs Shopify ${shopify.availability}`,
      expected: "Feed availability should match deterministic Shopify inventory status",
      message: `Feed availability differs from Shopify export matched by ${match.key}.`,
      suggestion: "Check whether the feed is stale or inventory handling differs for this product.",
      evidenceSource: `merchant feed + Shopify row ${shopify.sourceRow}`,
      confidence: match.confidence,
      matchKey: match.key,
      matchValue: match.value
    }));
  }
}

function addShopifyRowsNotInFeedIssues(merchantRecords, shopifyRecords, shopifyIndex, issues) {
  const shopifySummary = summarizeShopifyComparison(merchantRecords, shopifyRecords, null, shopifyIndex);

  for (const shopify of shopifySummary.shopifyRowsNotInFeedRecords) {
    const identity = shopifyIdentity(shopify);
    issues.push(createIssue({
      severity: "informational",
      code: "shopify_product_not_in_feed",
      record: {
        sourceRow: shopify.sourceRow,
        sourceFile: shopify.sourceFile,
        id: identity.value,
        raw: shopify.raw
      },
      productId: identity.value,
      field: "shopify_match",
      observed: formatShopifyIdentity(shopify),
      expected: "A deterministic Merchant feed row should match this Shopify export row when the product should be listed",
      message: "Shopify CSV row was not represented in the Merchant feed.",
      suggestion: "If this product should appear in Shopping/free listings, check whether the feed sync omitted it or uses a different SKU/handle mapping.",
      evidenceSource: `Shopify row ${shopify.sourceRow}`,
      confidence: "medium",
      matchKey: identity.key,
      matchValue: identity.value
    }));
  }
}

function buildShopifyIndex(shopifyRecords) {
  const index = {
    sku: new Map(),
    handle: new Map(),
    variantId: new Map(),
    productUrlHandle: new Map()
  };

  for (const record of shopifyRecords) {
    addUnique(index.sku, record.sku, record);
    addUnique(index.handle, record.handle, record);
    addUnique(index.variantId, record.variantId, record);
    addUnique(index.productUrlHandle, handleFromUrl(record.productUrl), record);
  }

  return index;
}

function matchShopifyRecord(record, index) {
  const candidates = shopifyMatchCandidates(record);

  for (const { key, value } of candidates) {
    const match = index[key].get(value);
    if (Array.isArray(match)) {
      return {
        status: SHOPIFY_MATCH_STATUSES.AMBIGUOUS,
        records: match,
        key,
        value,
        confidence: confidenceForShopifyMatchKey(key),
        attemptedKeys: formatAttemptedShopifyKeys(candidates)
      };
    }

    if (match) {
      return {
        status: SHOPIFY_MATCH_STATUSES.MATCHED,
        record: match,
        records: [match],
        key,
        value,
        confidence: confidenceForShopifyMatchKey(key),
        attemptedKeys: formatAttemptedShopifyKeys(candidates)
      };
    }
  }

  return {
    status: SHOPIFY_MATCH_STATUSES.NO_MATCH,
    key: "",
    value: "",
    confidence: "low",
    attemptedKeys: formatAttemptedShopifyKeys(candidates)
  };
}

function shopifyMatchCandidates(record) {
  const rawCandidates = [
    { key: "sku", value: record.sku },
    { key: "sku", value: record.id },
    { key: "variantId", value: record.id },
    { key: "handle", value: record.itemGroupId },
    { key: "productUrlHandle", value: handleFromUrl(record.link) }
  ];
  const seen = new Set();
  const candidates = [];

  for (const candidate of rawCandidates) {
    if (!candidate.value) {
      continue;
    }
    const identity = `${candidate.key}:${candidate.value}`;
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    candidates.push(candidate);
  }

  return candidates;
}

function formatAttemptedShopifyKeys(candidates) {
  return candidates.map((candidate) => `${candidate.key}=${candidate.value}`);
}

function confidenceForShopifyMatchKey(key) {
  if (key === "sku" || key === "variantId") {
    return "high";
  }
  return "medium";
}

function summarizeShopifyComparison(merchantRecords, shopifyRecords, outcome = null, existingIndex = null) {
  const empty = {
    shopifyMatched: 0,
    shopifyUnmatched: 0,
    shopifyAmbiguousMatches: 0,
    merchantUnmatchedInShopify: 0,
    shopifyRowsNotInFeed: 0,
    shopifyRowsNotInFeedRecords: []
  };

  if (outcome?.state && outcome.state !== RESULT_STATES.COMPLETED_CLEAN
    && outcome.state !== RESULT_STATES.COMPLETED_WITH_ISSUES
    && outcome.state !== RESULT_STATES.COMPLETED_WITH_AMBIGUOUS_MATCHES) {
    return empty;
  }

  if (merchantRecords.length === 0 || shopifyRecords.length === 0) {
    return empty;
  }

  const shopifyIndex = existingIndex || buildShopifyIndex(shopifyRecords);
  const representedShopifyRows = new Set();
  let shopifyMatched = 0;
  let merchantUnmatchedInShopify = 0;
  let shopifyAmbiguousMatches = 0;

  for (const record of merchantRecords) {
    const match = matchShopifyRecord(record, shopifyIndex);
    if (match.status === SHOPIFY_MATCH_STATUSES.MATCHED) {
      shopifyMatched += 1;
      representedShopifyRows.add(match.record.sourceRow);
    } else if (match.status === SHOPIFY_MATCH_STATUSES.AMBIGUOUS) {
      shopifyAmbiguousMatches += 1;
      for (const shopify of match.records) {
        representedShopifyRows.add(shopify.sourceRow);
      }
    } else if (match.attemptedKeys.length > 0) {
      merchantUnmatchedInShopify += 1;
    }
  }

  const shopifyRowsNotInFeedRecords = shopifyRecords
    .filter((record) => !representedShopifyRows.has(record.sourceRow));

  return {
    shopifyMatched,
    shopifyUnmatched: merchantUnmatchedInShopify,
    shopifyAmbiguousMatches,
    merchantUnmatchedInShopify,
    shopifyRowsNotInFeed: shopifyRowsNotInFeedRecords.length,
    shopifyRowsNotInFeedRecords
  };
}

function shopifyIdentity(shopify) {
  if (shopify.sku) {
    return { key: "sku", value: shopify.sku };
  }
  if (shopify.variantId) {
    return { key: "variantId", value: shopify.variantId };
  }
  if (shopify.handle) {
    return { key: "handle", value: shopify.handle };
  }
  const productUrlHandle = handleFromUrl(shopify.productUrl);
  if (productUrlHandle) {
    return { key: "productUrlHandle", value: productUrlHandle };
  }
  return { key: "shopifyRow", value: `row-${shopify.sourceRow}` };
}

function formatShopifyIdentity(shopify) {
  const parts = [];
  if (shopify.sku) {
    parts.push(`sku=${shopify.sku}`);
  }
  if (shopify.handle) {
    parts.push(`handle=${shopify.handle}`);
  }
  if (shopify.variantId) {
    parts.push(`variantId=${shopify.variantId}`);
  }
  if (shopify.status) {
    parts.push(`status=${shopify.status}`);
  }
  return parts.join("; ");
}

function groupIssuesByCode(issues) {
  const grouped = {};
  for (const issue of issues) {
    grouped[issue.code] = grouped[issue.code] || [];
    grouped[issue.code].push(issue);
  }
  return grouped;
}

function shopifyRowsLabel(records) {
  return records.map((record) => record.sourceRow).join(", ");
}

function createIssue({
  severity,
  code,
  record,
  field,
  observed,
  expected,
  message,
  suggestion,
  evidenceSource,
  confidence,
  matchKey,
  matchValue,
  productId
}) {
  return {
    severity,
    code,
    row: record.sourceRow,
    productId: productId || record.id || record.sku || record.handle || record.variantId || "(missing)",
    field,
    observed: observed ?? "",
    expected,
    message,
    suggestion,
    evidenceSource: evidenceSource || record.sourceFile || "merchant feed",
    confidence: confidence || "high",
    matchKey: matchKey || "",
    matchValue: matchValue || ""
  };
}

function parsePrice(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return {
      raw: "",
      valid: false,
      amount: null,
      currency: ""
    };
  }

  const match = value.match(/^([+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:[.,]\d+)?)\s*([A-Za-z]{3})?$/);
  if (!match) {
    return {
      raw: value,
      valid: false,
      amount: null,
      currency: ""
    };
  }

  let amountText = match[1];
  if (!amountText.includes(".") && /,\d{1,2}$/.test(amountText)) {
    amountText = amountText.replace(",", ".");
  } else {
    amountText = amountText.replace(/,/g, "");
  }

  const amount = Number(amountText);
  const currency = match[2] ? match[2].toUpperCase() : "";

  return {
    raw: value,
    valid: Number.isFinite(amount),
    amount: Number.isFinite(amount) ? amount : null,
    currency
  };
}

function normalizeAvailability(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeCondition(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function coalesce(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(row, key) && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

function isHttpUrl(value) {
  return Boolean(parseHttpUrl(value));
}

function parseHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function handleFromUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(String(value));
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

function normalizeBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["false", "no", "0"].includes(normalized)) {
    return false;
  }
  if (["true", "yes", "1"].includes(normalized)) {
    return true;
  }
  return null;
}

function isValidGtin(value) {
  const raw = String(value || "");
  if (/[^0-9\s-]/.test(raw)) {
    return false;
  }

  const digits = raw.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) {
    return false;
  }

  let sum = 0;
  let weightThree = true;
  for (let index = digits.length - 2; index >= 0; index -= 1) {
    sum += Number(digits[index]) * (weightThree ? 3 : 1);
    weightThree = !weightThree;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[digits.length - 1]);
}

function inferSingleCurrency(records) {
  const currencies = new Set();
  for (const record of records) {
    if (record.price?.currency) {
      currencies.add(record.price.currency);
    }
    if (record.salePrice?.currency) {
      currencies.add(record.salePrice.currency);
    }
  }
  return currencies.size === 1 ? [...currencies][0] : "";
}

function priceWithCurrency(record, field, currency) {
  const price = field === "sale_price" ? record.salePrice : record.price;
  if (!price?.valid || !price.raw || price.currency) {
    return "";
  }
  return `${price.raw} ${currency}`;
}

function trimText(value, maxLength) {
  const chars = [...String(value || "").trim()];
  if (chars.length <= maxLength) {
    return chars.join("");
  }

  const hardTrimmed = chars.slice(0, maxLength).join("");
  const lastSpace = hardTrimmed.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxLength * 0.75)) {
    return hardTrimmed.slice(0, lastSpace).trim();
  }
  return hardTrimmed.trim();
}

function cleanPromotionalTitle(title) {
  let cleaned = String(title || "");
  for (const pattern of PROMOTIONAL_TITLE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function replacementKey(row, field) {
  return `${row}:${field}`;
}

function recordValueForFeedField(record, property) {
  if (property === "price") {
    return record.price?.raw || "";
  }
  if (property === "salePrice") {
    return record.salePrice?.raw || "";
  }
  return record[property] || "";
}

function characterLength(value) {
  return [...String(value || "")].length;
}

function findPromotionalTitlePhrase(title) {
  const value = String(title || "");
  for (const pattern of PROMOTIONAL_TITLE_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return "";
}

function hasExcessiveTitleCapitals(title) {
  const letters = [...String(title || "")].filter((char) => /[A-Za-z]/.test(char));
  if (letters.length < 12) {
    return false;
  }

  const uppercase = letters.filter((char) => char >= "A" && char <= "Z").length;
  return uppercase / letters.length >= 0.85;
}

function hasImageFileExtension(pathname) {
  return IMAGE_FILE_EXTENSIONS.has(fileExtension(pathname));
}

function hasPageFileExtension(pathname) {
  return PAGE_FILE_EXTENSIONS.has(fileExtension(pathname));
}

function fileExtension(pathname) {
  const lowerPath = String(pathname || "").toLowerCase();
  const lastSegment = lowerPath.split("/").pop() || "";
  const dotIndex = lastSegment.lastIndexOf(".");
  return dotIndex >= 0 ? lastSegment.slice(dotIndex) : "";
}

function addUnique(map, key, record) {
  if (!key) {
    return;
  }

  if (map.has(key)) {
    const existing = map.get(key);
    map.set(key, Array.isArray(existing) ? [...existing, record] : [existing, record]);
    return;
  }

  map.set(key, record);
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
