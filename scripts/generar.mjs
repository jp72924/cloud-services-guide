// Genera guia.html a partir de los tres archivos de datos.
// Sin dependencias: node scripts/generar.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const leer = (r) => JSON.parse(readFileSync(new URL(`../${r}`, import.meta.url), 'utf8'));
const unidades = leer('datos/unidades.json');
const tipos = leer('datos/tipos.json');
const ofertas = leer('datos/ofertas.json');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const uPorId = new Map(unidades.unidades.map((u) => [u.id, u]));
const tPorId = new Map(tipos.tipos.map((t) => [t.id, t]));
const fPorId = new Map(tipos.familias.map((f) => [f.id, f]));
const mPorId = new Map(ofertas.modalidades.map((m) => [m.id, m]));
const lPorId = new Map(unidades.tipos_de_limite.map((l) => [l.id, l]));

const num = (n) => new Intl.NumberFormat('es').format(n);

const cantidadTexto = (c) => {
  const u = uPorId.get(c.unidad);
  const periodo = c.periodo === 'dia' ? ' al día' : c.periodo === 'mes' ? ' al mes' : c.periodo === 'ano' ? ' al año' : '';
  const nota = c.nota ? ` <span class="nota">(${esc(c.nota)})</span>` : '';
  const limite =
    c.tipo_limite && c.tipo_limite !== 'cuota-agrupada'
      ? ` <span class="chip chip-limite" title="${esc(lPorId.get(c.tipo_limite)?.explicacion ?? '')}">${esc(lPorId.get(c.tipo_limite)?.nombre ?? c.tipo_limite)}</span>`
      : '';
  return `<strong>${num(c.cantidad)}</strong> ${esc(u?.nombre ?? c.unidad)}${periodo}${nota}${limite}`;
};

// ---------- Secciones ----------

const seccionOfertas = ofertas.ofertas
  .map((o) => {
    const t = tPorId.get(o.tipo);
    const f = fPorId.get(t?.familia);
    const m = mPorId.get(o.modalidad);
    const busca = [o.proveedor, o.servicio, t?.nombre, f?.nombre, ...(t?.alias ?? [])].join(' ').toLowerCase();
    const tablaPlanes = (o.planes ?? []).length
      ? `<div class="tabla-planes"><table>
  <thead><tr><th>Plan</th><th>vCPU</th><th>RAM${o.unidades_binarias ? ' (GiB)' : ''}</th><th>Disco${o.unidades_binarias ? ' (GiB)' : ''}</th><th>Transf.</th><th>$/h</th><th>$/mes</th></tr></thead>
  <tbody>${o.planes
    .map(
      (p) => `<tr>
    <td>${p.plan ? esc(p.plan) : '<span class="nota">sin nombre</span>'}${p.procesador ? ` <span class="nota">${esc(p.procesador)}</span>` : ''}</td>
    <td class="n">${p.vcpu}</td><td class="n">${p.ram_gb}</td><td class="n">${p.almacenamiento_gb == null ? '—' : p.almacenamiento_gb}</td>
    <td class="n">${p.transferencia_ilimitada ? 'ilimitada' : p.transferencia_tb == null ? '—' : p.transferencia_tb + ' TB'}</td>
    <td class="n">${p.precio_hora_usd != null ? p.precio_hora_usd.toFixed(5).replace(/0+$/, '').replace(/\.$/, '') : '—'}</td>
    <td class="n destacado">${p.precio_mes_usd.toFixed(2)}</td>
  </tr>`,
    )
    .join('')}</tbody></table></div>`
      : '';
    const incluye = (o.incluye ?? []).length
      ? `<ul class="incluye">${o.incluye.map((c) => `<li>${cantidadTexto(c)}</li>`).join('')}</ul>${tablaPlanes}`
      : tablaPlanes || '<p class="vacio">Sin cantidades publicadas.</p>';
    return `
<article class="oferta" data-busca="${esc(busca)}" data-familia="${esc(t?.familia ?? '')}" data-gratis="${o.gratis}">
  <header class="oferta-cab">
    <div>
      <p class="prov">${esc(o.proveedor)}</p>
      <h3>${esc(o.servicio)}</h3>
    </div>
    <div class="sellos">
      ${o.gratis ? '<span class="chip chip-si">Gratis</span>' : '<span class="chip chip-no">De pago</span>'}
      ${o.requiere_tarjeta === false ? '<span class="chip chip-si">Sin tarjeta</span>' : ''}
      ${o.caduca ? `<span class="chip chip-alerta">Caduca: ${esc(o.caduca)}</span>` : ''}
      ${o.confianza === 'secundaria' ? '<span class="chip chip-aviso">Fuente secundaria</span>' : ''}
    </div>
  </header>
  <dl class="preguntas">
    <div><dt>¿Qué es?</dt><dd>${esc(t?.que_es ?? '—')}</dd></div>
    <div><dt>¿Para qué sirve?</dt><dd>${esc(t?.para_que_sirve ?? '—')}</dd></div>
    <div><dt>¿Qué ofrece?</dt><dd>${incluye}</dd></div>
    <div><dt>¿Cuánto dura?</dt><dd><strong>${esc(m?.nombre ?? o.modalidad)}.</strong> ${esc(m?.explicacion ?? '')}</dd></div>
    <div><dt>¿Cuánto cuesta?</dt><dd>${esc(o.precio)}${o.precio_al_exceder ? `<br><span class="nota">Al exceder: ${esc(o.precio_al_exceder)}</span>` : ''}</dd></div>
    ${o.notas ? `<div><dt>A tener en cuenta</dt><dd>${esc(o.notas)}</dd></div>` : ''}
    <div><dt>Fuentes</dt><dd>${o.fuentes.map((s) => `<a href="${esc(s)}">${esc(new URL(s).hostname)}</a>`).join(' · ')} <span class="nota">— verificado el ${esc(o.verificado)}</span></dd></div>
  </dl>
</article>`;
  })
  .join('');

