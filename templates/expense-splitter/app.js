/* Split — shared expense splitter
 * ---------------------------------------------------------------------------
 * Records who paid for what, then works out the smallest set of payments that
 * clears everyone's debts. No accounts, no server; state lives in localStorage.
 *
 * The interesting part is settle(): the naive approach has everyone who owes
 * pay everyone they owe, which for six people on a trip is a dozen separate
 * transfers. Greedily matching the largest debtor against the largest creditor
 * clears the same balances in far fewer payments.
 */

"use strict";

const STORAGE_KEY = "split-expenses:v1";

let people = [];    // [{ id, name }]
let expenses = [];  // [{ id, desc, amount, payerId, shares: { personId: amount } }]

/* ── Money ────────────────────────────────────────────────────────────────── */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const money = (n) =>
  "₹" + Math.abs(Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

/**
 * Splits an amount into `count` shares that sum EXACTLY to the amount.
 *
 * ₹100 between 3 people is 33.33 each, which totals 99.99 — so someone is a
 * paisa short and the balances never quite reach zero. The remainder is spread
 * one paisa at a time across the first few shares instead.
 */
function splitEvenly(amount, count) {
  const totalPaise = Math.round(amount * 100);
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

/* ── Persistence ──────────────────────────────────────────────────────────── */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ people, expenses }));
  } catch (err) {
    console.warn("Could not save:", err);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.people)) people = parsed.people;
    if (Array.isArray(parsed.expenses)) expenses = parsed.expenses;
  } catch (err) {
    console.warn("Could not load saved data:", err);
  }
}

/* ── Core calculation ─────────────────────────────────────────────────────── */

/** Net position per person: positive means they are owed, negative means they owe. */
function balances() {
  const net = Object.fromEntries(people.map((p) => [p.id, 0]));

  for (const exp of expenses) {
    if (net[exp.payerId] === undefined) continue; // payer was deleted
    net[exp.payerId] = round2(net[exp.payerId] + exp.amount);
    for (const [personId, share] of Object.entries(exp.shares)) {
      if (net[personId] === undefined) continue;
      net[personId] = round2(net[personId] - share);
    }
  }

  return net;
}

/**
 * The smallest practical set of transfers that clears every balance.
 *
 * Repeatedly matches the person who owes the most against the person owed the
 * most and transfers the smaller of the two amounts. That settles at least one
 * person completely on every pass, so at most (n - 1) payments are needed
 * rather than one per debtor/creditor pair.
 */
function settle(net) {
  const debtors = [];
  const creditors = [];

  for (const [id, amount] of Object.entries(net)) {
    // Sub-paisa residue is not a real debt; ignoring it stops the list ending
    // with "Asha pays Ravi ₹0.00".
    if (amount < -0.005) debtors.push({ id, amount: -amount });
    else if (amount > 0.005) creditors.push({ id, amount });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });

    debtors[i].amount = round2(debtors[i].amount - pay);
    creditors[j].amount = round2(creditors[j].amount - pay);

    if (debtors[i].amount <= 0.005) i++;
    if (creditors[j].amount <= 0.005) j++;
  }

  return transfers;
}

/* ── DOM ──────────────────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

const nameOf = (id) => (people.find((p) => p.id === id) || {}).name || "someone";

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function currentMode() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return checked ? checked.value : "equal";
}

function renderPeople() {
  $("peopleList").innerHTML = people.map((p) => `
    <li class="chip">
      ${escapeHtml(p.name)}
      <button type="button" data-remove-person="${escapeHtml(p.id)}" aria-label="Remove ${escapeHtml(p.name)}">&times;</button>
    </li>`).join("");

  $("peopleHint").hidden = people.length >= 2;

  $("expPayer").innerHTML = people
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
    .join("");

  renderParticipants();
  $("addExpenseBtn").disabled = people.length < 2;
}

function renderParticipants() {
  const exact = currentMode() === "exact";
  $("participants").innerHTML = people.map((p) => `
    <div class="participant">
      <label class="who">
        <input type="checkbox" data-person="${escapeHtml(p.id)}" checked>
        <span>${escapeHtml(p.name)}</span>
      </label>
      ${exact
        ? `<input type="number" class="exact" data-exact="${escapeHtml(p.id)}" min="0" step="0.01" placeholder="0.00">`
        : ""}
    </div>`).join("");
  $("splitHint").textContent = exact
    ? "Exact amounts must add up to the total."
    : "";
}

function renderBalances() {
  const net = balances();
  const anyExpense = expenses.length > 0;
  $("balancesHint").hidden = anyExpense;

  $("balances").innerHTML = people.map((p) => {
    const value = round2(net[p.id] || 0);
    // Exactly zero is a real, settled state and gets its own label rather than
    // being lumped in with "owes".
    const cls = value > 0.005 ? "up" : value < -0.005 ? "down" : "level";
    const text = value > 0.005 ? "is owed " + money(value)
      : value < -0.005 ? "owes " + money(value)
      : "settled up";
    return `<li class="balance ${cls}">
      <span class="who">${escapeHtml(p.name)}</span>
      <span class="amt">${text}</span>
    </li>`;
  }).join("");
}

function renderSettlements() {
  const transfers = settle(balances());
  const lede = $("settleLede");

  if (expenses.length === 0) {
    lede.textContent = "Add an expense and the payments to make will appear here.";
    $("settlements").innerHTML = "";
    return;
  }

  if (transfers.length === 0) {
    lede.textContent = "Everyone is square — no payments needed.";
    $("settlements").innerHTML = "";
    return;
  }

  lede.textContent =
    transfers.length === 1
      ? "One payment settles the whole group."
      : `${transfers.length} payments settle the whole group.`;

  $("settlements").innerHTML = transfers.map((t) => `
    <li>
      <span class="from">${escapeHtml(nameOf(t.from))}</span>
      <span class="arrow" aria-hidden="true">→</span>
      <span class="to">${escapeHtml(nameOf(t.to))}</span>
      <span class="amt">${money(t.amount)}</span>
    </li>`).join("");
}

function renderExpenses() {
  $("expenseCount").textContent = expenses.length ? `(${expenses.length})` : "";
  $("expenses").innerHTML = expenses.map((e) => `
    <li class="expense">
      <div>
        <strong>${escapeHtml(e.desc)}</strong>
        <small>${escapeHtml(nameOf(e.payerId))} paid · split ${Object.keys(e.shares).length} ways</small>
      </div>
      <span class="amt">${money(e.amount)}</span>
      <button type="button" data-remove-expense="${escapeHtml(e.id)}" aria-label="Delete ${escapeHtml(e.desc)}">&times;</button>
    </li>`).join("") || '<li class="none">Nothing yet.</li>';
}

function renderAll() {
  renderPeople();
  renderBalances();
  renderSettlements();
  renderExpenses();
}

/* ── Events ───────────────────────────────────────────────────────────────── */

