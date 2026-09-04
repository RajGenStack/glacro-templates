/* ────────────────────────────────────────────────────────────────────────────
   Rent Receipt Generator

   Produces one receipt per month across a chosen range, for claiming HRA
   exemption. Everything runs in the page: no network, no storage, no upload.

   Two Indian rules are encoded here because getting either wrong is what makes
   a receipt bounce back from a payroll team:

   - PAN of the landlord is required when the annual rent exceeds ₹1,00,000.
     The form asks for it always but only *insists* past that threshold, and
     says which case you are in rather than leaving you to guess.

   - A revenue stamp is expected on cash payments above ₹5,000 per receipt.
     Bank transfer, UPI and cheque leave a trail of their own and do not need
     one, so the note only appears when it actually applies.
   ──────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var PAN_THRESHOLD_ANNUAL = 100000;
  var STAMP_THRESHOLD_CASH = 5000;
  var PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    tenant: $("tenant"),
    landlord: $("landlord"),
    address: $("address"),
    rent: $("rent"),
    payMode: $("payMode"),
    fromMonth: $("fromMonth"),
    toMonth: $("toMonth"),
    pan: $("pan")
  };

  var receiptsEl = $("receipts");
  var emptyEl = $("emptyState");
  var summaryEl = $("summary");
  var stampNote = $("stampNote");
  var panHint = $("panHint");
  var formError = $("formError");

  var MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

  function inr(n) {
    // Indian digit grouping: 1,00,000 rather than 100,000.
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** "2026-04" -> {y:2026, m:3}. Returns null for anything unparseable. */
  function parseMonth(value) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
    if (!m) return null;
    var month = Number(m[2]) - 1;
    if (month < 0 || month > 11) return null;
    return { y: Number(m[1]), m: month };
  }

  /** Inclusive list of months from a to b. Empty if b precedes a. */
  function monthRange(a, b) {
    var out = [];
    if (!a || !b) return out;
    var y = a.y, m = a.m;
    // Guard against a range so large the page would lock up. Ten years is far
    // beyond any real HRA claim and keeps a fat-fingered year from hanging it.
    var guard = 0;
    while ((y < b.y || (y === b.y && m <= b.m)) && guard < 120) {
      out.push({ y: y, m: m });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      guard += 1;
    }
    return out;
  }

  /** Last day of the month, which is when rent for that month is receipted. */
  function receiptDate(y, m) {
    var d = new Date(y, m + 1, 0);
    return String(d.getDate()).padStart(2, "0") + " " + MONTHS[m].slice(0, 3) + " " + y;
  }

  function showError(msg) {
    if (!msg) { formError.hidden = true; formError.textContent = ""; return; }
    formError.hidden = false;
    formError.textContent = msg;
  }

  function render() {
    var rent = Number(fields.rent.value) || 0;
    var from = parseMonth(fields.fromMonth.value);
    var to = parseMonth(fields.toMonth.value);
    var months = monthRange(from, to);
    var pan = fields.pan.value.trim().toUpperCase();
    var mode = fields.payMode.value;

    // ── Guidance that depends on the numbers ──────────────────────────────
    var annual = rent * months.length;
    var panNeeded = annual > PAN_THRESHOLD_ANNUAL;

    panHint.textContent = panNeeded
      ? "Annual rent is " + inr(annual) + ", above " + inr(PAN_THRESHOLD_ANNUAL) +
        " — your employer will ask for the landlord's PAN."
      : "Required by the employer only when annual rent is above " + inr(PAN_THRESHOLD_ANNUAL) + ".";
    panHint.className = panNeeded ? "hint warn" : "hint";

    var needsStamp = mode === "Cash" && rent > STAMP_THRESHOLD_CASH;
    if (needsStamp) {
      stampNote.hidden = false;
      stampNote.textContent =
        "Cash above " + inr(STAMP_THRESHOLD_CASH) + " per receipt: affix a ₹1 revenue stamp " +
        "and have the landlord sign across it.";
    } else {
      stampNote.hidden = true;
    }

    // ── Validation that only speaks once there is something to judge ──────
    if (fields.fromMonth.value && fields.toMonth.value && months.length === 0) {
      showError("The 'To' month is before the 'From' month.");
    } else if (pan && !PAN_RE.test(pan)) {
      showError("That PAN does not look right. The format is five letters, four digits, one letter.");
    } else {
      showError("");
    }

    // ── Receipts ──────────────────────────────────────────────────────────
    if (!months.length || rent <= 0) {
      receiptsEl.innerHTML = "";
      emptyEl.hidden = false;
      summaryEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    summaryEl.hidden = false;
    summaryEl.textContent =
      months.length + (months.length === 1 ? " receipt" : " receipts") +
      " · " + inr(annual) + " total";

    var tenant = fields.tenant.value.trim();
    var landlord = fields.landlord.value.trim();
    var address = fields.address.value.trim();

    receiptsEl.innerHTML = months.map(function (mm) {
      return (
        '<article class="receipt">' +
          '<div class="r-head">' +
            '<h3>Rent Receipt</h3>' +
            '<span class="r-period">' + escapeHtml(MONTHS[mm.m] + " " + mm.y) + "</span>" +
          "</div>" +
          '<p class="r-line">' +
            "Received a sum of <strong>" + escapeHtml(inr(rent)) + "</strong> from " +
            "<strong>" + escapeHtml(tenant || "—") + "</strong> towards rent for the month of " +
            "<strong>" + escapeHtml(MONTHS[mm.m] + " " + mm.y) + "</strong>, " +
            "for the premises at <strong>" + escapeHtml(address || "—") + "</strong>, " +
            "paid by " + escapeHtml(mode.toLowerCase()) + "." +
          "</p>" +
          '<div class="r-foot">' +
            '<div class="r-meta">' +
              "<div><span>Date</span><strong>" + escapeHtml(receiptDate(mm.y, mm.m)) + "</strong></div>" +
              (pan ? "<div><span>Landlord PAN</span><strong>" + escapeHtml(pan) + "</strong></div>" : "") +
            "</div>" +
            '<div class="r-sign">' +
              (needsStamp ? '<div class="stamp">Revenue<br>stamp</div>' : "") +
              '<div class="sign-line"></div>' +
              "<span>" + escapeHtml(landlord || "Landlord") + "</span>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  Object.keys(fields).forEach(function (k) {
    fields[k].addEventListener("input", render);
    fields[k].addEventListener("change", render);
  });

  $("printBtn").addEventListener("click", function () { window.print(); });

  $("resetAll").addEventListener("click", function () {
    Object.keys(fields).forEach(function (k) {
      if (fields[k].tagName === "SELECT") fields[k].selectedIndex = 0;
      else fields[k].value = "";
    });
    render();
  });

  $("loadSample").addEventListener("click", function () {
    fields.tenant.value = "Ananya Rao";
    fields.landlord.value = "S. Krishnan";
    fields.address.value = "Flat 402, Brigade Palm Court, Kadubeesanahalli, Bengaluru 560103";
    fields.rent.value = "24000";
    fields.payMode.value = "Bank transfer";
    fields.fromMonth.value = "2026-04";
    fields.toMonth.value = "2027-03";
    fields.pan.value = "ABCDE1234F";
    render();
  });

  render();
})();
