# Streak - Habit Tracker

Track daily habits with streaks and a twelve-month heatmap. Offline, no account, exports to JSON.

## What makes it worth using

- Current and longest streaks, plus a 30-day completion rate.
- A GitHub-style heatmap of the last 53 weeks, per habit or across all of them.
- Dates are handled as **local** days. Using UTC would roll a late-evening tick over to tomorrow anywhere east of UTC -- including all of India -- and silently break the streak the user just kept.
- Export and import as JSON, so the browser is not the only copy.
- Light and dark, following the OS setting with a manual override.

## Deploy on ObsidianX

Create a project from this repository and set the **Root Directory** to:

```
templates/habit-tracker
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## What to edit

Nothing -- add your habits in the app.

## Licence

MIT.
