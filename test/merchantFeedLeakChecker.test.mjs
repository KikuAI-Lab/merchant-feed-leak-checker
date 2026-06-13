import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeInputs,
  buildRepairResult,
  issuesToCsv,
  parseMerchantFeed,
  parseShopifyCsv,
  summaryToFixChecklist,
  summaryToHtml
} from "../src/merchant-feed-leak-checker.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const brokenMerchantFeed = `id,title,description,link,image_link,price,sale_price,availability,brand,gtin,item_group_id
SKU-1001,Canvas Tote,Heavy cotton tote,https://example.com/products/canvas-tote,https://example.com/images/tote.jpg,29.00 USD,35.00 USD,in_stock,Kiku Goods,4006381333931,canvas-tote
SKU-1002,Travel Mug,Insulated mug,https://example.com/products/travel-mug,not-a-url,0 USD,,available,Kiku Goods,12345,travel-mug
SKU-1002,Travel Mug Duplicate,Insulated mug duplicate,https://example.com/products/travel-mug,https://example.com/images/mug.jpg,18.00 USD,,out_of_stock,Kiku Goods,4006381333931,travel-mug
,No ID Product,Missing ID,/products/no-id,https://example.com/images/no-id.jpg,12.00,,in_stock,,,no-id
SKU-1004,Sticker Pack,Waterproof stickers,https://example.com/products/sticker-pack,https://example.com/images/stickers.jpg,abc USD,,in_stock,,,sticker-pack`;

const validXmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <item>
      <g:id>SKU-2001</g:id>
      <g:title>Desk Lamp</g:title>
      <g:description>Adjustable desk lamp</g:description>
      <g:link>https://example.com/products/desk-lamp</g:link>
      <g:image_link>https://example.com/images/desk-lamp.jpg</g:image_link>
      <g:price>42.00 USD</g:price>
      <g:availability>in_stock</g:availability>
      <g:brand>Kiku Goods</g:brand>
      <g:gtin>4006381333931</g:gtin>
      <g:item_group_id>desk-lamp</g:item_group_id>
    </item>
  </channel>
</rss>`;

const brokenTsvFeed = `id\ttitle\tdescription\tlink\timage_link\tprice\tavailability\tbrand\tgtin\titem_group_id
SKU-3001\tBad Link Product\tTSV fixture\tftp://example.com/products/bad-link\thttps://example.com/images/bad-link.jpg\t14.00 USD\tin_stock\tKiku Goods\t4006381333931\tbad-link
SKU-3002\tMissing Image\tTSV fixture\thttps://example.com/products/missing-image\t\t-4.00 USD\tin_stock\t\t\tmissing-image`;

const shopifyCsv = `Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty,Status
canvas-tote,Canvas Tote,SKU-1001,25.00,4,active
travel-mug,Travel Mug,SKU-1002,18.00,5,active
sticker-pack,Sticker Pack,SKU-1004,6.00,0,active`;

test("parses merchant feeds and detects deterministic leak rules", () => {
  const result = analyzeInputs({
    merchantText: brokenMerchantFeed,
    merchantFileName: "google-feed-broken.csv",
    shopifyText: shopifyCsv,
    shopifyFileName: "shopify-products.csv"
  });

  assert.equal(result.summary.totalProducts, 5);
  assert.equal(result.summary.shopifyProducts, 3);
  assert.equal(result.summary.totalIssues, 17);

  const codes = new Set(result.issues.map((issue) => issue.code));
  assert.ok(codes.has("sale_price_above_price"));
  assert.ok(codes.has("invalid_url"));
  assert.ok(codes.has("zero_price"));
  assert.ok(codes.has("unsupported_availability"));
  assert.ok(codes.has("invalid_gtin"));
  assert.ok(codes.has("duplicate_product_id"));
  assert.ok(codes.has("missing_required_field"));
  assert.ok(codes.has("malformed_price"));
  assert.ok(codes.has("missing_identifier_group"));
  assert.ok(codes.has("shopify_price_mismatch"));
  assert.ok(codes.has("shopify_availability_mismatch"));

  assert.match(issuesToCsv(result.issues), /shopify_price_mismatch/);
  assert.match(summaryToHtml(result), /Merchant Feed Check Report/);
  assert.match(summaryToFixChecklist(result), /Merchant Feed Fix Checklist/);
  assert.match(summaryToFixChecklist(result), /shopify_price_mismatch/);
});

test("supports XML and TSV feed inputs", () => {
  const xmlRecords = parseMerchantFeed(validXmlFeed, "google-feed-valid.xml");
  assert.equal(xmlRecords.length, 1);
  assert.equal(xmlRecords[0].id, "SKU-2001");
  assert.equal(xmlRecords[0].price.amount, 42);

  const tsvResult = analyzeInputs({
    merchantText: brokenTsvFeed,
    merchantFileName: "google-feed-broken.tsv"
  });
  const codes = new Set(tsvResult.issues.map((issue) => issue.code));
  assert.ok(codes.has("invalid_url"));
  assert.ok(codes.has("negative_price"));
  assert.ok(codes.has("missing_required_field"));
});

