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
  identifierExists: ["identifier_exists", "g:identifier_exists"]
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
    identifier_exists: getXmlText(node, ["g:identifier_exists", "identifier_exists"])
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
      identifier_exists: extractXmlTag(block, ["g:identifier_exists", "identifier_exists"])
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
    identifierExists: normalized.identifierExists
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
  }
}

function addUrlIssue(record, field, value, issues) {
  if (!value) {
    return;
  }

  if (!isHttpUrl(value)) {
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
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
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
  const digits = String(value || "").replace(/\D/g, "");
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
