# Cloud services knowledge base

[Español](README.es.md)

A structured index of internet and cloud services, meant for **making infrastructure and cost decisions** by comparing offers from different providers on a common footing.

For every service it always answers the same eight questions:

| Question | Where the answer comes from |
|---|---|
| What is it called? | `offers.json` → `provider` + `service` |
| What is it? | `types.json` → `what_it_is` |
| What is it for? | `types.json` → `purpose` |
| What does it offer, and how much? | `offers.json` → `includes[]`, in the units of `units.json` |
| How long does it last? | `offers.json` → `pricing_model` |
| How much does it cost? | `offers.json` → `price` |
| Who offers it? | `offers.json` → `provider` |
| Where can I check it? | `offers.json` → `sources[]` + `verified` |

## The underlying idea: two layers

Prices rot; definitions do not. That is why they are kept apart.

- **Stable layer** — `data/types.json` and `data/units.json`. Which types of service exist, what they are for, and what units they are measured in. Reviewed once or twice a year.
- **Volatile layer** — `data/offers.json`. What each provider gives and at what price. **It expires fast**: every row carries a date and a source, and the validator warns after 90 days.

If they were mixed in a single document, everything would expire at the speed of the most volatile part.

## Files

```
GUIDE.md                  The readable guide: how to read an offer without being fooled
GUIDE.es.md               The same guide, in Spanish
README.es.md              This file, in Spanish
data/units.json          46 units, explained in plain language
data/types.json          71 service types in 10 families
data/offers.json         34 verified offers, with date and source
                         (7 of them with the full plan table: 48 tiers)
locales/es/              Spanish translation of the prose in data/, keyed by id
locales/<lang>/ui.json   Interface strings of the generated page
schema/schema.json       The data contract and the integrity rules
scripts/validate.mjs     Validates, checks translations and flags what is stale
scripts/build.mjs        Builds guide.html from the data
sources/                 Screenshots of the official price tables
```

`guide.html` is a **generated product**, not a source. Do not edit it: change the data and build it again. It contains every language at once, with a switch in the control bar (it starts in your browser's language and remembers your choice).

## How to update it

This is the most important part of this repository. The whole flow:

```bash
node scripts/validate.mjs    # what has been unverified for more than 90 days?
# ...open the official source for it and check the figures...
# ...edit data/offers.json: quantities, price, verified, sources...
# ...and the matching Spanish text in locales/es/offers.json...
node scripts/validate.mjs    # still intact and fully translated?
node scripts/build.mjs       # rebuild the page
git add data/ locales/ && git commit -m "Verify X quotas (September 2026)"
```

That last step is what justifies this being a repository and not a loose page: **`git log data/offers.json` tells you exactly when each figure changed**, with a diff. It is the only way to answer “has this always been like this?” when a provider cuts its free tier without notice, as Oracle did in August 2026.

### Rules when adding an offer

1. **No source, no entry.** `sources[]` cannot be left empty.
2. **Prefer the provider's documentation.** Mark `confidence: "official"` only if the figure is in their own documentation; if it comes from a blog or an aggregator, `"secondary"`.
3. **Mark the limit type.** If a quantity is a per-request cap and not a monthly pool, say so with `limit_type`. It is the datum that changes the most decisions.
4. **Put today's date** in `verified`, not the date someone last looked at it.
5. **Translate it.** Add the Spanish text for the offer to `locales/es/offers.json` under the same id. The validator fails if it is missing.

## Extracting it programmatically

The three files are plain JSON. In addition, `guide.html` embeds everything under `<script type="application/json" id="guide-data">` (English; the Spanish prose is under `id="guide-data-es"`), so the page also works as a data source.

```bash
# Free offers that do not require a credit card
node -e "const d=require('./data/offers.json');
console.log(d.offers.filter(o=>o.free&&o.card_required===false).map(o=>o.provider+': '+o.service).join('\n'))"

# Everything that expires
node -e "const d=require('./data/offers.json');
console.log(d.offers.filter(o=>o.expires).map(o=>o.provider+' → '+o.expires).join('\n'))"
```

### Lines with several tiers

When a provider publishes a size table (typical for virtual machines), the offer carries a `plans` array with the whole table, and `price` summarizes the range. Three fields prevent wrong comparisons between providers:

- `binary_units: true` marks whoever expresses memory and disk in GiB instead of GB. The difference is 7.4%.
- `transfer_tb: null` means “not published in this table”, which is not the same as `transfer_unlimited: true`, nor as a number. They are three different states, and confusing them makes you read as a shortcoming what is sometimes an advantage.
- `storage_gb: null` marks whoever includes no disk and charges for it separately, like Fly.io with its volumes.

The validator also checks that the monthly price never exceeds 730 hours at the hourly rate. Comparing that figure across the 48 loaded tiers reveals something no table says out loud: **how much each provider discounts for leaving the machine on**.

| Provider | Implied hours | Discount against the real month |
|---|---|---|
| Hetzner (CX and CPX) | 613–649 | 13–15% |
| Linode | 667 | 9% |
| DigitalOcean | 672 | 8% |
| Vultr | 625–714 | 8% |
| Fly.io | 718–725 | ~1% |

Fly.io is the different case: it bills per second, so its “monthly” price is a 30-day equivalence and not a ceiling. That is why it hovers around 720 hours and practically gives no discount. For the others, the monthly price is indeed a ceiling.

OVHcloud does not appear in the table because it **publishes no hourly rate**: its VPS line is bought by the month and there is no way to pay only for the time used. The absence of a figure is information too.

## Languages

English is the canonical language of the data, the code and the documentation. Spanish is a first-class translation: `locales/es/` mirrors `data/`, `GUIDE.es.md` and `README.es.md` are the translated documents, and `guide.html` ships both. `node scripts/validate.mjs` fails when a translation is missing or out of shape. To add another language, see “Languages (i18n)” in `CLAUDE.md`.

## Scope and honesty

The 34 offers are the ones verified during the research that gave rise to this repository (September 2026), not a census of the market. Two are marked `confidence: "secondary"` because they could not be confirmed in official documentation: the validator lists them every time it runs.

Prices change without notice. This repository does not prevent that problem: it makes it **visible**.

## License

The data, translations and documentation (`data/`, `locales/`, `schema/`, the guides and the READMEs) are under [CC BY 4.0](LICENSES/CC-BY-4.0.txt): reuse them freely, including commercially, but credit the author. The code (`scripts/`) is under the [MIT License](LICENSES/MIT.txt). The price-table screenshots in `sources/` belong to their providers and are not covered by either license. [`LICENSE`](LICENSE) gives the exact scope and a suggested credit line.