const seccionTipos = tipos.familias
  .map((f) => {
    const dela = tipos.tipos.filter((t) => t.familia === f.id);
    return `
<section class="familia" data-familia="${esc(f.id)}">
  <h3 class="familia-tit">${esc(f.nombre)} <span class="nota">${esc(f.resumen)}</span></h3>
  <div class="tipos">
    ${dela
      .map(
        (t) => `
    <article class="tipo" data-busca="${esc([t.nombre, ...(t.alias ?? []), t.que_es].join(' ').toLowerCase())}">
      <h4>${esc(t.nombre)}</h4>
      ${t.alias?.length ? `<p class="alias">También: ${t.alias.map(esc).join(' · ')}</p>` : ''}
      <p class="que-es">${esc(t.que_es)}</p>
      <p class="sirve"><span class="etiq">Sirve para</span> ${esc(t.para_que_sirve)}</p>
      ${t.unidades?.length ? `<p class="mide"><span class="etiq">Se mide en</span> ${t.unidades.map((u) => `<span class="chip chip-unidad">${esc(uPorId.get(u)?.nombre ?? u)}</span>`).join(' ')}</p>` : ''}
      ${t.trampas?.length ? `<ul class="trampas">${t.trampas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </article>`,
      )
      .join('')}
  </div>
</section>`;
  })
  .join('');

const porMagnitud = new Map();
for (const u of unidades.unidades) {
  if (!porMagnitud.has(u.magnitud)) porMagnitud.set(u.magnitud, []);
  porMagnitud.get(u.magnitud).push(u);
}

const seccionUnidades = [...porMagnitud.entries()]
  .map(
    ([magnitud, lista]) => `
<section class="familia">
  <h3 class="familia-tit">${esc(magnitud)}</h3>
  <div class="tipos">
    ${lista
      .map(
        (u) => `
    <article class="tipo unidad" data-busca="${esc([u.nombre, u.que_mide, u.en_palabras_simples].join(' ').toLowerCase())}">
      <h4>${esc(u.nombre)}</h4>
      <p class="que-es">${esc(u.que_mide)}</p>
      <p class="simple">${esc(u.en_palabras_simples)}</p>
      ${u.formula ? `<p class="formula">${esc(u.formula)}</p>` : ''}
      ${u.equivalencia_util ? `<p class="equiv"><span class="etiq">Para hacerse una idea</span> ${esc(u.equivalencia_util)}</p>` : ''}
      ${u.advertencia ? `<p class="aviso">${esc(u.advertencia)}</p>` : ''}
    </article>`,
      )
      .join('')}
  </div>
</section>`,
  )
  .join('');

const seccionLimites = unidades.tipos_de_limite
  .map(
    (l) => `
<article class="limite">
  <h4>${esc(l.nombre)}</h4>
  <p>${esc(l.explicacion)}</p>
  <p class="porque"><span class="etiq">Por qué importa</span> ${esc(l.por_que_importa)}</p>
</article>`,
  )
  .join('');

const html = `<title>Servicios de nube: qué son y qué cuestan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
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
body{background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:48px 24px 88px;display:flex;flex-direction:column;gap:40px}
h1{font-family:var(--serif);font-size:clamp(31px,4.5vw,45px);font-weight:700;line-height:1.1;letter-spacing:-.5px;text-wrap:balance;margin:0 0 14px}
h2{font-family:var(--serif);font-size:25px;font-weight:600;margin:0 0 4px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:var(--teal);margin:0 0 10px}
.standfirst{font-size:18px;color:var(--ink-soft);max-width:64ch;margin:0}
.section-head{display:flex;flex-direction:column;gap:3px;margin-bottom:4px}
.section-head p{color:var(--muted);font-size:15px;margin:0;max-width:70ch}
section.bloque{display:flex;flex-direction:column;gap:18px}
.como{background:var(--teal-deep);color:#eaf6f4;border-radius:14px;padding:28px 30px}
:root[data-theme="dark"] .como,:root:not([data-theme="light"]) .como{color:#06181a}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]) .como{color:#eaf6f4}}
.como h2{color:inherit;margin-bottom:10px}
.como ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px}
.como li{opacity:.93;max-width:70ch}
.como code{background:rgba(255,255,255,.14);padding:1px 6px;border-radius:4px;font-family:var(--mono);font-size:.85em}
.controles{position:sticky;top:0;z-index:5;background:var(--ground);padding:12px 0;border-bottom:1px solid var(--rule);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input[type=search],select{font:inherit;font-size:15px;padding:9px 12px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink)}
input[type=search]{flex:1;min-width:220px}
.pestanas{display:flex;gap:6px;flex-wrap:wrap}
.pestanas button{font:inherit;font-size:14px;font-weight:600;padding:9px 15px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink-soft);cursor:pointer}
.pestanas button[aria-selected=true]{background:var(--teal-wash);border-color:var(--teal);color:var(--teal-deep)}
:root[data-theme="dark"] .pestanas button[aria-selected=true],:root:not([data-theme="light"]) .pestanas button[aria-selected=true]{color:var(--teal)}
.conteo{font-size:13px;color:var(--muted);font-family:var(--mono)}
.oferta{background:var(--surface);border:1px solid var(--rule);border-radius:12px;padding:22px 24px;margin-bottom:14px}
.oferta-cab{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--rule-soft)}
.prov{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--teal);font-weight:700;margin:0 0 2px}
.oferta h3{font-family:var(--serif);font-size:21px;font-weight:600;margin:0}
.sellos{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.4px;padding:3px 9px;border-radius:999px;white-space:nowrap}
.chip-si{background:var(--teal-wash);color:var(--teal-deep)}
:root[data-theme="dark"] .chip-si,:root:not([data-theme="light"]) .chip-si{color:var(--teal)}
.chip-no{background:var(--surface-alt);color:var(--muted)}
.chip-alerta{background:var(--danger-wash);color:var(--danger)}
.chip-aviso{background:var(--warn-wash);color:var(--warn)}
.chip-limite{background:var(--danger-wash);color:var(--danger);cursor:help}
.chip-unidad{background:var(--surface-alt);color:var(--ink-soft);font-weight:600;font-size:11.5px}
.preguntas{margin:0;display:grid;gap:11px}
.preguntas>div{display:grid;grid-template-columns:170px minmax(0,1fr);gap:14px}
.preguntas dt{font-weight:700;font-size:14px;color:var(--muted)}
.preguntas dd{margin:0;font-size:15px}
.incluye{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:4px}
.nota{color:var(--muted);font-size:13px}
.tabla-planes{overflow-x:auto;margin-top:10px;border:1px solid var(--rule);border-radius:8px}
.tabla-planes table{border-collapse:collapse;width:100%;min-width:520px;font-size:13.5px}
.tabla-planes th{text-align:left;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);background:var(--surface-alt);padding:8px 11px;white-space:nowrap}
.tabla-planes td{padding:8px 11px;border-top:1px solid var(--rule-soft);white-space:nowrap}
.tabla-planes .n{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums}
.tabla-planes .destacado{font-weight:600;color:var(--teal-deep)}
:root[data-theme="dark"] .tabla-planes .destacado,:root:not([data-theme="light"]) .tabla-planes .destacado{color:var(--teal)}
.vacio{color:var(--muted);font-style:italic;margin:0}
.familia{margin-bottom:26px}
.familia-tit{font-family:var(--serif);font-size:20px;font-weight:600;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--teal-wash)}
.familia-tit .nota{font-family:var(--sans);font-weight:400}
.tipos{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}
.tipo{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:17px 19px}
.tipo h4{font-size:16px;font-weight:700;margin:0 0 5px}
.alias{font-size:12.5px;color:var(--muted);margin:0 0 7px;font-family:var(--mono)}
.que-es{font-size:14.5px;margin:0 0 7px}
.sirve,.mide,.equiv,.formula,.simple,.aviso,.porque{font-size:14px;margin:0 0 7px}
.simple{color:var(--ink-soft);background:var(--surface-alt);padding:8px 11px;border-radius:7px}
.formula{font-family:var(--mono);font-size:12.5px;color:var(--muted)}
.etiq{font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--teal);margin-right:5px}
.aviso{color:var(--warn)}
.trampas{margin:9px 0 0;padding-left:17px;font-size:13.5px;color:var(--ink-soft);display:flex;flex-direction:column;gap:4px}
.limites{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.limite{background:var(--surface);border:1px solid var(--rule);border-left:3px solid var(--teal);border-radius:0 10px 10px 0;padding:16px 18px}
.limite h4{font-size:15px;margin:0 0 6px}
.limite p{font-size:14px;margin:0 0 6px}
.oculto{display:none!important}
footer{border-top:1px solid var(--rule);padding-top:20px;font-size:13.5px;color:var(--muted)}
a{color:var(--teal);text-underline-offset:2px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
@media (max-width:640px){.preguntas>div{grid-template-columns:1fr;gap:2px}.wrap{padding:30px 16px 60px}}
</style>

<div class="wrap">
<header>
  <p class="eyebrow">Base de conocimiento · actualizada el ${esc(ofertas.actualizado)}</p>
  <h1>Servicios de nube: qué son y qué cuestan</h1>
  <p class="standfirst">Un índice de ${tipos.tipos.length} tipos de servicio, las ${unidades.unidades.length} unidades en que se miden y ${ofertas.ofertas.length} ofertas concretas verificadas contra la documentación de cada proveedor. Pensado para responder siempre las mismas ocho preguntas y poder comparar peras con peras.</p>
</header>

<div class="como">
  <h2>Cómo leer esto</h2>
  <ol>
    <li><strong>Los tipos y las unidades casi no cambian</strong>; los precios sí, y rápido. Por eso van separados: cada oferta lleva su fecha y su fuente.</li>
    <li><strong>Antes de comparar dos ofertas, mira la unidad.</strong> «10 ms de CPU por petición» y «180 000 vCPU-segundos al mes» no son la misma magnitud, y confundirlas lleva a elegir mal.</li>
    <li><strong>Distingue una bolsa de un tope.</strong> Una bolsa mensual la gastas como quieras; un tope por petición hace fallar toda operación cara, aunque el mes esté sin usar.</li>
    <li>Los datos están en <code>datos/*.json</code>. <code>node scripts/validar.mjs</code> avisa de lo que lleva más de 90 días sin verificar.</li>
  </ol>
</div>

<div class="controles">
  <input type="search" id="buscar" placeholder="Buscar: base de datos, correo, tokens, Cloudflare…" aria-label="Buscar en la guía">
  <select id="familia" aria-label="Filtrar por familia">
    <option value="">Todas las familias</option>
    ${tipos.familias.map((f) => `<option value="${esc(f.id)}">${esc(f.nombre)}</option>`).join('')}
  </select>
  <div class="pestanas" role="tablist">
    <button role="tab" aria-selected="true" data-vista="ofertas">Ofertas</button>
    <button role="tab" aria-selected="false" data-vista="tipos">Tipos de servicio</button>
    <button role="tab" aria-selected="false" data-vista="unidades">Unidades</button>
  </div>
  <span class="conteo" id="conteo"></span>
</div>

<section class="bloque" id="vista-ofertas">
  <div class="section-head">
    <h2>Ofertas verificadas</h2>
    <p>Cada tarjeta responde las ocho preguntas. Lo marcado como «fuente secundaria» no pudo confirmarse en la documentación oficial del proveedor: confírmalo antes de decidir.</p>
  </div>
  ${seccionOfertas}
</section>

<section class="bloque oculto" id="vista-tipos">
  <div class="section-head">
    <h2>Tipos de servicio</h2>
    <p>Qué es cada cosa, para qué sirve, en qué se mide y con qué trampas viene.</p>
  </div>
  ${seccionTipos}
</section>

<section class="bloque oculto" id="vista-unidades">
  <div class="section-head">
    <h2>Cómo se mide y se cobra</h2>
    <p>El vocabulario que hace comparables las ofertas. Cada unidad va explicada primero con precisión y después en palabras llanas.</p>
  </div>
  <div class="section-head"><h2 style="font-size:20px">Cuatro formas de limitar</h2><p>Antes que las unidades, esto: la misma cifra significa cosas muy distintas según cómo se aplique.</p></div>
  <div class="limites">${seccionLimites}</div>
  ${seccionUnidades}
</section>

<footer>
  <p>Generado desde <code>datos/*.json</code> con <code>node scripts/generar.mjs</code>. No editar a mano: los cambios se hacen en los datos y se regenera. Los datos completos van incrustados en esta página como JSON, bajo el identificador <code>datos-json</code>, para poder extraerlos por programa.</p>
</footer>
</div>

<script type="application/json" id="datos-json">${JSON.stringify({ unidades, tipos, ofertas }).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  var buscar=document.getElementById('buscar'),familia=document.getElementById('familia'),conteo=document.getElementById('conteo');
  var vistas={ofertas:document.getElementById('vista-ofertas'),tipos:document.getElementById('vista-tipos'),unidades:document.getElementById('vista-unidades')};
  var actual='ofertas';
  function filtrar(){
    var q=buscar.value.trim().toLowerCase(),fam=familia.value,vistos=0;
    var cont=vistas[actual];
    cont.querySelectorAll('[data-busca]').forEach(function(el){
      var okTexto=!q||el.dataset.busca.indexOf(q)>-1;
      var okFam=!fam||!el.dataset.familia||el.dataset.familia===fam;
      var ver=okTexto&&okFam;
      el.classList.toggle('oculto',!ver);
      if(ver)vistos++;
    });
    cont.querySelectorAll('.familia').forEach(function(sec){
      if(fam&&sec.dataset.familia&&sec.dataset.familia!==fam){sec.classList.add('oculto');return;}
      var quedan=sec.querySelectorAll('[data-busca]:not(.oculto)').length;
      sec.classList.toggle('oculto',quedan===0);
    });
    conteo.textContent=vistos+' resultado'+(vistos===1?'':'s');
  }
  buscar.addEventListener('input',filtrar);
  familia.addEventListener('change',filtrar);
  document.querySelectorAll('[data-vista]').forEach(function(b){
    b.addEventListener('click',function(){
      actual=b.dataset.vista;
      document.querySelectorAll('[data-vista]').forEach(function(o){o.setAttribute('aria-selected',String(o===b));});
      Object.keys(vistas).forEach(function(k){vistas[k].classList.toggle('oculto',k!==actual);});
      familia.disabled=(actual==='unidades');
      filtrar();
    });
  });
  filtrar();
})();
</script>`;

writeFileSync(new URL('../guia.html', import.meta.url), html, 'utf8');
console.log(`✓ guia.html generado — ${tipos.tipos.length} tipos, ${unidades.unidades.length} unidades, ${ofertas.ofertas.length} ofertas.`);
