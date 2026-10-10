# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A knowledge base of cloud services, used to compare provider offers on a common footing. There is no build step and there are no dependencies: it is JSON data plus two package-free Node scripts (`package.json` does not exist). The repository is **English-native**: file names, JSON keys, ids, code, messages and commits are in English. Spanish is supported as a translation layer (see below), not as a second source of truth.

## Commands

```bash
node scripts/validate.mjs   # checks referential integrity and translation coverage, lists anything >90 days unverified; exits 1 on errors
node scripts/build.mjs      # regenerates guide.html from data/*.json and locales/
```

There are no tests and no linter; `validate.mjs` is the only check. Normal flow after touching data: validate → build → commit `data/` and `locales/`.

## Architecture

Two layers, deliberately separated by how fast they expire:

- **Stable**: `data/types.json` (service types grouped into families) and `data/units.json` (units and limit types).
- **Volatile**: `data/offers.json` (offers with price, `verified` and `sources[]`; it also defines `pricing_models`).

Offers reference types, pricing models and units by id; types reference families and units; units reference types and limit types. `scripts/validate.mjs` checks all of those cross-references, unique ids, kebab-case ids, required fields and extra rules (for example, the monthly price of a plan can never exceed 730 h × the hourly rate). `schema/schema.json` is the documented contract: if you change the shape of the data, update the schema, the validator and the builder together.

`guide.html` is a generated product (it is in `.gitignore`): it is neither edited nor versioned. It contains every language at once, with a language switch, and embeds the data in `<script type="application/json" id="guide-data">` (English) and `id="guide-data-es"` (Spanish). `GUIDE.md` / `GUIDE.es.md` are the hand-written guides on how to read an offer. `sources/` holds screenshots of the official price tables used to load the plans.

## Languages (i18n)

- **English is canonical.** `data/*.json` holds the English prose together with every id, number, date and URL.
- **Spanish lives in `locales/es/`**: `types.json`, `units.json` and `offers.json` mirror the structure of `data/`, keyed by id, and contain only the translatable prose (names, aliases, descriptions, pitfalls, offer `service`/`price`/`notes`, and so on). `locales/<lang>/ui.json` holds the interface strings of the HTML page; `locales/en/ui.json` and `locales/es/ui.json` must have the same keys.
- **Never put prose only in `locales/es/`.** Adding or changing text means changing the English in `data/` and the Spanish in `locales/es/` in the same commit. `validate.mjs` fails if an id, a list length (`aliases`, `pitfalls`, `include_notes`) or a field is missing on either side.
- Adding a language: create `locales/<code>/` with the four files, add the code to `LOCALES` in `validate.mjs` and to `LANGS` in `build.mjs`.
- `README.es.md` and `GUIDE.es.md` are the Spanish versions of the documentation; keep them in step with `README.md` and `GUIDE.md`.

## Data conventions (the ones that fail most often)

- No source, no entry: `sources[]` cannot be empty. `confidence: "official"` only if the figure is in the provider's own documentation; otherwise `"secondary"`.
- Set `limit_type` when a quantity is a per-request cap and not a monthly pool.
- `verified` carries the real date on which the source was checked, not the date of someone else's last review.
- Offers with a size table carry `plans[]`, and `price` summarizes the range. In them, `transfer_tb: null` (not published), `transfer_unlimited: true` and a number are three different states; `storage_gb: null` means disk billed separately; `binary_units: true` marks GiB instead of GB.
- Ids are lowercase kebab-case English. Keys are `snake_case`. Dimensions (`unit.dimension`) are ids whose display names live in `locales/<lang>/ui.json` under `dimensions`.
- The counts (units, types, offers, tiers) are written by hand in `README.md` and `README.es.md`: update both when adding or removing offers, or they will drift.
- Commits to `data/` are the price history (`git log data/offers.json`); use descriptive English messages such as “Verify X quotas (September 2026)”.
- The sibling repository `vm-launchpad` reads `data/offers.json` (`offers[].type`, `pricing_model`, `expires`, `card_required`, `verified`, `confidence`, `sources`, `includes`, `plans`). Renaming those keys or changing the id of a virtual-machine offer breaks its `preflight.mjs`.
