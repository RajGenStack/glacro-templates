# Link in Bio

One page, every link. Five themes, inline SVG social icons, native share sheet.

## What makes it worth using

- Entire page driven by one config file -- no build step, no npm install, no framework.
- Five themes; add your own by copying a block in `styles.css`.
- Social icons are inline SVG, so nothing is fetched from a CDN and there is no icon font to load.
- URLs are protocol-checked before rendering, so a `javascript:` URL pasted into the config cannot execute.
- Falls back to drawn initials when no avatar image is set -- never a broken image.
- Share button uses the native share sheet on mobile and the clipboard everywhere else.

## Deploy on ObsidianX

Create a project from this repository and set the **Root Directory** to:

```
templates/link-in-bio
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## What to edit

`profile.js` -- name, bio, theme, links, socials.

## Licence

MIT.
