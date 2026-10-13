// SPDX-License-Identifier: MIT
// Builds guide.html from the data files and the locales.
// The page contains every language at once (one container per language) and a switch between them.
// No dependencies: node scripts/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const LANGS = ['en', 'es']; // en = canonical data; every other language is an overlay from locales/<lang>/
const DEFAULT_LANG = 'en';

const data = { types: read('data/types.json'), units: read('data/units.json'), offers: read('data/offers.json') };
const ui = Object.fromEntries(LANGS.map((l) => [l, read(`locales/${l}/ui.json`)]));
const overlays = Object.fromEntries(
  LANGS.filter((l) => l !== DEFAULT_LANG).map((l) => [l, {
    types: read(`locales/${l}/types.json`),
    units: read(`locales/${l}/units.json`),
    offers: read(`locales/${l}/offers.json`),
  }]),
);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- Content in a given language: canonical data overlaid with that language's translations ----------

function localized(lang) {
  if (lang === DEFAULT_LANG) return data;
  const o = overlays[lang];
  return {
    types: {
      ...data.types,
      description: o.types.description,
      families: data.types.families.map((f) => ({ ...f, ...o.types.families[f.id] })),
      types: data.types.types.map((t) => ({ ...t, ...o.types.types[t.id] })),
    },
    units: {
      ...data.units,
      description: o.units.description,
      limit_types: data.units.limit_types.map((x) => ({ ...x, ...o.units.limit_types[x.id] })),
      units: data.units.units.map((u) => ({ ...u, ...o.units.units[u.id] })),
    },
    offers: {
      ...data.offers,
      description: o.offers.description,
      warning: o.offers.warning,
      pricing_models: data.offers.pricing_models.map((m) => ({ ...m, ...o.offers.pricing_models[m.id] })),
      offers: data.offers.offers.map((offer) => {
        const { include_notes, ...rest } = o.offers.offers[offer.id];
        return {
          ...offer,
          ...rest,
          includes: (offer.includes ?? []).map((c, i) => (include_notes?.[i] != null ? { ...c, note: include_notes[i] } : c)),
        };
      }),
    },
  };
}

// ---------- One language container ----------

