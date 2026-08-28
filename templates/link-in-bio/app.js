/* Link-in-bio renderer.
 * ---------------------------------------------------------------------------
 * Reads window.PROFILE (profile.js) and builds the page. Everything the owner
 * edits lives in that one config file; this file should not normally need
 * changing.
 *
 * Deliberately dependency-free: no framework, no fonts loaded over the network,
 * no analytics beacon. A link page that pulls in three third-party scripts to
 * show six links is the thing this template exists to avoid.
 */

"use strict";

const P = window.PROFILE || {};

const $ = (id) => document.getElementById(id);

/* Inline SVG paths, so no icon font or sprite sheet has to be fetched. */
const ICONS = {
  github: "M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z",
  linkedin: "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.36-1.85c3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z",
  x: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.11z",
  instagram: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.89 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.28 2.69.08 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z",
};

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/**
 * Only allow protocols that make sense for a public link page.
 *
 * Without this, a `javascript:` URL pasted into profile.js would run as soon as
 * a visitor clicked the link. The config is trusted, but a link page is exactly
 * the kind of file that gets edited by someone pasting a URL from elsewhere.
 */
function safeUrl(url) {
  try {
    const parsed = new URL(String(url), window.location.href);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? parsed.href : "#";
  } catch (err) {
    return "#";
  }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ── Render ───────────────────────────────────────────────────────────────── */

function renderProfile() {
  document.documentElement.dataset.theme = P.theme || "midnight";

  const title = (P.name || "Links") + (P.handle ? " — " + P.handle : "");
  document.title = title;

  $("name").textContent = P.name || "Your name";
  $("handle").textContent = P.handle || "";
  $("bio").textContent = P.bio || "";

  const avatar = $("avatar");
  if (P.avatarImage) {
    avatar.style.backgroundImage = `url("${encodeURI(P.avatarImage)}")`;
    avatar.classList.add("has-image");
  } else {
    // Initials rather than a broken <img>, so an unconfigured page still looks
    // finished instead of looking broken.
    avatar.textContent = P.initials || (P.name || "?").slice(0, 1).toUpperCase();
  }
}

function renderLinks() {
  const links = Array.isArray(P.links) ? P.links : [];
  $("links").innerHTML = links.map((link) => `
    <a class="link${link.featured ? " featured" : ""}"
       href="${escapeHtml(safeUrl(link.url))}"
       target="_blank" rel="noopener noreferrer">
      ${link.emoji ? `<span class="emoji" aria-hidden="true">${escapeHtml(link.emoji)}</span>` : ""}
      <span class="label">${escapeHtml(link.label)}</span>
      ${link.badge ? `<span class="badge">${escapeHtml(link.badge)}</span>` : ""}
      <span class="chev" aria-hidden="true">→</span>
    </a>
  `).join("");
}

function renderSocials() {
  const socials = Array.isArray(P.socials) ? P.socials : [];
  $("socials").innerHTML = socials.map((s) => {
    const path = ICONS[s.icon];
    const inner = path
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`
      : escapeHtml(s.label.slice(0, 2));
    return `<li><a href="${escapeHtml(safeUrl(s.url))}" target="_blank"
      rel="noopener noreferrer" title="${escapeHtml(s.label)}"
      aria-label="${escapeHtml(s.label)}">${inner}</a></li>`;
  }).join("");
}

function renderNow() {
  if (!P.now) return;
  $("nowCard").hidden = false;
  $("nowText").textContent = P.now;
}

function renderFooter() {
  $("footNote").textContent = P.footer || "";
}

/* ── Share ────────────────────────────────────────────────────────────────── */

$("shareBtn").addEventListener("click", async () => {
  const url = window.location.href;
  // navigator.share is the good path on mobile; the clipboard is the fallback,
  // and a plain prompt covers the browsers with neither.
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // user dismissed the sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (err) {
    window.prompt("Copy this link:", url);
  }
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

renderProfile();
renderLinks();
renderSocials();
renderNow();
renderFooter();
