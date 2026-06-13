import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  analyzeInputs,
  buildRepairResult,
  issuesToCsv,
  summaryToFixChecklist,
  summaryToHtml
} from "../src/merchant-feed-leak-checker.js";

const sampleMerchantFeed = `id,title,description,link,image_link,price,sale_price,availability,brand,gtin,item_group_id
SKU-1001,Canvas Tote,Heavy cotton tote,https://example.com/products/canvas-tote,https://example.com/images/tote.jpg,29.00 USD,35.00 USD,in_stock,Kiku Goods,4006381333931,canvas-tote
SKU-1002,Travel Mug,Insulated mug,https://example.com/products/travel-mug,not-a-url,0 USD,,available,Kiku Goods,12345,travel-mug`;

const shopifyCsv = `Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty,Status
canvas-tote,Canvas Tote,SKU-1001,25.00,4,active
travel-mug,Travel Mug,SKU-1002,18.00,5,active`;

const result = analyzeInputs({
  merchantText: sampleMerchantFeed,
  merchantFileName: "sample-google-feed.csv",
  shopifyText: shopifyCsv,
  shopifyFileName: "sample-shopify-products.csv"
});
const repair = buildRepairResult(result, {
  merchantText: sampleMerchantFeed,
  merchantFileName: "sample-google-feed.csv",
  useShopifyAsSourceOfTruth: true
});

assert.equal(result.summary.totalProducts, 2);
assert.ok(result.summary.totalIssues > 0);
assert.ok(repair.summary.autoFixed > 0);
assert.match(repair.fixedFeedText, /in_stock/);
assert.match(repair.patchCsv, /source_row,product_id,field/);
assert.match(repair.manualFixesMarkdown, /Merchant Feed Manual Fixes/);
assert.match(issuesToCsv(result.issues), /severity,code,row/);
assert.match(summaryToHtml(result), /Merchant Feed Check Report/);
assert.match(summaryToFixChecklist(result), /Merchant Feed Fix Checklist/);

const app = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const combined = `${app}\n${page}`;

assert.doesNotMatch(combined, /\/api\/interest/);
assert.doesNotMatch(combined, /fetch\s*\(/);
assert.doesNotMatch(combined, /navigator\.sendBeacon/);
assert.doesNotMatch(combined, /localStorage/);

console.log("Static smoke passed: parser and repair work, and UI has no network or storage hooks.");
