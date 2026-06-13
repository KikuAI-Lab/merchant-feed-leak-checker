import {
  analyzeInputs,
  buildRepairResult,
  issuesToCsv,
  summaryToFixChecklist,
  summaryToHtml
} from "./merchant-feed-leak-checker.js";

const sampleMerchantFeed = `id,title,description,link,image_link,price,sale_price,availability,brand,gtin,item_group_id
SKU-1001,Canvas Tote,Heavy cotton tote,https://example.com/products/canvas-tote,https://example.com/images/tote.jpg,29.00 USD,35.00 USD,in_stock,Kiku Goods,4006381333931,canvas-tote
SKU-1002,Travel Mug,Insulated mug,https://example.com/products/travel-mug,not-a-url,0 USD,,available,Kiku Goods,12345,travel-mug
SKU-1002,Travel Mug Duplicate,Insulated mug duplicate,https://example.com/products/travel-mug,https://example.com/images/mug.jpg,18.00 USD,,out_of_stock,Kiku Goods,4006381333931,travel-mug
,No ID Product,Missing ID,/products/no-id,https://example.com/images/no-id.jpg,12.00,,in_stock,,,no-id
SKU-1004,Sticker Pack,Waterproof stickers,https://example.com/products/sticker-pack,https://example.com/images/stickers.jpg,abc USD,,in_stock,,,sticker-pack`;

const sampleShopifyCsv = `Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty,Status
canvas-tote,Canvas Tote,SKU-1001,25.00,4,active
travel-mug,Travel Mug,SKU-1002,18.00,5,active
sticker-pack,Sticker Pack,SKU-1004,6.00,0,active`;

const state = {
  merchantText: "",
  shopifyText: "",
  merchantFileName: "",
  shopifyFileName: "",
  result: null,
  repair: null
};

