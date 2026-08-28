/* GST Invoice Generator
 * ---------------------------------------------------------------------------
 * Everything runs in the browser. No network calls, no analytics, no backend.
 * State is mirrored to localStorage so a refresh does not lose a half-written
 * invoice.
 *
 * The GST rules implemented here:
 *   - Supply within the same state  -> CGST + SGST, each half the GST rate.
 *   - Supply across states          -> IGST at the full rate.
 * That is the split every Indian tax invoice has to show, and getting it wrong
 * is the single most common mistake in a hand-rolled invoice template.
 */

"use strict";

/* ── Indian states and union territories, with their GST state codes ──────── */
const STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"],
  ["04", "Chandigarh"], ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"],
  ["08", "Rajasthan"], ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"],
  ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"],
  ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"],
  ["24", "Gujarat"], ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"], ["31", "Lakshadweep"],
  ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"],
  ["38", "Ladakh"], ["97", "Other Territory"],
];

const CURRENCY_SYMBOL = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

const STORAGE_KEY = "gst-invoice-generator:v1";

/* ── Model ────────────────────────────────────────────────────────────────── */

const blankItem = () => ({
  description: "",
  hsn: "",
  qty: 1,
  rate: 0,
  gst: 18,
});

let state = {
  sellerName: "", sellerGstin: "", sellerAddress: "", sellerState: "27", sellerEmail: "",
  buyerName: "", buyerGstin: "", buyerAddress: "", buyerState: "27",
  invoiceNo: "", invoiceDate: "", dueDate: "", currency: "INR",
  items: [blankItem()],
  discountPct: 0, shipping: 0, notes: "",
};

const SAMPLE = {
  sellerName: "Acme Design Studio",
  sellerGstin: "27AAAPA1234A1ZT",
  sellerAddress: "221B Linking Road\nBandra West, Mumbai 400050",
  sellerState: "27",
  sellerEmail: "billing@acme.in",
  buyerName: "Nimbus Retail Pvt Ltd",
  buyerGstin: "29AAQCN9876B1ZP",
  buyerAddress: "12 MG Road\nBengaluru 560001",
  buyerState: "29",
  invoiceNo: "INV-2026-014",
  invoiceDate: todayISO(),
  dueDate: addDaysISO(todayISO(), 15),
  currency: "INR",
  items: [
    { description: "Brand identity system", hsn: "998391", qty: 1, rate: 185000, gst: 18 },
    { description: "Marketing site design (8 screens)", hsn: "998314", qty: 8, rate: 14500, gst: 18 },
    { description: "Printed brand guidelines", hsn: "4911", qty: 25, rate: 640, gst: 12 },
  ],
  discountPct: 5,
  shipping: 1800,
  notes: "Payment due within 15 days. NEFT to Acme Design Studio, A/C 0000 0000 0000, IFSC HDFC0000001.",
};

/* ── Small helpers ────────────────────────────────────────────────────────── */

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function stateName(code) {
  const found = STATES.find((s) => s[0] === code);
  return found ? found[1] : "";
}

