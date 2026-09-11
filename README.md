# Glacro Templates

Starter projects for [Glacro](https://glacro.com). Every one is a real, working
application -- not a snippet -- and every one deploys as-is.

## What's here

| Template | What it is | Stack |
| --- | --- | --- |
| [`gst-invoice-generator`](templates/gst-invoice-generator) | Create an Indian GST tax invoice in the browser and save it as a PDF. Nothing is uploaded anywhere. | Static (HTML/CSS/JS) |
| [`rent-receipt-generator`](templates/rent-receipt-generator) | Generate a year of rent receipts for claiming HRA exemption. Everything runs in the browser and nothing is uploaded anywhere. | Static (HTML/CSS/JS) |
| [`habit-tracker`](templates/habit-tracker) | Track daily habits with streaks and a twelve-month heatmap. Offline, no account, exports to JSON. | Static (HTML/CSS/JS) |
| [`link-in-bio`](templates/link-in-bio) | One page, every link. Five themes, inline SVG social icons, native share sheet. | Static (HTML/CSS/JS) |
| [`expense-splitter`](templates/expense-splitter) | Split trip and flatmate expenses, then settle up in the fewest possible payments. | Static (HTML/CSS/JS) |
| [`qr-restaurant-menu`](templates/qr-restaurant-menu) | A digital menu built for the phone someone is holding at your table. Print a QR code, point it here. | Static (HTML/CSS/JS) |

## Deploying one

Pick a template on [glacro.com/templates](https://glacro.com/templates) and choose
**Deploy This**, or create a project from this repository in the Glacro dashboard
and set the **Root Directory** to the template you want:

```
templates/gst-invoice-generator
```

Framework preset **Static**, no build command, output directory `.`. The builder
clones this repo, changes into that directory and publishes it.

## Running one locally

They are plain static files, so any static server works:

```bash
cd templates/gst-invoice-generator
python -m http.server 4321
```

Then open <http://localhost:4321>.

## House rules

These templates share a few principles, and it is worth knowing them before you
edit one:

- **No build step and no dependencies.** No npm install, no bundler, no CDN
  scripts. Open the folder, edit a file, refresh.
- **Nothing phones home.** No analytics, no trackers, no fonts fetched from a
  third party. Where a template stores data it uses `localStorage`, and the page
  says so.
- **Everything user-supplied is escaped** before it reaches `innerHTML`, and URLs
  from config files are protocol-checked.
- **Zero is a real value.** A balance of 0.00 renders as "settled up", not as
  missing data.
- **Accessible defaults**: real labels, focus styles, keyboard-reachable
  controls, and `prefers-reduced-motion` respected.

## Licence

MIT -- use them for anything, commercial or personal.
