// SPDX-License-Identifier: MIT
// Validates the data against the schema rules, checks that every translation is complete,
// and warns about anything that has gone stale.
// No dependencies: node scripts/validate.mjs
import { readFileSync, existsSync } from 'node:fs';

const DAYS_BEFORE_REVERIFY = 90;
const LOCALES = ['es']; // translations kept next to the canonical English; add a code here to require another

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const units = read('data/units.json');
const types = read('data/types.json');
const offers = read('data/offers.json');

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);

// --- Reference sets ---
const unitIds = new Set(units.units.map((u) => u.id));
const limitIds = new Set(units.limit_types.map((l) => l.id));
const familyIds = new Set(types.families.map((f) => f.id));
const typeIds = new Set(types.types.map((t) => t.id));
const pricingModelIds = new Set(offers.pricing_models.map((m) => m.id));

// --- Unique identifiers ---
const unique = (list, name) => {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) fail(`${name}: duplicate identifier "${item.id}"`);
    seen.add(item.id);
  }
};
unique(types.families, 'families');
unique(units.limit_types, 'limit_types');
unique(units.units, 'units');
unique(types.types, 'types');
unique(offers.pricing_models, 'pricing_models');
unique(offers.offers, 'offers');

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const [name, list] of [['families', types.families], ['limit_types', units.limit_types], ['units', units.units], ['types', types.types], ['pricing_models', offers.pricing_models], ['offers', offers.offers]])
  for (const item of list) if (!KEBAB.test(item.id)) fail(`${name}: identifier "${item.id}" is not lowercase kebab-case`);

// --- Units ---
for (const u of units.units) {
  for (const field of ['name', 'dimension', 'what_it_measures', 'plain_words'])
    if (!u[field]) fail(`unit "${u.id}": missing required field ${field}`);
  if (u.typical_limit_type && !limitIds.has(u.typical_limit_type))
    fail(`unit "${u.id}": typical_limit_type "${u.typical_limit_type}" does not exist`);
  for (const t of u.used_in ?? [])
    if (!typeIds.has(t)) fail(`unit "${u.id}": used_in points to a nonexistent type "${t}"`);
}

// --- Types ---
for (const t of types.types) {
  for (const field of ['name', 'what_it_is', 'purpose'])
    if (!t[field]) fail(`type "${t.id}": missing required field ${field}`);
  if (!familyIds.has(t.family)) fail(`type "${t.id}": family "${t.family}" does not exist`);
  for (const u of t.units ?? [])
    if (!unitIds.has(u)) fail(`type "${t.id}": unit "${u}" does not exist`);
}

// --- Offers ---
const today = new Date();
const stale = [];
const warn = (m) => warnings.push(m);
for (const o of offers.offers) {
  for (const field of ['provider', 'service', 'price', 'confidence', 'verified'])
    if (!o[field]) fail(`offer "${o.id}": missing required field ${field}`);
  if (!typeIds.has(o.type)) fail(`offer "${o.id}": type "${o.type}" does not exist`);
  if (!pricingModelIds.has(o.pricing_model)) fail(`offer "${o.id}": pricing_model "${o.pricing_model}" does not exist`);
  if (!['official', 'secondary'].includes(o.confidence))
    fail(`offer "${o.id}": confidence must be "official" or "secondary"`);
  if (!Array.isArray(o.sources) || o.sources.length === 0)
    fail(`offer "${o.id}": no sources. A row without a source does not go in.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.verified ?? ''))
    fail(`offer "${o.id}": "verified" must be a YYYY-MM-DD date`);
  if (o.screenshot && !existsSync(new URL(`../${o.screenshot}`, import.meta.url)))
    fail(`offer "${o.id}": screenshot "${o.screenshot}" does not exist`);

  for (const c of o.includes ?? []) {
    if (!unitIds.has(c.unit)) fail(`offer "${o.id}": unit "${c.unit}" does not exist`);
    if (typeof c.amount !== 'number') fail(`offer "${o.id}": non-numeric amount for "${c.unit}"`);
    if (![null, 'day', 'month', 'year'].includes(c.period ?? null))
      fail(`offer "${o.id}": period "${c.period}" is not day, month, year or null`);
    if (c.limit_type && !limitIds.has(c.limit_type))
      fail(`offer "${o.id}": limit_type "${c.limit_type}" does not exist`);
  }

  for (const p of o.plans ?? []) {
    const label = p.plan ?? `${p.vcpu} vCPU / ${p.ram_gb} GB`;
    for (const field of ['vcpu', 'ram_gb', 'monthly_price_usd'])
      if (typeof p[field] !== 'number')
        fail(`offer "${o.id}", plan "${label}": ${field} must be numeric`);
    if (!(typeof p.storage_gb === 'number' || p.storage_gb === null))
      fail(`offer "${o.id}", plan "${label}": storage_gb must be numeric or null (null = no disk included)`);
    // A month must never cost more than the month's 730 hours at the hourly rate.
    if (typeof p.hourly_price_usd === 'number' && p.hourly_price_usd > 0) {
      const hours = p.monthly_price_usd / p.hourly_price_usd;
      if (hours > 730)
        fail(`offer "${o.id}", plan "${label}": the month equals ${Math.round(hours)} h at the hourly rate, more than the month's 730 h. Check the figures.`);
    }
  }

  const days = Math.floor((today - new Date(o.verified)) / 86400000);
  if (days > DAYS_BEFORE_REVERIFY) stale.push({ id: o.id, provider: o.provider, days });
  if (o.confidence === 'secondary')
    warn(`"${o.id}" (${o.provider}) rests on a secondary source: confirm in the official documentation.`);
}