function renderLanguage(lang) {
  const text = ui[lang];
  const { types, units, offers } = localized(lang);
  const t = (key, vars = {}) =>
    String(text[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  const num = (n) => new Intl.NumberFormat(lang).format(n);

  const unitById = new Map(units.units.map((u) => [u.id, u]));
  const typeById = new Map(types.types.map((x) => [x.id, x]));
  const familyById = new Map(types.families.map((f) => [f.id, f]));
  const modelById = new Map(offers.pricing_models.map((m) => [m.id, m]));
  const limitById = new Map(units.limit_types.map((l) => [l.id, l]));

  const periodText = { day: text.per_day, month: text.per_month, year: text.per_year };

  const quantityText = (c) => {
    const unit = unitById.get(c.unit);
    const period = periodText[c.period] ?? '';
    const note = c.note ? ` <span class="note">(${esc(c.note)})</span>` : '';
    const limit =
      c.limit_type && c.limit_type !== 'pooled-quota'
        ? ` <span class="chip chip-limit" title="${esc(limitById.get(c.limit_type)?.explanation ?? '')}">${esc(limitById.get(c.limit_type)?.name ?? c.limit_type)}</span>`
        : '';
    return `<strong>${num(c.amount)}</strong> ${esc(unit?.name ?? c.unit)}${period}${note}${limit}`;
  };

  // ----- Offers -----
  const offersSection = offers.offers
    .map((o) => {
      const type = typeById.get(o.type);
      const family = familyById.get(type?.family);
      const model = modelById.get(o.pricing_model);
      const search = [o.provider, o.service, type?.name, family?.name, ...(type?.aliases ?? [])].join(' ').toLowerCase();
      const plansTable = (o.plans ?? []).length
        ? `<div class="plans-table"><table>
  <thead><tr><th>${esc(text.col_plan)}</th><th>${esc(text.col_vcpu)}</th><th>${esc(text.col_ram)}${o.binary_units ? ` ${esc(text.binary)}` : ''}</th><th>${esc(text.col_disk)}${o.binary_units ? ` ${esc(text.binary)}` : ''}</th><th>${esc(text.col_transfer)}</th><th>${esc(text.col_hour)}</th><th>${esc(text.col_month)}</th></tr></thead>
  <tbody>${o.plans
    .map(
      (p) => `<tr>
    <td>${p.plan ? esc(p.plan) : `<span class="note">${esc(text.unnamed)}</span>`}${p.processor ? ` <span class="note">${esc(p.processor)}</span>` : ''}</td>
    <td class="n">${p.vcpu}</td><td class="n">${p.ram_gb}</td><td class="n">${p.storage_gb == null ? '—' : p.storage_gb}</td>
    <td class="n">${p.transfer_unlimited ? esc(text.unlimited) : p.transfer_tb == null ? '—' : `${p.transfer_tb} ${esc(text.tb)}`}</td>
    <td class="n">${p.hourly_price_usd != null ? p.hourly_price_usd.toFixed(5).replace(/0+$/, '').replace(/\.$/, '') : '—'}</td>
    <td class="n highlight">${p.monthly_price_usd.toFixed(2)}</td>
  </tr>`,
    )
    .join('')}</tbody></table></div>`
        : '';
      const includes = (o.includes ?? []).length
        ? `<ul class="includes">${o.includes.map((c) => `<li>${quantityText(c)}</li>`).join('')}</ul>${plansTable}`
        : plansTable || `<p class="empty">${esc(text.no_quantities)}</p>`;
      return `
<article class="offer" data-search="${esc(search)}" data-family="${esc(type?.family ?? '')}" data-free="${o.free}">
  <header class="offer-head">
    <div>
      <p class="provider">${esc(o.provider)}</p>
      <h3>${esc(o.service)}</h3>
    </div>
    <div class="badges">
      ${o.free ? `<span class="chip chip-yes">${esc(text.badge_free)}</span>` : `<span class="chip chip-no">${esc(text.badge_paid)}</span>`}
      ${o.card_required === false ? `<span class="chip chip-yes">${esc(text.badge_no_card)}</span>` : ''}
      ${o.expires ? `<span class="chip chip-alert">${esc(t('badge_expires', { date: o.expires }))}</span>` : ''}
      ${o.confidence === 'secondary' ? `<span class="chip chip-warn">${esc(text.badge_secondary)}</span>` : ''}
    </div>
  </header>
  <dl class="questions">
    <div><dt>${esc(text.q_what)}</dt><dd>${esc(type?.what_it_is ?? '—')}</dd></div>
    <div><dt>${esc(text.q_purpose)}</dt><dd>${esc(type?.purpose ?? '—')}</dd></div>
    <div><dt>${esc(text.q_offers)}</dt><dd>${includes}</dd></div>
    <div><dt>${esc(text.q_duration)}</dt><dd><strong>${esc(model?.name ?? o.pricing_model)}.</strong> ${esc(model?.explanation ?? '')}</dd></div>
    <div><dt>${esc(text.q_price)}</dt><dd>${esc(o.price)}${o.overage_price ? `<br><span class="note">${esc(t('overage', { text: o.overage_price }))}</span>` : ''}</dd></div>
    ${o.notes ? `<div><dt>${esc(text.q_notes)}</dt><dd>${esc(o.notes)}</dd></div>` : ''}
    <div><dt>${esc(text.q_sources)}</dt><dd>${o.sources.map((s) => `<a href="${esc(s)}">${esc(new URL(s).hostname)}</a>`).join(' · ')} <span class="note">${esc(t('verified_on', { date: o.verified }))}</span></dd></div>
  </dl>
</article>`;
    })
    .join('');

  // ----- Types -----
  const typesSection = types.families
    .map((f) => {
      const members = types.types.filter((x) => x.family === f.id);
      return `
<section class="family" data-family="${esc(f.id)}">
  <h3 class="family-title">${esc(f.name)} <span class="note">${esc(f.summary)}</span></h3>
  <div class="cards">
    ${members
      .map(
        (x) => `
    <article class="card" data-search="${esc([x.name, ...(x.aliases ?? []), x.what_it_is].join(' ').toLowerCase())}">
      <h4>${esc(x.name)}</h4>
      ${x.aliases?.length ? `<p class="aliases">${esc(t('also_known_as', { aliases: x.aliases.join(' · ') }))}</p>` : ''}
      <p class="what-it-is">${esc(x.what_it_is)}</p>
      <p class="purpose"><span class="label">${esc(text.label_purpose)}</span> ${esc(x.purpose)}</p>
      ${x.units?.length ? `<p class="measured"><span class="label">${esc(text.label_measured_in)}</span> ${x.units.map((u) => `<span class="chip chip-unit">${esc(unitById.get(u)?.name ?? u)}</span>`).join(' ')}</p>` : ''}
      ${x.pitfalls?.length ? `<ul class="pitfalls">${x.pitfalls.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    </article>`,
      )
      .join('')}
  </div>
</section>`;
    })
    .join('');

  // ----- Units, grouped by dimension -----
  const byDimension = new Map();
  for (const u of units.units) {
    if (!byDimension.has(u.dimension)) byDimension.set(u.dimension, []);
    byDimension.get(u.dimension).push(u);
  }
  const unitsSection = [...byDimension.entries()]
    .map(
      ([dimension, list]) => `
<section class="family">
  <h3 class="family-title">${esc(text.dimensions[dimension] ?? dimension)}</h3>
  <div class="cards">
    ${list
      .map(
        (u) => `
    <article class="card unit" data-search="${esc([u.name, u.what_it_measures, u.plain_words].join(' ').toLowerCase())}">
      <h4>${esc(u.name)}</h4>
      <p class="what-it-is">${esc(u.what_it_measures)}</p>
      <p class="plain">${esc(u.plain_words)}</p>
      ${u.formula ? `<p class="formula">${esc(u.formula)}</p>` : ''}
      ${u.handy_equivalent ? `<p class="equivalent"><span class="label">${esc(text.label_equivalent)}</span> ${esc(u.handy_equivalent)}</p>` : ''}
      ${u.warning ? `<p class="warning">${esc(u.warning)}</p>` : ''}
    </article>`,
      )
      .join('')}
  </div>
</section>`,
    )
    .join('');

  const limitsSection = units.limit_types
    .map(
      (l) => `
<article class="limit">
  <h4>${esc(l.name)}</h4>
  <p>${esc(l.explanation)}</p>
  <p class="why"><span class="label">${esc(text.label_why)}</span> ${esc(l.why_it_matters)}</p>
</article>`,
    )
    .join('');

  const switchButtons = LANGS.map(
    (l) => `<button type="button" data-set-lang="${l}" aria-pressed="${l === lang}" lang="${l}">${esc(ui[l].lang_name)}</button>`,
  ).join('');

  return `
<div class="lang" data-lang="${lang}" lang="${lang}" data-title="${esc(text.page_title)}" data-one="${esc(text.result_one)}" data-other="${esc(text.result_other)}">
<div class="wrap">
<header>
  <p class="eyebrow">${esc(t('eyebrow', { date: offers.updated }))}</p>
  <h1>${esc(text.title)}</h1>
  <p class="standfirst">${esc(t('standfirst', { types: types.types.length, units: units.units.length, offers: offers.offers.length }))}</p>
</header>

<div class="how">
  <h2>${esc(text.how_title)}</h2>
  <ol>
    <li>${text.how_1}</li>
    <li>${text.how_2}</li>
    <li>${text.how_3}</li>
    <li>${text.how_4}</li>
  </ol>
</div>

<div class="controls">
  <input type="search" class="search" placeholder="${esc(text.search_placeholder)}" aria-label="${esc(text.search_label)}">
  <select class="family-select" aria-label="${esc(text.family_label)}">
    <option value="">${esc(text.all_families)}</option>
    ${types.families.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}
  </select>
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected="true" data-tab="offers">${esc(text.tab_offers)}</button>
    <button role="tab" aria-selected="false" data-tab="types">${esc(text.tab_types)}</button>
    <button role="tab" aria-selected="false" data-tab="units">${esc(text.tab_units)}</button>
  </div>
  <div class="lang-switch" role="group" aria-label="${esc(text.language_label)}">${switchButtons}</div>
  <span class="count"></span>
</div>

<section class="block view" data-view="offers">
  <div class="section-head">
    <h2>${esc(text.offers_title)}</h2>
    <p>${esc(text.offers_desc)}</p>
  </div>
  ${offersSection}
</section>

<section class="block view hidden" data-view="types">
  <div class="section-head">
    <h2>${esc(text.types_title)}</h2>
    <p>${esc(text.types_desc)}</p>
  </div>
  ${typesSection}
</section>

<section class="block view hidden" data-view="units">
  <div class="section-head">
    <h2>${esc(text.units_title)}</h2>
    <p>${esc(text.units_desc)}</p>
  </div>
  <div class="section-head"><h2 style="font-size:20px">${esc(text.limits_title)}</h2><p>${esc(text.limits_desc)}</p></div>
  <div class="limits">${limitsSection}</div>
  ${unitsSection}
</section>

<footer>
  <p>${text.footer}</p>
</footer>
</div>
</div>`;
}

// ---------- Page ----------

const css = `
:root{
  --ground:#f5f8f8;--surface:#fff;--surface-alt:#eef3f3;--ink:#12252b;--ink-soft:#3d545c;
  --muted:#6a7d84;--rule:#d8e3e4;--rule-soft:#e6eded;--teal:#0f6f73;--teal-deep:#105b60;
  --teal-wash:#e2efee;--ok:#2f7d52;--warn:#a75a1c;--warn-wash:#fbf0e4;--danger:#96313a;--danger-wash:#fbeef0;
  --serif:'Source Serif 4',Georgia,serif;--sans:'Source Sans 3',-apple-system,'Segoe UI',Arial,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#0d1719;--surface:#142124;--surface-alt:#1a2b2e;--ink:#e8f0f0;--ink-soft:#b3c6c8;
  --muted:#8ba1a4;--rule:#274044;--rule-soft:#1f3437;--teal:#5cbfbd;--teal-deep:#7ed3ce;
  --teal-wash:#14383a;--ok:#6cc48c;--warn:#e0a163;--warn-wash:#3a2a17;--danger:#e08a92;--danger-wash:#3a1f22;}}
:root[data-theme="dark"]{
  --ground:#0d1719;--surface:#142124;--surface-alt:#1a2b2e;--ink:#e8f0f0;--ink-soft:#b3c6c8;
  --muted:#8ba1a4;--rule:#274044;--rule-soft:#1f3437;--teal:#5cbfbd;--teal-deep:#7ed3ce;
  --teal-wash:#14383a;--ok:#6cc48c;--warn:#e0a163;--warn-wash:#3a2a17;--danger:#e08a92;--danger-wash:#3a1f22;}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:48px 24px 88px;display:flex;flex-direction:column;gap:40px}
h1{font-family:var(--serif);font-size:clamp(31px,4.5vw,45px);font-weight:700;line-height:1.1;letter-spacing:-.5px;text-wrap:balance;margin:0 0 14px}
h2{font-family:var(--serif);font-size:25px;font-weight:600;margin:0 0 4px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:var(--teal);margin:0 0 10px}
.standfirst{font-size:18px;color:var(--ink-soft);max-width:64ch;margin:0}
.section-head{display:flex;flex-direction:column;gap:3px;margin-bottom:4px}
.section-head p{color:var(--muted);font-size:15px;margin:0;max-width:70ch}
section.block{display:flex;flex-direction:column;gap:18px}
.how{background:var(--teal-deep);color:#eaf6f4;border-radius:14px;padding:28px 30px}
:root[data-theme="dark"] .how,:root:not([data-theme="light"]) .how{color:#06181a}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]) .how{color:#eaf6f4}}
.how h2{color:inherit;margin-bottom:10px}
.how ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px}
.how li{opacity:.93;max-width:70ch}
.how code{background:rgba(255,255,255,.14);padding:1px 6px;border-radius:4px;font-family:var(--mono);font-size:.85em}
.controls{position:sticky;top:0;z-index:5;background:var(--ground);padding:12px 0;border-bottom:1px solid var(--rule);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input[type=search],select{font:inherit;font-size:15px;padding:9px 12px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink)}
input[type=search]{flex:1;min-width:220px}
.tabs,.lang-switch{display:flex;gap:6px;flex-wrap:wrap}
.tabs button,.lang-switch button{font:inherit;font-size:14px;font-weight:600;padding:9px 15px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink-soft);cursor:pointer}
.tabs button[aria-selected=true],.lang-switch button[aria-pressed=true]{background:var(--teal-wash);border-color:var(--teal);color:var(--teal-deep)}
:root[data-theme="dark"] .tabs button[aria-selected=true],:root:not([data-theme="light"]) .tabs button[aria-selected=true],
:root[data-theme="dark"] .lang-switch button[aria-pressed=true],:root:not([data-theme="light"]) .lang-switch button[aria-pressed=true]{color:var(--teal)}
.lang-switch{margin-left:auto}
.count{font-size:13px;color:var(--muted);font-family:var(--mono)}
.offer{background:var(--surface);border:1px solid var(--rule);border-radius:12px;padding:22px 24px;margin-bottom:14px}
.offer-head{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--rule-soft)}
.provider{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--teal);font-weight:700;margin:0 0 2px}
.offer h3{font-family:var(--serif);font-size:21px;font-weight:600;margin:0}
.badges{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.4px;padding:3px 9px;border-radius:999px;white-space:nowrap}
.chip-yes{background:var(--teal-wash);color:var(--teal-deep)}
:root[data-theme="dark"] .chip-yes,:root:not([data-theme="light"]) .chip-yes{color:var(--teal)}
.chip-no{background:var(--surface-alt);color:var(--muted)}
.chip-alert{background:var(--danger-wash);color:var(--danger)}
.chip-warn{background:var(--warn-wash);color:var(--warn)}
.chip-limit{background:var(--danger-wash);color:var(--danger);cursor:help}
.chip-unit{background:var(--surface-alt);color:var(--ink-soft);font-weight:600;font-size:11.5px}
.questions{margin:0;display:grid;gap:11px}
.questions>div{display:grid;grid-template-columns:170px minmax(0,1fr);gap:14px}
.questions dt{font-weight:700;font-size:14px;color:var(--muted)}
.questions dd{margin:0;font-size:15px}
.includes{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:4px}
.note{color:var(--muted);font-size:13px}
.plans-table{overflow-x:auto;margin-top:10px;border:1px solid var(--rule);border-radius:8px}
.plans-table table{border-collapse:collapse;width:100%;min-width:520px;font-size:13.5px}
.plans-table th{text-align:left;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);background:var(--surface-alt);padding:8px 11px;white-space:nowrap}
.plans-table td{padding:8px 11px;border-top:1px solid var(--rule-soft);white-space:nowrap}
.plans-table .n{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums}
.plans-table .highlight{font-weight:600;color:var(--teal-deep)}
:root[data-theme="dark"] .plans-table .highlight,:root:not([data-theme="light"]) .plans-table .highlight{color:var(--teal)}
.empty{color:var(--muted);font-style:italic;margin:0}
.family{margin-bottom:26px}
.family-title{font-family:var(--serif);font-size:20px;font-weight:600;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--teal-wash)}
.family-title .note{font-family:var(--sans);font-weight:400}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}
.card{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:17px 19px}
.card h4{font-size:16px;font-weight:700;margin:0 0 5px}
.aliases{font-size:12.5px;color:var(--muted);margin:0 0 7px;font-family:var(--mono)}
.what-it-is{font-size:14.5px;margin:0 0 7px}
.purpose,.measured,.equivalent,.formula,.plain,.warning,.why{font-size:14px;margin:0 0 7px}
.plain{color:var(--ink-soft);background:var(--surface-alt);padding:8px 11px;border-radius:7px}
.formula{font-family:var(--mono);font-size:12.5px;color:var(--muted)}
.label{font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--teal);margin-right:5px}
.warning{color:var(--warn)}
.pitfalls{margin:9px 0 0;padding-left:17px;font-size:13.5px;color:var(--ink-soft);display:flex;flex-direction:column;gap:4px}
.limits{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.limit{background:var(--surface);border:1px solid var(--rule);border-left:3px solid var(--teal);border-radius:0 10px 10px 0;padding:16px 18px}
.limit h4{font-size:15px;margin:0 0 6px}
.limit p{font-size:14px;margin:0 0 6px}
.hidden{display:none!important}
html:not([lang="es"]) .lang[data-lang="es"],html[lang="es"] .lang[data-lang="en"]{display:none}
footer{border-top:1px solid var(--rule);padding-top:20px;font-size:13.5px;color:var(--muted)}
a{color:var(--teal);text-underline-offset:2px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
@media (max-width:640px){.questions>div{grid-template-columns:1fr;gap:2px}.wrap{padding:30px 16px 60px}.lang-switch{margin-left:0}}
`;

const script = `
(function(){
  var LANGS=${JSON.stringify(LANGS)},root=document.documentElement;
  var state={q:'',family:'',tab:'offers'};
  var boxes={};
  document.querySelectorAll('.lang').forEach(function(c){boxes[c.dataset.lang]=c;});
  function current(){return boxes[root.lang]?root.lang:'${DEFAULT_LANG}';}
  function apply(){
    var box=boxes[current()],search=box.querySelector('.search'),fam=box.querySelector('.family-select'),count=box.querySelector('.count');
    search.value=state.q;fam.value=state.family;fam.disabled=(state.tab==='units');
    box.querySelectorAll('[data-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));});
    box.querySelectorAll('.view').forEach(function(v){v.classList.toggle('hidden',v.dataset.view!==state.tab);});
    var q=state.q.trim().toLowerCase(),shown=0,view=box.querySelector('.view[data-view="'+state.tab+'"]');
    view.querySelectorAll('[data-search]').forEach(function(el){
      var okText=!q||el.dataset.search.indexOf(q)>-1;
      var okFam=!state.family||!el.dataset.family||el.dataset.family===state.family;
      var show=okText&&okFam;
      el.classList.toggle('hidden',!show);
      if(show)shown++;
    });
    view.querySelectorAll('.family').forEach(function(sec){
      if(state.family&&sec.dataset.family&&sec.dataset.family!==state.family){sec.classList.add('hidden');return;}
      sec.classList.toggle('hidden',sec.querySelectorAll('[data-search]:not(.hidden)').length===0);
    });
    count.textContent=(shown===1?box.dataset.one:box.dataset.other).replace('{n}',shown);
    document.title=box.dataset.title;
  }
  function setLang(l){
    if(LANGS.indexOf(l)<0)return;
    root.lang=l;
    try{localStorage.setItem('guide-lang',l);}catch(e){}
    apply();
  }
  Object.keys(boxes).forEach(function(l){
    var box=boxes[l];
    box.querySelector('.search').addEventListener('input',function(e){state.q=e.target.value;apply();});
    box.querySelector('.family-select').addEventListener('change',function(e){state.family=e.target.value;apply();});
    box.querySelectorAll('[data-tab]').forEach(function(b){b.addEventListener('click',function(){state.tab=b.dataset.tab;apply();});});
    box.querySelectorAll('[data-set-lang]').forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.setLang);});});
  });
  apply();
})();
`;

// Picks the language before first paint (stored choice, else the browser's, else English). Never throws.
const earlyLang = `(function(){var l='${DEFAULT_LANG}',ok=${JSON.stringify(LANGS)};try{l=localStorage.getItem('guide-lang')||''}catch(e){l=''}if(ok.indexOf(l)<0){l='${DEFAULT_LANG}';var n=((navigator.languages&&navigator.languages[0])||navigator.language||'').slice(0,2);if(ok.indexOf(n)>-1)l=n}document.documentElement.lang=l})();`;

const embedded = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const translations = Object.fromEntries(Object.entries(overlays).map(([l, o]) => [l, o]));

const html = `<!doctype html>
<html lang="${DEFAULT_LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ui[DEFAULT_LANG].page_title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>${css}</style>
<script>${earlyLang}</script>
</head>
<body>
${LANGS.map(renderLanguage).join('\n')}

<script type="application/json" id="guide-data">${embedded(data)}</script>
${Object.entries(translations)
  .map(([l, o]) => `<script type="application/json" id="guide-data-${l}">${embedded(o)}</script>`)
  .join('\n')}
<script>${script}</script>
</body>
</html>
`;

writeFileSync(new URL('../guide.html', import.meta.url), html, 'utf8');
console.log(`✓ guide.html built — ${data.types.types.length} types, ${data.units.units.length} units, ${data.offers.offers.length} offers, languages: ${LANGS.join(', ')}.`);