/** Rounds to 2dp without the float drift that makes totals disagree by a paisa. */
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function money(n, currency) {
  const symbol = CURRENCY_SYMBOL[currency] || "";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return symbol + Number(n || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/* ── GSTIN validation ─────────────────────────────────────────────────────────
 * A GSTIN is 15 characters: 2-digit state code, 10-character PAN, an entity
 * digit, the letter Z, then a checksum character. The checksum is a base-36
 * weighted sum, so a typo is caught rather than silently printed on a tax
 * document that has to be filed.
 */
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gstinChecksum(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = GSTIN_CHARS.indexOf(first14[i]);
    if (value < 0) return null;
    const weighted = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(weighted / 36) + (weighted % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

function validateGstin(value) {
  const gstin = String(value || "").trim().toUpperCase();
  if (!gstin) return { level: "", message: "" };
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    return { level: "bad", message: "Not a valid GSTIN format (15 characters)." };
  }
  if (gstinChecksum(gstin.slice(0, 14)) !== gstin[14]) {
    return { level: "bad", message: "Checksum does not match — check for a typo." };
  }
  const code = gstin.slice(0, 2);
  if (!stateName(code)) {
    return { level: "bad", message: "Unknown state code " + code + "." };
  }
  return { level: "ok", message: "Valid — " + stateName(code) + "." };
}

/* ── Amount in words (Indian numbering: lakh, crore) ──────────────────────── */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? t + " " + o : t;
}

function threeDigits(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) parts.push(ONES[hundred] + " Hundred");
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** 1234567 -> "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven" */
function integerToWords(num) {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  const parts = [];
  if (crore) parts.push(integerToWords(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ");
}

function amountInWords(amount, currency) {
  const unit = currency === "INR" ? ["Rupees", "Paise"] : ["", ""];
  const whole = Math.floor(Math.abs(amount));
  const frac = Math.round((Math.abs(amount) - whole) * 100);
  let out = (unit[0] ? unit[0] + " " : "") + integerToWords(whole);
  if (frac > 0) out += " and " + twoDigits(frac) + (unit[1] ? " " + unit[1] : "");
  return out + " only";
}

/* ── The calculation ──────────────────────────────────────────────────────── */

function calculate(model) {
  // Same state means the tax is split into CGST + SGST; different states means
  // a single IGST line. This is the whole point of "place of supply".
  const intraState = model.sellerState === model.buyerState;
  const discountPct = Math.min(Math.max(Number(model.discountPct) || 0, 0), 100);

  const lines = model.items.map((item) => {
    const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    // The discount is applied before tax, because tax is charged on the
    // discounted taxable value, not the list price.
    const taxable = round2(gross * (1 - discountPct / 100));
    // Named gstRate, not rate: spreading `...item` alongside a local called
    // `rate` would overwrite the item's unit price with the tax percentage,
    // and the Rate column would print "18.00" for an 18% line.
    const gstRate = Number(item.gst) || 0;
    const tax = round2((taxable * gstRate) / 100);
    return { ...item, gross, taxable, gstRate, tax, total: round2(taxable + tax) };
  });

  const taxableTotal = round2(lines.reduce((sum, l) => sum + l.taxable, 0));
  const taxTotal = round2(lines.reduce((sum, l) => sum + l.tax, 0));
  const shipping = round2(Number(model.shipping) || 0);
  const grandTotal = round2(taxableTotal + taxTotal + shipping);

  // Grouped by GST rate — the "tax summary" block a GST invoice must carry.
  const byRate = new Map();
  for (const line of lines) {
    if (!line.taxable) continue;
    const bucket = byRate.get(line.gstRate) || { rate: line.gstRate, taxable: 0, tax: 0 };
    bucket.taxable = round2(bucket.taxable + line.taxable);
    bucket.tax = round2(bucket.tax + line.tax);
    byRate.set(line.gstRate, bucket);
  }

  return {
    intraState,
    lines,
    taxableTotal,
    taxTotal,
    shipping,
    grandTotal,
    discountAmount: round2(lines.reduce((s, l) => s + l.gross, 0) - taxableTotal),
    rateGroups: [...byRate.values()].sort((a, b) => a.rate - b.rate),
  };
}

/* ── Persistence ──────────────────────────────────────────────────────────── */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Private browsing, or storage disabled. The invoice still works; it just
    // will not survive a refresh, which is not worth interrupting anyone over.
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    state = { ...state, ...parsed };
    if (!Array.isArray(state.items) || state.items.length === 0) state.items = [blankItem()];
    return true;
  } catch (err) {
    return false;
  }
}

/* ── DOM wiring ───────────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

const FIELDS = [
  "sellerName", "sellerGstin", "sellerAddress", "sellerState", "sellerEmail",
  "buyerName", "buyerGstin", "buyerAddress", "buyerState",
  "invoiceNo", "invoiceDate", "dueDate", "currency",
  "discountPct", "shipping", "notes",
];

function fillStateSelects() {
  const options = STATES.map(([code, name]) =>
    '<option value="' + code + '">' + escapeHtml(code + " — " + name) + "</option>"
  ).join("");
  $("sellerState").innerHTML = options;
  $("buyerState").innerHTML = options;
}

function renderItemRows() {
  $("itemRows").innerHTML = state.items.map((item, i) => `
    <div class="item-row" data-index="${i}">
      <input type="text" data-field="description" placeholder="Description" value="${escapeHtml(item.description)}">
      <input type="text" data-field="hsn" placeholder="HSN" value="${escapeHtml(item.hsn)}">
      <input type="number" data-field="qty" min="0" step="any" placeholder="Qty" value="${escapeHtml(item.qty)}">
      <input type="number" data-field="rate" min="0" step="any" placeholder="Rate" value="${escapeHtml(item.rate)}">
      <select data-field="gst">
        ${[0, 0.25, 3, 5, 12, 18, 28].map((r) =>
          '<option value="' + r + '"' + (Number(item.gst) === r ? " selected" : "") + ">" + r + "%</option>"
        ).join("")}
      </select>
      <button type="button" class="remove" data-remove="${i}" aria-label="Remove line ${i + 1}">&times;</button>
    </div>
  `).join("");
}

function syncInputsFromState() {
  FIELDS.forEach((field) => {
    const el = $(field);
    if (el) el.value = state[field];
  });
  renderItemRows();
}

function readInputsIntoState() {
  FIELDS.forEach((field) => {
    const el = $(field);
    if (!el) return;
    state[field] = el.type === "number" ? Number(el.value) : el.value;
  });
}

function renderPreview() {
  const c = calculate(state);
  const cur = state.currency;

  $("pvSellerName").textContent = state.sellerName || "Your business name";
  $("pvSellerAddress").textContent = state.sellerAddress;
  $("pvSellerGstin").textContent = state.sellerGstin ? "GSTIN: " + state.sellerGstin.toUpperCase() : "";
  $("pvSellerEmail").textContent = state.sellerEmail;

  $("pvInvoiceNo").textContent = state.invoiceNo || "—";
  $("pvInvoiceDate").textContent = formatDate(state.invoiceDate);
  $("pvDueDate").textContent = formatDate(state.dueDate);

  $("pvBuyerName").textContent = state.buyerName || "—";
  $("pvBuyerAddress").textContent = state.buyerAddress;
  $("pvBuyerGstin").textContent = state.buyerGstin ? "GSTIN: " + state.buyerGstin.toUpperCase() : "";

  $("pvPlaceOfSupply").textContent = state.buyerState + " — " + stateName(state.buyerState);
  $("pvSupplyType").textContent = c.intraState
    ? "Intra-state supply — CGST + SGST"
    : "Inter-state supply — IGST";

  $("pvLines").innerHTML = c.lines.map((l) => `
    <tr>
      <td class="c-desc">${escapeHtml(l.description) || "<span class='muted'>Untitled item</span>"}</td>
      <td class="c-hsn">${escapeHtml(l.hsn)}</td>
      <td class="c-num">${escapeHtml(l.qty)}</td>
      <td class="c-num">${money(l.rate, cur)}</td>
      <td class="c-num">${l.gstRate}%</td>
      <td class="c-num">${money(l.taxable, cur)}</td>
      <td class="c-num">${money(l.tax, cur)}</td>
      <td class="c-num">${money(l.total, cur)}</td>
    </tr>
  `).join("");

  $("pvTaxSummary").innerHTML = `
    <thead><tr>
      <th>Rate</th><th>Taxable</th>
      ${c.intraState ? "<th>CGST</th><th>SGST</th>" : "<th>IGST</th>"}
    </tr></thead>
    <tbody>
      ${c.rateGroups.map((g) => `
        <tr>
          <td>${g.rate}%</td>
          <td>${money(g.taxable, cur)}</td>
          ${c.intraState
            ? "<td>" + money(round2(g.tax / 2), cur) + "</td><td>" + money(round2(g.tax / 2), cur) + "</td>"
            : "<td>" + money(g.tax, cur) + "</td>"}
        </tr>
      `).join("") || '<tr><td colspan="4" class="muted">No taxable items yet</td></tr>'}
    </tbody>`;

  const rows = [["Taxable value", money(c.taxableTotal, cur)]];
  if (c.discountAmount > 0) rows.push(["Discount (" + state.discountPct + "%)", "−" + money(c.discountAmount, cur)]);
  if (c.intraState) {
    rows.push(["CGST", money(round2(c.taxTotal / 2), cur)]);
    rows.push(["SGST", money(round2(c.taxTotal / 2), cur)]);
  } else {
    rows.push(["IGST", money(c.taxTotal, cur)]);
  }
  if (c.shipping > 0) rows.push(["Shipping", money(c.shipping, cur)]);

  $("pvTotals").innerHTML =
    rows.map(([label, value]) => "<tr><td>" + label + "</td><td>" + value + "</td></tr>").join("") +
    '<tr class="grand"><td>Total</td><td>' + money(c.grandTotal, cur) + "</td></tr>";

  $("pvWords").textContent = amountInWords(c.grandTotal, cur);
  $("pvNotes").textContent = state.notes;

  showGstinHint("sellerGstin", "sellerGstinHint");
  showGstinHint("buyerGstin", "buyerGstinHint");
}

function showGstinHint(inputId, hintId) {
  const { level, message } = validateGstin($(inputId).value);
  const hint = $(hintId);
  hint.textContent = message;
  hint.className = "hint " + level;
}

function update() {
  readInputsIntoState();
  renderPreview();
  save();
}

/* ── Events ───────────────────────────────────────────────────────────────── */

function attachEvents() {
  FIELDS.forEach((field) => {
    const el = $(field);
    if (el) el.addEventListener("input", update);
  });

  $("itemRows").addEventListener("input", (e) => {
    const row = e.target.closest(".item-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    const field = e.target.dataset.field;
    if (!field || !state.items[index]) return;
    const raw = e.target.value;
    state.items[index][field] = e.target.type === "number" || field === "gst" ? Number(raw) : raw;
    renderPreview();
    save();
  });

  $("itemRows").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const index = Number(btn.dataset.remove);
    state.items.splice(index, 1);
    // Always leave one editable row rather than an empty, dead-looking form.
    if (state.items.length === 0) state.items.push(blankItem());
    renderItemRows();
    renderPreview();
    save();
  });

  $("addItem").addEventListener("click", () => {
    state.items.push(blankItem());
    renderItemRows();
    renderPreview();
    save();
  });

  $("printBtn").addEventListener("click", () => window.print());

  $("loadSample").addEventListener("click", () => {
    state = JSON.parse(JSON.stringify(SAMPLE));
    syncInputsFromState();
    renderPreview();
    save();
  });

  $("resetAll").addEventListener("click", () => {
    if (!confirm("Clear this invoice and start over?")) return;
    state = {
      sellerName: "", sellerGstin: "", sellerAddress: "", sellerState: "27", sellerEmail: "",
      buyerName: "", buyerGstin: "", buyerAddress: "", buyerState: "27",
      invoiceNo: "", invoiceDate: todayISO(), dueDate: addDaysISO(todayISO(), 15),
      currency: "INR", items: [blankItem()], discountPct: 0, shipping: 0, notes: "",
    };
    syncInputsFromState();
    renderPreview();
    save();
  });
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */

fillStateSelects();
if (!load()) {
  state.invoiceDate = todayISO();
  state.dueDate = addDaysISO(state.invoiceDate, 15);
}
syncInputsFromState();
attachEvents();
renderPreview();