// --- Translations (locales/<lang>/*.json must mirror data/) ---
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const sameIds = (label, dataIds, locIds, lang) => {
  const d = new Set(dataIds), l = new Set(locIds);
  for (const id of d) if (!l.has(id)) fail(`${lang}: ${label} "${id}" has no translation`);
  for (const id of l) if (!d.has(id)) fail(`${lang}: ${label} "${id}" is translated but does not exist in data/`);
};
const needText = (lang, where, loc, field, expected) => {
  const has = typeof loc?.[field] === 'string' && loc[field].trim() !== '';
  if (expected && !has) fail(`${lang}: ${where} is missing the translated "${field}"`);
  if (!expected && loc?.[field] !== undefined) fail(`${lang}: ${where} has a translated "${field}" but data/ does not`);
};
const needList = (lang, where, loc, field, dataList) => {
  const expected = Array.isArray(dataList);
  if (expected !== Array.isArray(loc?.[field])) {
    fail(`${lang}: ${where}: "${field}" is ${expected ? 'missing' : 'present'} in the translation`);
    return;
  }
  if (expected && loc[field].length !== dataList.length)
    fail(`${lang}: ${where}: "${field}" has ${loc[field].length} item(s) in the translation but ${dataList.length} in data/`);
};

const uiEn = read('locales/en/ui.json');
const dimensionIds = [...new Set(units.units.map((u) => u.dimension))];
for (const lang of LOCALES) {
  for (const file of ['types', 'units', 'offers', 'ui']) {
    if (!existsSync(new URL(`../locales/${lang}/${file}.json`, import.meta.url))) fail(`${lang}: locales/${lang}/${file}.json does not exist`);
  }
  if (errors.length && !existsSync(new URL(`../locales/${lang}/ui.json`, import.meta.url))) continue;

  const ui = read(`locales/${lang}/ui.json`);
  const missing = Object.keys(uiEn).filter((k) => !(k in ui));
  const extra = Object.keys(ui).filter((k) => !(k in uiEn));
  for (const k of missing) fail(`${lang}: ui.json is missing the key "${k}"`);
  for (const k of extra) fail(`${lang}: ui.json has the key "${k}" which English does not`);
  for (const dir of dimensionIds) {
    if (!uiEn.dimensions?.[dir]) fail(`en: ui.json dimensions is missing "${dir}"`);
    if (!ui.dimensions?.[dir]) fail(`${lang}: ui.json dimensions is missing "${dir}"`);
  }
  for (const dir of Object.keys(ui.dimensions ?? {}))
    if (!dimensionIds.includes(dir)) warn(`${lang}: ui.json dimensions has "${dir}", which no unit uses`);

  const lt = read(`locales/${lang}/types.json`);
  needText(lang, 'types.json', lt, 'description', true);
  sameIds('family', types.families.map((f) => f.id), Object.keys(lt.families ?? {}), lang);
  sameIds('type', types.types.map((t) => t.id), Object.keys(lt.types ?? {}), lang);
  for (const f of types.families) {
    const l = lt.families?.[f.id];
    needText(lang, `family "${f.id}"`, l, 'name', true);
    needText(lang, `family "${f.id}"`, l, 'summary', true);
  }
  for (const t of types.types) {
    const l = lt.types?.[t.id];
    if (!l) continue;
    for (const field of ['name', 'what_it_is', 'purpose']) needText(lang, `type "${t.id}"`, l, field, true);
    needList(lang, `type "${t.id}"`, l, 'aliases', t.aliases);
    needList(lang, `type "${t.id}"`, l, 'pitfalls', t.pitfalls);
    // provider_examples are product names and are not translated; an entry that is a phrase can be
    // overridden by listing the whole array under the same key in the locale.
    if (l.provider_examples !== undefined) needList(lang, `type "${t.id}"`, l, 'provider_examples', t.provider_examples);
  }

  const lu = read(`locales/${lang}/units.json`);
  needText(lang, 'units.json', lu, 'description', true);
  sameIds('limit type', units.limit_types.map((l) => l.id), Object.keys(lu.limit_types ?? {}), lang);
  sameIds('unit', units.units.map((u) => u.id), Object.keys(lu.units ?? {}), lang);
  for (const x of units.limit_types)
    for (const field of ['name', 'explanation', 'why_it_matters']) needText(lang, `limit type "${x.id}"`, lu.limit_types?.[x.id], field, true);
  for (const u of units.units) {
    const l = lu.units?.[u.id];
    if (!l) continue;
    for (const field of ['name', 'what_it_measures', 'plain_words']) needText(lang, `unit "${u.id}"`, l, field, true);
    for (const field of ['formula', 'handy_equivalent', 'warning']) needText(lang, `unit "${u.id}"`, l, field, u[field] !== undefined);
  }

  const lo = read(`locales/${lang}/offers.json`);
  needText(lang, 'offers.json', lo, 'description', true);
  needText(lang, 'offers.json', lo, 'warning', offers.warning !== undefined);
  sameIds('pricing model', offers.pricing_models.map((m) => m.id), Object.keys(lo.pricing_models ?? {}), lang);
  sameIds('offer', offers.offers.map((o) => o.id), Object.keys(lo.offers ?? {}), lang);
  for (const m of offers.pricing_models)
    for (const field of ['name', 'explanation']) needText(lang, `pricing model "${m.id}"`, lo.pricing_models?.[m.id], field, true);
  for (const o of offers.offers) {
    const l = lo.offers?.[o.id];
    if (!l) continue;
    const where = `offer "${o.id}"`;
    needText(lang, where, l, 'service', true);
    needText(lang, where, l, 'price', true);
    needText(lang, where, l, 'overage_price', o.overage_price !== undefined);
    needText(lang, where, l, 'notes', o.notes !== undefined);
    needText(lang, where, l, 'pricing_region', o.pricing_region !== undefined);
    needText(lang, where, l, 'expires', typeof o.expires === 'string' && !ISO.test(o.expires));
    const hasNotes = (o.includes ?? []).some((c) => c.note !== undefined);
    needList(lang, where, l, 'include_notes', hasNotes ? o.includes : undefined);
    if (hasNotes && Array.isArray(l.include_notes)) {
      o.includes.forEach((c, i) => {
        if ((c.note !== undefined) !== (typeof l.include_notes[i] === 'string'))
          fail(`${lang}: ${where}: include_notes[${i}] ${c.note !== undefined ? 'is missing' : 'should be null'}`);
      });
    }
  }
}

// --- Report ---
const n = (x) => String(x).padStart(3);
console.log(`\nUnits: ${n(units.units.length)}   Types: ${n(types.types.length)}   Offers: ${n(offers.offers.length)}`);
console.log(`Families: ${n(types.families.length)}   Pricing models: ${n(offers.pricing_models.length)}   Locales: ${['en', ...LOCALES].join(', ')}\n`);

if (stale.length) {
  console.log(`⚠  ${stale.length} offer(s) older than ${DAYS_BEFORE_REVERIFY} days — reverify:`);
  for (const v of stale.sort((a, b) => b.days - a.days))
    console.log(`   ${v.days} days · ${v.provider} · ${v.id}`);
  console.log('');
} else {
  console.log(`✓ No offer is more than ${DAYS_BEFORE_REVERIFY} days past its verification.\n`);
}

if (warnings.length) {
  console.log(`ℹ  ${warnings.length} warning(s):`);
  for (const a of warnings) console.log(`   ${a}`);
  console.log('');
}

if (errors.length) {
  console.error(`✗ ${errors.length} integrity error(s):`);
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}

console.log('✓ Valid data: references intact, required fields present, translations complete.\n');
