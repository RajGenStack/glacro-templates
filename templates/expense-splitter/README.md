# Split - Shared Expense Splitter

Split trip and flatmate expenses, then settle up in the fewest possible payments.

## What makes it worth using

- **Minimal settlement**: greedily matches the largest debtor to the largest creditor, so four people with five expenses settle in three payments rather than a dozen.
- Equal or exact-amount splits, with exact splits rejected when they do not add up -- a mismatch would quietly corrupt every balance after it.
- Paise-accurate even splits, so balances actually reach zero instead of leaving a stray paisa.
- Zero is shown as *settled up*, which is distinct from owing nothing yet.
- Includes a sample trip so the settlement logic is visible immediately.

## Deploy on ObsidianX

Create a project from this repository and set the **Root Directory** to:

```
templates/expense-splitter
```

Framework preset **Static**, no build command, output directory `.`.

## Run it locally

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## What to edit

Nothing -- add people and expenses in the app.

## Licence

MIT.
