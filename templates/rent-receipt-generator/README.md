# Rent Receipt Generator

Generate a year of rent receipts for claiming HRA exemption. Everything runs in
the browser and nothing is uploaded anywhere.

## What makes it worth using

- **A whole financial year in one go.** Pick April to March and get twelve
  receipts, each dated the last day of its month, rather than editing one
  document twelve times.
- **The PAN rule, applied rather than mentioned.** Landlord PAN is required
  once annual rent passes ₹1,00,000. The form works out the annual total as you
  type and tells you which side of the line you are on, so nothing bounces back
  from payroll for a missing field.
- **The revenue stamp rule, only when it applies.** A ₹1 stamp is expected on
  cash payments above ₹5,000 per receipt. Pay by bank transfer, UPI or cheque
  and the reminder stays out of your way, because those leave their own trail.
- **PAN format checked** (five letters, four digits, one letter), so a typo is
  caught before the receipt reaches anyone.
- **Indian digit grouping** throughout — ₹2,88,000, not ₹288,000.
- A print stylesheet tuned for A4: one receipt per page, no editor chrome, and
  a signature line that survives being printed in black and white.

## Deploy on Glacro

Create a project from this repository and set the **Root Directory** to:

```
templates/rent-receipt-generator
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

Open `index.html` in a browser. There is no build step and no dependencies.

## Files

| File | What it holds |
|---|---|
| `index.html` | The form and the receipt output area |
| `styles.css` | Screen layout, plus the A4 print rules |
| `app.js` | Month range, thresholds, formatting, rendering |

## A note on what this is not

These are receipts you and your landlord fill in and sign. The tool does the
arithmetic and the formatting; it does not verify that any of it is true, and it
is not tax advice. Your employer decides what evidence they accept.
