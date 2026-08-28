# QR Restaurant Menu

A digital menu built for the phone someone is holding at your table. Print a QR code, point it here.

## What makes it worth using

- Veg / egg / non-veg marks in the format Indian menus are required to carry.
- Search and dietary filters, with the section jump-bar reflecting the current filter.
- Spice levels, allergen notes and free-text badges per dish.
- No framework, no web fonts, no images -- a few kilobytes, so it appears instantly on restaurant wifi.
- Prints cleanly if you also want a paper copy.

## Deploy on ObsidianX

Create a project from this repository and set the **Root Directory** to:

```
templates/qr-restaurant-menu
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## What to edit

`menu-data.js` -- restaurant details and every section and dish.

## Licence

MIT.