const elements = {
  merchantFile: document.querySelector("#merchantFile"),
  shopifyFile: document.querySelector("#shopifyFile"),
  merchantFileName: document.querySelector("#merchantFileName"),
  shopifyFileName: document.querySelector("#shopifyFileName"),
  merchantDrop: document.querySelector("#merchantDrop"),
  shopifyDrop: document.querySelector("#shopifyDrop"),
  shopifySourceToggle: document.querySelector("#shopifySourceToggle"),
  sampleButton: document.querySelector("#sampleButton"),
  runButton: document.querySelector("#runButton"),
  resetButton: document.querySelector("#resetButton"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultSubtitle: document.querySelector("#resultSubtitle"),
  sourceLabel: document.querySelector("#sourceLabel"),
  parseMessages: document.querySelector("#parseMessages"),
  metricProducts: document.querySelector("#metricProducts"),
  metricAutoFixed: document.querySelector("#metricAutoFixed"),
  metricManualFixes: document.querySelector("#metricManualFixes"),
  metricShopify: document.querySelector("#metricShopify"),
  downloadFixedFeed: document.querySelector("#downloadFixedFeed"),
  downloadPatchCsv: document.querySelector("#downloadPatchCsv"),
  downloadManualFixes: document.querySelector("#downloadManualFixes"),
  downloadCsv: document.querySelector("#downloadCsv"),
  downloadHtml: document.querySelector("#downloadHtml"),
  downloadChecklist: document.querySelector("#downloadChecklist"),
  issueRows: document.querySelector("#issueRows")
};

elements.merchantFile.addEventListener("change", () => ingestSelectedFile("merchant"));
elements.shopifyFile.addEventListener("change", () => ingestSelectedFile("shopify"));
elements.sampleButton.addEventListener("click", loadSample);
elements.runButton.addEventListener("click", runAudit);
elements.resetButton.addEventListener("click", resetTool);
elements.downloadFixedFeed.addEventListener("click", () => {
  if (!state.repair?.canAutoRepair) return;
  downloadTextFile(fixedFeedFileName(), state.repair.fixedFeedText, fixedFeedMimeType());
});
elements.downloadPatchCsv.addEventListener("click", () => {
  if (!state.repair) return;
  downloadTextFile("merchant-feed-patch.csv", state.repair.patchCsv, "text/csv;charset=utf-8");
});
elements.downloadManualFixes.addEventListener("click", () => {
  if (!state.repair) return;
  downloadTextFile("merchant-feed-manual-fixes.md", state.repair.manualFixesMarkdown, "text/markdown;charset=utf-8");
});
elements.downloadCsv.addEventListener("click", () => {
  if (!state.result) return;
  downloadTextFile("merchant-feed-issues.csv", issuesToCsv(state.result.issues), "text/csv;charset=utf-8");
});
elements.downloadHtml.addEventListener("click", () => {
  if (!state.result) return;
  downloadTextFile("merchant-feed-summary.html", summaryToHtml(state.result), "text/html;charset=utf-8");
});
elements.downloadChecklist.addEventListener("click", () => {
  if (!state.result) return;
  downloadTextFile("merchant-feed-fix-checklist.md", summaryToFixChecklist(state.result), "text/markdown;charset=utf-8");
});

wireDropTarget(elements.merchantDrop, "merchant");
wireDropTarget(elements.shopifyDrop, "shopify");

async function ingestSelectedFile(slot) {
  const input = slot === "merchant" ? elements.merchantFile : elements.shopifyFile;
  await ingestFile(slot, input.files?.[0]);
  input.value = "";
}

async function ingestFile(slot, file) {
  if (!file) return;
  const text = await file.text();

  if (slot === "merchant") {
    state.merchantText = text;
    state.merchantFileName = file.name || "merchant-feed.csv";
    elements.merchantFileName.textContent = state.merchantFileName;
  } else {
    state.shopifyText = text;
    state.shopifyFileName = file.name || "shopify-products.csv";
    elements.shopifyFileName.textContent = state.shopifyFileName;
  }

  syncRunState();
}

function loadSample() {
  state.merchantText = sampleMerchantFeed;
  state.shopifyText = sampleShopifyCsv;
  state.merchantFileName = "sample-google-feed.csv";
  state.shopifyFileName = "sample-shopify-products.csv";
  elements.merchantFileName.textContent = state.merchantFileName;
  elements.shopifyFileName.textContent = state.shopifyFileName;
  syncRunState();
  runAudit();
}

function runAudit() {
  if (!state.merchantText.trim()) return;

  state.result = analyzeInputs({
    merchantText: state.merchantText,
    merchantFileName: state.merchantFileName || "merchant-feed.csv",
    shopifyText: state.shopifyText,
    shopifyFileName: state.shopifyFileName || "shopify-products.csv"
  });
  state.repair = buildRepairResult(state.result, {
    merchantText: state.merchantText,
    merchantFileName: state.merchantFileName || "merchant-feed.csv",
    useShopifyAsSourceOfTruth: Boolean(state.shopifyText && elements.shopifySourceToggle.checked)
  });

  renderResult();
}

function resetTool() {
  state.merchantText = "";
  state.shopifyText = "";
  state.merchantFileName = "";
  state.shopifyFileName = "";
  state.result = null;
  state.repair = null;
  elements.merchantFileName.textContent = "No file selected";
  elements.shopifyFileName.textContent = "No file selected";
  elements.resultPanel.hidden = true;
  elements.issueRows.replaceChildren();
  syncRunState();
}

function syncRunState() {
  elements.runButton.disabled = !state.merchantText.trim();
}

function renderResult() {
  const result = state.result;
  const repair = state.repair;
  const summary = result.summary;
  const visibleIssues = result.issues.slice(0, 50);
  const fixedText = repair.summary.autoFixed === 1 ? "auto-fix" : "auto-fixes";
  const manualText = repair.summary.manualFixes === 1 ? "manual review" : "manual reviews";

  elements.resultPanel.hidden = false;
  elements.resultTitle.textContent = `${repair.summary.autoFixed} ${fixedText}, ${repair.summary.manualFixes} ${manualText}`;
  elements.resultSubtitle.textContent = `Parsed ${summary.totalProducts} feed rows${summary.shopifyProducts ? ` and ${summary.shopifyProducts} Shopify rows` : ""}. ${repair.canAutoRepair ? "A fixed feed is ready to download." : "No automatic feed rewrite is available for this input."}`;
  elements.sourceLabel.textContent = summary.shopifyProducts ? "Merchant feed + Shopify export" : "Merchant feed only";
  elements.metricProducts.textContent = String(summary.totalProducts);
  elements.metricAutoFixed.textContent = String(repair.summary.autoFixed);
  elements.metricManualFixes.textContent = String(repair.summary.manualFixes);
  elements.metricShopify.textContent = String(summary.shopifyProducts);
  elements.downloadFixedFeed.disabled = !repair.canAutoRepair;
  elements.downloadPatchCsv.disabled = repair.patches.length === 0;

  renderParseMessages(result.outcome);
  elements.issueRows.replaceChildren(...visibleIssues.map(renderIssueRow));

  if (visibleIssues.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No deterministic issues were found in this local check.";
    row.append(cell);
    elements.issueRows.append(row);
  }

  elements.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderParseMessages(outcome) {
  const messages = [...(outcome?.errors || []), ...(outcome?.warnings || [])];
  elements.parseMessages.replaceChildren();

  if (messages.length === 0) {
    elements.parseMessages.hidden = true;
    return;
  }

  for (const message of messages) {
    const item = document.createElement("p");
    item.textContent = message.message;
    elements.parseMessages.append(item);
  }

  elements.parseMessages.hidden = false;
}

function renderIssueRow(issue) {
  const row = document.createElement("tr");
  const cells = [
    issue.severity,
    issue.code,
    issue.row,
    issue.productId || "",
    issue.field || "",
    issue.observed || "",
    issue.suggestion || ""
  ];

  for (const value of cells) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.append(cell);
  }

  row.firstElementChild.className = issue.severity === "blocking" ? "severity blocking" : "severity warning";
  return row;
}

function wireDropTarget(target, slot) {
  target.addEventListener("dragenter", (event) => {
    event.preventDefault();
    target.classList.add("is-dragging");
  });
  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    target.classList.add("is-dragging");
  });
  target.addEventListener("dragleave", () => {
    target.classList.remove("is-dragging");
  });
  target.addEventListener("drop", async (event) => {
    event.preventDefault();
    target.classList.remove("is-dragging");
    await ingestFile(slot, event.dataTransfer?.files?.[0]);
  });
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fixedFeedFileName() {
  const source = state.merchantFileName || "merchant-feed.csv";
  const extension = source.toLowerCase().endsWith(".tsv") ? "tsv" : "csv";
  return `fixed-merchant-feed.${extension}`;
}

function fixedFeedMimeType() {
  return state.merchantFileName.toLowerCase().endsWith(".tsv")
    ? "text/tab-separated-values;charset=utf-8"
    : "text/csv;charset=utf-8";
}
