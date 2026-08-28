/* ═══════════════════════════════════════════════════════════════════════════
 * EDIT THIS FILE — it is the whole configuration for the page.
 *
 * Nothing else needs touching to make this yours. No build step, no npm
 * install, no framework: change the values below, redeploy, done.
 * ═══════════════════════════════════════════════════════════════════════════ */

window.PROFILE = {
  /* ── Identity ─────────────────────────────────────────────────────────── */
  name: "Aarav Mehta",
  handle: "@aaravbuilds",
  bio: "Product designer in Bengaluru. I make small tools that respect your attention.",

  /* Initials are drawn when no avatar image is set, so the page never shows a
     broken image or an empty circle. Point `avatarImage` at a file to use a photo. */
  avatarImage: null,
  initials: "AM",

  /* ── Theme ────────────────────────────────────────────────────────────────
   * One of: "midnight", "sunrise", "forest", "paper", "grape".
   * Each is defined in styles.css — add your own there. */
  theme: "midnight",

  /* ── Links ────────────────────────────────────────────────────────────────
   * `featured: true` gives a link the larger highlighted treatment.
   * `badge` prints a small tag on the right. Both are optional. */
  links: [
    { label: "Read the newsletter", url: "https://example.com/newsletter", emoji: "📬", featured: true, badge: "Weekly" },
    { label: "Design portfolio", url: "https://example.com/work", emoji: "🎨" },
    { label: "Book a 1:1 call", url: "https://example.com/call", emoji: "📅", badge: "3 slots" },
    { label: "Open-source projects", url: "https://github.com/", emoji: "⚙️" },
    { label: "The gear I actually use", url: "https://example.com/gear", emoji: "🎧" },
    { label: "Email me", url: "mailto:hello@example.com", emoji: "✉️" },
  ],

  /* ── Social icons row ─────────────────────────────────────────────────── */
  socials: [
    { label: "GitHub", url: "https://github.com/", icon: "github" },
    { label: "LinkedIn", url: "https://linkedin.com/", icon: "linkedin" },
    { label: "X", url: "https://x.com/", icon: "x" },
    { label: "Instagram", url: "https://instagram.com/", icon: "instagram" },
  ],

  /* ── Optional "Currently" card. Set to null to hide it. ───────────────── */
  now: "Building a design system for a fintech in Mumbai, and learning to make a decent filter coffee.",

  /* ── Footer ───────────────────────────────────────────────────────────── */
  footer: "Built with ObsidianX",
};