$("personForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("personName").value.trim();
  if (!name) return;
  if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    alert(`"${name}" is already in the group.`);
    return;
  }
  people.push({ id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name });
  $("personName").value = "";
  save();
  renderAll();
});

$("peopleList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-person]");
  if (!btn) return;
  const id = btn.dataset.removePerson;
  const involved = expenses.some((x) => x.payerId === id || x.shares[id] !== undefined);
  if (involved && !confirm(`${nameOf(id)} appears in existing expenses. Remove anyway?`)) return;
  people = people.filter((p) => p.id !== id);
  save();
  renderAll();
});

document.querySelectorAll('input[name="mode"]').forEach((radio) =>
  radio.addEventListener("change", renderParticipants)
);

$("expenseForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const desc = $("expDesc").value.trim();
  const amount = round2($("expAmount").value);
  const payerId = $("expPayer").value;

  if (!desc || !(amount > 0) || !payerId) return;

  const checked = [...document.querySelectorAll("[data-person]:checked")].map((c) => c.dataset.person);
  if (checked.length === 0) {
    alert("Pick at least one person to split this between.");
    return;
  }

  const shares = {};

  if (currentMode() === "exact") {
    let sum = 0;
    for (const id of checked) {
      const field = document.querySelector(`[data-exact="${id}"]`);
      const value = round2(field ? field.value : 0);
      shares[id] = value;
      sum = round2(sum + value);
    }
    // Refuse rather than silently rebalancing: an expense whose parts do not
    // add up to the total would quietly corrupt every balance after it.
    if (Math.abs(sum - amount) > 0.005) {
      alert(`The exact amounts add up to ${money(sum)}, but the expense is ${money(amount)}.`);
      return;
    }
  } else {
    const parts = splitEvenly(amount, checked.length);
    checked.forEach((id, i) => { shares[id] = parts[i]; });
  }

  expenses.unshift({
    id: "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    desc, amount, payerId, shares,
    createdAt: new Date().toISOString(),
  });

  $("expDesc").value = "";
  $("expAmount").value = "";
  renderParticipants();
  save();
  renderAll();
});

$("expenses").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-expense]");
  if (!btn) return;
  expenses = expenses.filter((x) => x.id !== btn.dataset.removeExpense);
  save();
  renderAll();
});

$("clearBtn").addEventListener("click", () => {
  if (!confirm("Clear all people and expenses?")) return;
  people = [];
  expenses = [];
  save();
  renderAll();
});

$("sampleBtn").addEventListener("click", () => {
  people = [
    { id: "p_asha", name: "Asha" },
    { id: "p_ravi", name: "Ravi" },
    { id: "p_meera", name: "Meera" },
    { id: "p_dev", name: "Dev" },
  ];
  const equal = (amount, ids) => {
    const parts = splitEvenly(amount, ids.length);
    return Object.fromEntries(ids.map((id, i) => [id, parts[i]]));
  };
  const all = people.map((p) => p.id);
  expenses = [
    { id: "e1", desc: "Airbnb in Coorg (2 nights)", amount: 18400, payerId: "p_asha", shares: equal(18400, all) },
    { id: "e2", desc: "Cab from the airport", amount: 3100, payerId: "p_ravi", shares: equal(3100, all) },
    { id: "e3", desc: "Groceries", amount: 2650, payerId: "p_meera", shares: equal(2650, all) },
    { id: "e4", desc: "Dinner at Toit", amount: 4700, payerId: "p_dev", shares: equal(4700, ["p_asha", "p_ravi", "p_dev"]) },
    { id: "e5", desc: "Coffee estate tour", amount: 2400, payerId: "p_asha", shares: equal(2400, all) },
  ];
  save();
  renderAll();
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

load();
renderAll();
