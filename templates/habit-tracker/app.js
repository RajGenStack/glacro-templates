/* Streak — habit tracker
 * ---------------------------------------------------------------------------
 * Offline by design: no accounts, no server, no network calls. Habits and their
 * completion history live in localStorage, and Export/Import move that data as
 * a JSON file so the browser is not the only copy.
 *
 * Dates are handled as local "YYYY-MM-DD" strings rather than Date objects in
 * UTC. Using toISOString() would roll a late-evening tick over to tomorrow for
 * anyone east of UTC — including all of India — which in a streak tracker means
 * silently breaking the streak the user just kept.
 */

"use strict";

const STORAGE_KEY = "streak-habit-tracker:v1";
const THEME_KEY = "streak-habit-tracker:theme";

const COLORS = ["#2f7d5c", "#2563eb", "#b4530a", "#8b2fa8", "#b3264a", "#0f766e"];

/* ── Local-date helpers ───────────────────────────────────────────────────── */

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  return toKey(new Date());
}

function shiftDays(key, delta) {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

/* ── State ────────────────────────────────────────────────────────────────── */

let habits = [];
let selectedColor = COLORS[0];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) habits = parsed.filter(isHabit);
  } catch (err) {
    console.warn("Could not read saved habits:", err);
  }
}

function isHabit(h) {
  return h && typeof h.id === "string" && typeof h.name === "string" && Array.isArray(h.done);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (err) {
    // Storage can be unavailable (private mode, quota). The app stays usable
    // for this session rather than throwing in the user's face.
    console.warn("Could not save habits:", err);
  }
}

/* ── Streak maths ─────────────────────────────────────────────────────────── */

/**
 * Current run of consecutive completed days ending today.
 *
 * Yesterday is allowed as the anchor so a streak is not reported as broken
 * simply because today has not been ticked yet — it only breaks once a full
 * day has been missed.
 */
