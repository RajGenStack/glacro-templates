/* QR restaurant menu.
 * ---------------------------------------------------------------------------
 * Renders window.MENU (menu-data.js). Built for the phone someone is holding at
 * a table: no framework, no web fonts, no images to download over restaurant
 * wifi. The whole page is a few kilobytes, so it appears more or less instantly
 * after the QR scan.
 */

"use strict";

const MENU = window.MENU || {};
const $ = (id) => document.getElementById(id);

let query = "";
let diet = "all";

const DIET_LABEL = { veg: "Vegetarian", egg: "Contains egg", nonveg: "Non-vegetarian" };

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const slug = (text) =>
  String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

/* ── Header ───────────────────────────────────────────────────────────────── */

function renderHeader() {
  const r = MENU.restaurant || {};
  document.title = (r.name || "Menu") + " — Menu";
  $("kicker").textContent = r.kicker || "";
  $("restaurantName").textContent = r.name || "Menu";
  $("tagline").textContent = r.tagline || "";
  $("meta").textContent = r.meta || "";
  $("footNote").textContent = r.footer || "";
  $("disclaimer").textContent = r.disclaimer || "";
}

/* ── Filtering ────────────────────────────────────────────────────────────── */

function matches(item) {
  if (diet !== "all" && item.diet !== diet) return false;
  if (!query) return true;
  const haystack = [
    item.name,
    item.description,
    ...(item.tags || []),
    ...(item.allergens || []),
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

function spiceMarks(level) {
  const n = Math.max(0, Math.min(3, Number(level) || 0));
  if (n === 0) return "";
  return `<span class="spice" title="Spice level ${n} of 3" aria-label="Spice level ${n} of 3">${"🌶".repeat(n)}</span>`;
}

function renderItem(item) {
  const diet = item.diet || "veg";
  return `
    <li class="item">
      <span class="mark ${escapeHtml(diet)}" title="${escapeHtml(DIET_LABEL[diet] || diet)}"
            aria-label="${escapeHtml(DIET_LABEL[diet] || diet)}"></span>
      <div class="item-body">
        <div class="item-head">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="price">${escapeHtml(money(item.price))}</span>
        </div>
        ${item.description ? `<p class="desc">${escapeHtml(item.description)}</p>` : ""}
        <div class="badges">
          ${spiceMarks(item.spice)}
          ${(item.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          ${(item.allergens || []).length
            ? `<span class="allergen">Contains ${escapeHtml(item.allergens.join(", ").toLowerCase())}</span>`
            : ""}
        </div>
      </div>
    </li>`;
}

function renderMenu() {
  const sections = (MENU.sections || [])
    .map((section) => ({ ...section, items: (section.items || []).filter(matches) }))
    .filter((section) => section.items.length > 0);

  $("noResults").hidden = sections.length > 0;

  $("menu").innerHTML = sections.map((section) => `
    <section class="section" id="sec-${escapeHtml(slug(section.name))}">
      <div class="section-head">
        <h2>${escapeHtml(section.name)}</h2>
        ${section.note ? `<p>${escapeHtml(section.note)}</p>` : ""}
      </div>
      <ul class="items">${section.items.map(renderItem).join("")}</ul>
    </section>`).join("");

  // The jump bar only lists sections that survived the current filter — links
  // to a section that is not on the page would just scroll nowhere.
  $("jump").innerHTML = sections.map((s) =>
    `<a href="#sec-${escapeHtml(slug(s.name))}">${escapeHtml(s.name)}</a>`
  ).join("");
}

/* ── Events ───────────────────────────────────────────────────────────────── */

let searchTimer = null;
$("search").addEventListener("input", (e) => {
  const value = e.target.value.trim().toLowerCase();
  // Debounced: re-rendering the whole menu on every keystroke is visibly janky
  // on the mid-range phones this is actually read on.
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    query = value;
    renderMenu();
  }, 120);
});

$("dietFilters").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-diet]");
  if (!btn) return;
  diet = btn.dataset.diet;
  $("dietFilters").querySelectorAll(".filter").forEach((b) => b.classList.toggle("on", b === btn));
  renderMenu();
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

renderHeader();
renderMenu();
