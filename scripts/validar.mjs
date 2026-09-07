// Valida los datos contra el esquema y avisa de lo que está viejo.
// Sin dependencias: node scripts/validar.mjs
import { readFileSync } from 'node:fs';

const DIAS_PARA_REVERIFICAR = 90;

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const unidades = leer('datos/unidades.json');
const tipos = leer('datos/tipos.json');
const ofertas = leer('datos/ofertas.json');

const errores = [];
const avisos = [];
const fallo = (m) => errores.push(m);

// --- Conjuntos de referencia ---
const idsUnidad = new Set(unidades.unidades.map((u) => u.id));
const idsLimite = new Set(unidades.tipos_de_limite.map((l) => l.id));
const idsFamilia = new Set(tipos.familias.map((f) => f.id));
const idsTipo = new Set(tipos.tipos.map((t) => t.id));
const idsModalidad = new Set(ofertas.modalidades.map((m) => m.id));

// --- Identificadores únicos ---
const unicos = (lista, nombre) => {
  const vistos = new Set();
  for (const item of lista) {
    if (vistos.has(item.id)) fallo(`${nombre}: identificador duplicado "${item.id}"`);
    vistos.add(item.id);
  }
};
unicos(unidades.unidades, 'unidades');
unicos(tipos.tipos, 'tipos');
unicos(ofertas.ofertas, 'ofertas');

// --- Unidades ---
for (const u of unidades.unidades) {
  for (const campo of ['nombre', 'magnitud', 'que_mide', 'en_palabras_simples'])
    if (!u[campo]) fallo(`unidad "${u.id}": falta el campo obligatorio ${campo}`);
  if (u.tipo_de_limite_habitual && !idsLimite.has(u.tipo_de_limite_habitual))
    fallo(`unidad "${u.id}": tipo_de_limite_habitual "${u.tipo_de_limite_habitual}" no existe`);
  for (const t of u.se_usa_en ?? [])
    if (!idsTipo.has(t)) fallo(`unidad "${u.id}": se_usa_en apunta a un tipo inexistente "${t}"`);
}

// --- Tipos ---
for (const t of tipos.tipos) {
  for (const campo of ['nombre', 'que_es', 'para_que_sirve'])
    if (!t[campo]) fallo(`tipo "${t.id}": falta el campo obligatorio ${campo}`);
  if (!idsFamilia.has(t.familia)) fallo(`tipo "${t.id}": familia "${t.familia}" no existe`);
  for (const u of t.unidades ?? [])
    if (!idsUnidad.has(u)) fallo(`tipo "${t.id}": unidad "${u}" no existe`);
}

// --- Ofertas ---
const hoy = new Date();
const viejas = [];
for (const o of ofertas.ofertas) {
  for (const campo of ['proveedor', 'servicio', 'precio', 'confianza', 'verificado'])
    if (!o[campo]) fallo(`oferta "${o.id}": falta el campo obligatorio ${campo}`);
  if (!idsTipo.has(o.tipo)) fallo(`oferta "${o.id}": tipo "${o.tipo}" no existe`);
  if (!idsModalidad.has(o.modalidad)) fallo(`oferta "${o.id}": modalidad "${o.modalidad}" no existe`);
  if (!['oficial', 'secundaria'].includes(o.confianza))
    fallo(`oferta "${o.id}": confianza debe ser "oficial" o "secundaria"`);
  if (!Array.isArray(o.fuentes) || o.fuentes.length === 0)
    fallo(`oferta "${o.id}": sin fuentes. Una fila sin fuente no entra.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.verificado ?? ''))
    fallo(`oferta "${o.id}": "verificado" debe ser una fecha AAAA-MM-DD`);

  for (const c of o.incluye ?? []) {
    if (!idsUnidad.has(c.unidad)) fallo(`oferta "${o.id}": unidad "${c.unidad}" no existe`);
    if (typeof c.cantidad !== 'number') fallo(`oferta "${o.id}": cantidad no numérica en "${c.unidad}"`);
    if (c.tipo_limite && !idsLimite.has(c.tipo_limite))
      fallo(`oferta "${o.id}": tipo_limite "${c.tipo_limite}" no existe`);
  }

  for (const p of o.planes ?? []) {
    const etiqueta = p.plan ?? `${p.vcpu} vCPU / ${p.ram_gb} GB`;
    for (const campo of ['vcpu', 'ram_gb', 'precio_mes_usd'])
      if (typeof p[campo] !== 'number')
        fallo(`oferta "${o.id}", plan "${etiqueta}": ${campo} debe ser numérico`);
    if (!(typeof p.almacenamiento_gb === 'number' || p.almacenamiento_gb === null))
      fallo(`oferta "${o.id}", plan "${etiqueta}": almacenamiento_gb debe ser numérico o null (null = no incluye disco)`);
    // El mes nunca debería costar más que las 730 horas del mes a tarifa horaria.
    if (typeof p.precio_hora_usd === 'number' && p.precio_hora_usd > 0) {
      const horas = p.precio_mes_usd / p.precio_hora_usd;
      if (horas > 730)
        fallo(`oferta "${o.id}", plan "${etiqueta}": el mes equivale a ${Math.round(horas)} h de tarifa horaria, más que las 730 h del mes. Revisa las cifras.`);
    }
  }

  const dias = Math.floor((hoy - new Date(o.verificado)) / 86400000);
  if (dias > DIAS_PARA_REVERIFICAR) viejas.push({ id: o.id, proveedor: o.proveedor, dias });
  if (o.confianza === 'secundaria')
    avisos.push(`"${o.id}" (${o.proveedor}) se apoya en fuente secundaria: confirmar en la documentación oficial.`);
}

// --- Informe ---
const n = (x) => String(x).padStart(3);
console.log(`\nUnidades: ${n(unidades.unidades.length)}   Tipos: ${n(tipos.tipos.length)}   Ofertas: ${n(ofertas.ofertas.length)}`);
console.log(`Familias: ${n(tipos.familias.length)}   Modalidades: ${n(ofertas.modalidades.length)}\n`);

if (viejas.length) {
  console.log(`⚠  ${viejas.length} oferta(s) con más de ${DIAS_PARA_REVERIFICAR} días — reverificar:`);
  for (const v of viejas.sort((a, b) => b.dias - a.dias))
    console.log(`   ${v.dias} días · ${v.proveedor} · ${v.id}`);
  console.log('');
} else {
  console.log(`✓ Ninguna oferta supera los ${DIAS_PARA_REVERIFICAR} días desde su verificación.\n`);
}

if (avisos.length) {
  console.log(`ℹ  ${avisos.length} oferta(s) con confianza secundaria:`);
  for (const a of avisos) console.log(`   ${a}`);
  console.log('');
}

if (errores.length) {
  console.error(`✗ ${errores.length} error(es) de integridad:`);
  for (const e of errores) console.error(`   ${e}`);
  process.exit(1);
}

console.log('✓ Datos válidos: referencias íntegras y campos obligatorios presentes.\n');