test("parses Shopify product CSV for comparison rows", () => {
  const records = parseShopifyCsv(shopifyCsv, "shopify-products.csv");
  assert.equal(records.length, 3);
  assert.equal(records[0].availability, "in_stock");
});

test("generates fixed delimited feed, patch CSV, and manual fixes", () => {
  const repairInput = `id,title,description,link,image_link,price,sale_price,availability,brand,gtin,item_group_id
SKU-1001,Canvas Tote,Heavy cotton tote,https://example.com/products/canvas-tote,https://example.com/images/tote.jpg,29.00 USD,20.00 USD,available,Kiku Goods,4006381333931,canvas-tote
SKU-1002,Travel Mug,Insulated mug,https://example.com/products/travel-mug,https://example.com/images/mug.jpg,18.00,35.00 USD,out_of_stock,Kiku Goods,4006381333931,travel-mug
SKU-1004,Sticker Pack,Waterproof stickers,https://example.com/products/sticker-pack,https://example.com/images/stickers.jpg,abc USD,,out_of_stock,Kiku Goods,,sticker-pack`;

  const result = analyzeInputs({
    merchantText: repairInput,
    merchantFileName: "repair-feed.csv",
    shopifyText: shopifyCsv,
    shopifyFileName: "shopify-products.csv"
  });
  const repair = buildRepairResult(result, {
    merchantText: repairInput,
    merchantFileName: "repair-feed.csv",
    useShopifyAsSourceOfTruth: true
  });

  assert.equal(repair.canAutoRepair, true);
  assert.equal(repair.summary.autoFixed, 4);
  assert.equal(repair.summary.manualFixes, 2);
  assert.match(repair.fixedFeedText, /SKU-1001,Canvas Tote,Heavy cotton tote,https:\/\/example\.com\/products\/canvas-tote,https:\/\/example\.com\/images\/tote\.jpg,25\.00 USD,20\.00 USD,in_stock/);
  assert.match(repair.fixedFeedText, /SKU-1002,Travel Mug,Insulated mug,https:\/\/example\.com\/products\/travel-mug,https:\/\/example\.com\/images\/mug\.jpg,18\.00 USD,35\.00 USD,in_stock/);
  assert.match(repair.patchCsv, /source_row,product_id,field,old_value,new_value,reason,confidence/);
  assert.match(repair.patchCsv, /2,SKU-1001,availability,available,in_stock,Normalize availability alias,high/);
  assert.match(repair.patchCsv, /2,SKU-1001,price,29\.00 USD,25\.00 USD,Use Shopify price as source of truth,medium/);
  assert.match(repair.patchCsv, /3,SKU-1002,price,18\.00,18\.00 USD,Add majority currency,high/);
  assert.match(repair.patchCsv, /3,SKU-1002,availability,out_of_stock,in_stock,Use Shopify availability as source of truth,medium/);
  assert.match(repair.manualFixesMarkdown, /sale_price_above_price/);
  assert.match(repair.manualFixesMarkdown, /malformed_price/);
});

test("keeps XML report-only for repair v1", () => {
  const result = analyzeInputs({
    merchantText: validXmlFeed,
    merchantFileName: "google-feed-valid.xml"
  });
  const repair = buildRepairResult(result, {
    merchantText: validXmlFeed,
    merchantFileName: "google-feed-valid.xml"
  });

  assert.equal(repair.canAutoRepair, false);
  assert.equal(repair.fixedFeedText, "");
  assert.match(repair.manualFixesMarkdown, /XML automatic repair is not enabled/);
});

test("ships as a standalone static browser-local tool", async () => {
  const page = await read("index.html");
  const app = await read("src/main.js");
  const readme = await read("README.md");
  const packageJson = await read("package.json");

  assert.match(page, /Merchant Feed Repair Tool/);
  assert.match(page, /No uploads/);
  assert.match(page, /No API calls/);
  assert.match(page, /Download fixed feed/);
  assert.match(page, /Download patch CSV/);
  assert.match(page, /Download manual fixes/);
  assert.match(app, /downloadTextFile/);
  assert.match(app, /buildRepairResult/);
  assert.match(page, /Re-run repair/);
  assert.match(readme, /repair starts automatically/i);
  assert.match(app, /rerunRepairIfReady/);
  assert.match(app, /elements\.shopifySourceToggle\.addEventListener\("change", rerunRepairIfReady\)/);
  assert.match(app, /rerunRepairIfReady\(\);/);
  assert.match(readme, /Runs entirely in the browser/);
  assert.match(packageJson, /"private": false/);

  for (const source of [page, app, readme]) {
    assert.doesNotMatch(source, /\/api\/interest/);
    assert.doesNotMatch(source, /fetch\s*\(/);
    assert.doesNotMatch(source, /navigator\.sendBeacon/);
    assert.doesNotMatch(source, /localStorage/);
    assert.doesNotMatch(source, /kikuai\.dev/);
  }
});
