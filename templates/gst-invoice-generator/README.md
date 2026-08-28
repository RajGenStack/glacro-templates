# GST Invoice Generator

Create a GST-compliant Indian tax invoice in the browser and save it as a PDF. Nothing is uploaded anywhere.

## What makes it worth using

- Correct **CGST + SGST vs IGST** split, decided from the seller's state and the place of supply -- the thing hand-rolled invoice templates almost always get wrong.
- **GSTIN checksum validation** (not just a length check), so a typo is caught before it reaches a filed document.
- **Amount in words** using Indian numbering -- lakh and crore, not million.
- Discount applied to the taxable value *before* tax, and a tax summary grouped by rate.
- Paise-accurate rounding, so the line items always add up to the total.
- A print stylesheet tuned for A4: the editor disappears and rows never split across pages.

## Deploy on ObsidianX

Create a project from this repository and set the **Root Directory** to:

```
templates/gst-invoice-generator
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## What to edit

Nothing -- it is a live editor. Your work is kept in localStorage between visits.

## Licence

MIT.
