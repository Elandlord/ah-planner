# AH Planner

Albert Heijn receipt scanner & meal planner. Upload your AH receipts, get them parsed
automatically, match ingredients against recipes, generate shopping lists, and track your
spending over time.

## Features

- **Receipt OCR & parsing** (`pages/receipts.vue`) — upload a photo or PDF of an AH receipt,
  extract line items via OCR/PDF parsing, review and edit them, then filter and export by week,
  month, or selection (CSV/JSON).
- **Recipe-to-pantry matching** (`pages/recipes.vue`) — browse recipes, see which ones match what
  you already have, save favorites, and assign recipes to a weekly meal plan.
- **Shopping list generation** (`pages/shopping-list.vue`) — auto-generated and manually editable
  shopping list, grouped by product category.
- **Spending overview** (`pages/spending.vue`) — charts and stats on total spend and most
  frequently bought items, derived from your scanned receipts.

## Setup

Install dependencies:

```bash
npm install
```

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Testing

Run the test suite once:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests live in `tests/unit/`.

## Project structure

- `composables/` — receipt OCR, PDF parsing, receipt parsing, export, and recipe-matching logic
- `stores/` — Pinia stores: `receiptStore`, `recipeStore`, `shoppingListStore`
- `components/` — UI components (receipt drop zone, receipt review, recipe cards, spending chart)
- `data/recipes.ts` — recipe data used for pantry matching

---

Built with [Nuxt](https://nuxt.com/docs/getting-started/introduction).