function currentStreak(done) {
  const set = new Set(done);
  let cursor = todayKey();
  if (!set.has(cursor)) {
    cursor = shiftDays(cursor, -1);
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive days anywhere in the history. */
function longestStreak(done) {
  if (done.length === 0) return 0;
  const sorted = [...new Set(done)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = shiftDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

function completionRate(days) {
  if (habits.length === 0) return null;
  let hits = 0;
  const total = habits.length * days;
  for (let i = 0; i < days; i++) {
    const key = shiftDays(todayKey(), -i);
    hits += habits.filter((h) => h.done.includes(key)).length;
  }
  return Math.round((hits / total) * 100);
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function renderColorPicker() {
  $("colorPicker").innerHTML = COLORS.map((c) => `
    <button type="button" role="radio" class="swatch${c === selectedColor ? " on" : ""}"
            style="--c:${c}" data-color="${c}"
            aria-checked="${c === selectedColor}" aria-label="Colour ${c}"></button>
  `).join("");
}

/** The seven days ending today, oldest first — the row of ticks on each habit. */
function recentDays() {
  const out = [];
  for (let i = 6; i >= 0; i--) out.push(shiftDays(todayKey(), -i));
  return out;
}

function renderHabits() {
  const days = recentDays();
  const today = todayKey();

  $("emptyState").hidden = habits.length > 0;

  $("habitList").innerHTML = habits.map((h) => {
    const streak = currentStreak(h.done);
    return `
      <li class="habit" style="--c:${escapeHtml(h.color)}" data-id="${escapeHtml(h.id)}">
        <div class="habit-main">
          <button type="button" class="tick${h.done.includes(today) ? " on" : ""}"
                  data-toggle="${escapeHtml(today)}"
                  aria-pressed="${h.done.includes(today)}"
                  aria-label="Mark ${escapeHtml(h.name)} done today"></button>
          <div class="habit-text">
            <strong>${escapeHtml(h.name)}</strong>
            <small>${streak > 0 ? "🔥 " + streak + " day streak" : "No active streak"}
              · best ${longestStreak(h.done)} · ${h.done.length} total</small>
          </div>
          <button type="button" class="del" data-delete aria-label="Delete ${escapeHtml(h.name)}">&times;</button>
        </div>
        <div class="week">
          ${days.map((d) => `
            <button type="button" class="day${h.done.includes(d) ? " on" : ""}"
                    data-toggle="${d}" aria-pressed="${h.done.includes(d)}"
                    title="${d}">
              <span>${["S","M","T","W","T","F","S"][fromKey(d).getDay()]}</span>
            </button>`).join("")}
        </div>
      </li>`;
  }).join("");
}

function renderSummary() {
  const today = todayKey();
  const doneToday = habits.filter((h) => h.done.includes(today)).length;
  $("statToday").textContent = `${doneToday}/${habits.length}`;
  $("statBest").textContent = habits.reduce((best, h) => Math.max(best, longestStreak(h.done)), 0);
  const rate = completionRate(30);
  // A rate of 0% is a real answer and must not be shown as "—", which means
  // "we have nothing to tell you".
  $("statRate").textContent = rate === null ? "—" : rate + "%";
}

function renderHeatmapSelect() {
  const select = $("heatmapHabit");
  const previous = select.value;
  select.innerHTML =
    '<option value="__all">All habits</option>' +
    habits.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)}</option>`).join("");
  if (previous && [...select.options].some((o) => o.value === previous)) select.value = previous;
}

function renderHeatmap() {
  const which = $("heatmapHabit").value || "__all";
  const tracked = which === "__all" ? habits : habits.filter((h) => h.id === which);
  const maxPerDay = Math.max(tracked.length, 1);

  // 53 weeks back, aligned so each column is a calendar week starting Sunday.
  const end = new Date();
  end.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(end);
  start.setDate(start.getDate() - 52 * 7 - 6);

  const cells = [];
  const cursor = new Date(start);
  const today = todayKey();

  while (cursor <= end) {
    const key = toKey(cursor);
    const future = key > today;
    const count = future ? 0 : tracked.filter((h) => h.done.includes(key)).length;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxPerDay) * 4));
    cells.push(
      `<i class="cell lv${level}${future ? " future" : ""}" title="${key}: ${count} of ${maxPerDay}"></i>`
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  $("heatmap").innerHTML = cells.join("");
}

function renderAll() {
  renderHabits();
  renderSummary();
  renderHeatmapSelect();
  renderHeatmap();
}

/* ── Events ───────────────────────────────────────────────────────────────── */

$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("habitName").value.trim();
  if (!name) return;
  habits.push({
    id: "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    color: selectedColor,
    done: [],
    createdAt: todayKey(),
  });
  $("habitName").value = "";
  save();
  renderAll();
});

$("colorPicker").addEventListener("click", (e) => {
  const swatch = e.target.closest("[data-color]");
  if (!swatch) return;
  selectedColor = swatch.dataset.color;
  renderColorPicker();
});

$("habitList").addEventListener("click", (e) => {
  const li = e.target.closest(".habit");
  if (!li) return;
  const habit = habits.find((h) => h.id === li.dataset.id);
  if (!habit) return;

  if (e.target.closest("[data-delete]")) {
    if (!confirm(`Delete "${habit.name}" and its history?`)) return;
    habits = habits.filter((h) => h.id !== habit.id);
    save();
    renderAll();
    return;
  }

  const toggle = e.target.closest("[data-toggle]");
  if (!toggle) return;
  const day = toggle.dataset.toggle;
  const at = habit.done.indexOf(day);
  if (at >= 0) habit.done.splice(at, 1);
  else habit.done.push(day);
  save();
  renderAll();
});

$("heatmapHabit").addEventListener("change", renderHeatmap);

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(habits, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habits-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed) || !parsed.every(isHabit)) {
      alert("That file does not look like a habits export.");
      return;
    }
    if (habits.length && !confirm("Replace your current habits with this file?")) return;
    habits = parsed;
    save();
    renderAll();
  } catch (err) {
    alert("Could not read that file: " + err.message);
  } finally {
    e.target.value = "";
  }
});

$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) { /* storage unavailable — theme just won't persist */ }
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;
} catch (err) { /* ignore */ }

$("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", day: "numeric", month: "long",
});

load();
renderColorPicker();
renderAll();
