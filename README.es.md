# Base de conocimiento de servicios de nube

[English](README.md)

Un índice estructurado de servicios de internet y nube, pensado para **tomar decisiones de infraestructura y coste** comparando ofertas de distintos proveedores sobre una base común.

Responde siempre las mismas ocho preguntas para cada servicio:

| Pregunta | De dónde sale la respuesta |
|---|---|
| ¿Cómo se llama? | `offers.json` → `provider` + `service` |
| ¿Qué es? | `types.json` → `what_it_is` |
| ¿Para qué sirve? | `types.json` → `purpose` |
| ¿Qué ofrece y en qué cantidad? | `offers.json` → `includes[]`, en las unidades de `units.json` |
| ¿Cuánto dura? | `offers.json` → `pricing_model` |
| ¿Cuánto cuesta? | `offers.json` → `price` |
| ¿Quién lo ofrece? | `offers.json` → `provider` |
| ¿Dónde consultarlo? | `offers.json` → `sources[]` + `verified` |

## La idea de fondo: dos capas

Los precios se pudren; las definiciones no. Por eso están separados.

- **Capa estable** — `data/types.json` y `data/units.json`. Qué tipos de servicio existen, para qué sirven y en qué unidades se miden. Se revisa una o dos veces al año.
- **Capa volátil** — `data/offers.json`. Qué da cada proveedor y a qué precio. **Caduca rápido**: cada fila lleva fecha y fuente, y el validador avisa a los 90 días.

Si se mezclaran en un solo documento, todo caducaría a la velocidad de lo más volátil.

## Archivos

```
GUIDE.md                  La guía legible, en inglés
GUIDE.es.md               La guía legible: cómo leer una oferta sin que te engañen
README.md                 Este archivo, en inglés
data/units.json          46 unidades, con explicación en lenguaje llano
data/types.json          71 tipos de servicio en 10 familias
data/offers.json         34 ofertas verificadas, con fecha y fuente
                         (7 de ellas con la tabla de planes completa: 48 escalones)
locales/es/              Traducción al español de la prosa de data/, indexada por id
locales/<idioma>/ui.json Cadenas de la interfaz de la página generada
schema/schema.json       El contrato de los datos y las reglas de integridad
scripts/validate.mjs     Valida, comprueba las traducciones y avisa de lo que está viejo
scripts/build.mjs        Genera guide.html desde los datos
sources/                 Capturas de las tablas de precios oficiales
```

`guide.html` es **producto generado**, no fuente. No lo edites: cambia los datos y vuelve a generarlo. Contiene todos los idiomas a la vez, con un selector en la barra de controles (arranca en el idioma de tu navegador y recuerda tu elección).

## Cómo actualizarlo

Es lo más importante de este repositorio. El flujo, entero:

```bash
node scripts/validate.mjs    # ¿qué lleva más de 90 días sin verificar?
# ...abres la fuente oficial de eso y compruebas las cifras...
# ...editas data/offers.json: cantidades, precio, verified, sources...
# ...y el texto español correspondiente en locales/es/offers.json...
node scripts/validate.mjs    # que siga siendo íntegro y esté traducido
node scripts/build.mjs       # regenera la página
git add data/ locales/ && git commit -m "Verify X quotas (September 2026)"
```

Ese último paso es el que justifica que esto sea un repositorio y no una página suelta: **`git log data/offers.json` te dice exactamente cuándo cambió cada cifra**, con diff. Es la única forma de responder «¿esto siempre fue así?» cuando un proveedor recorta su nivel gratuito sin avisar, como hizo Oracle en agosto de 2026.

### Reglas al añadir una oferta

1. **Sin fuente no entra.** `sources[]` no puede quedar vacío.
2. **Prefiere la documentación del proveedor.** Marca `confidence: "official"` solo si la cifra está en su propia documentación; si viene de un blog o un agregador, `"secondary"`.
3. **Marca el tipo de límite.** Si una cantidad es un tope por petición y no una bolsa mensual, dilo con `limit_type`. Es el dato que más decisiones cambia.
4. **Pon la fecha de hoy** en `verified`, no la de la última vez que alguien lo miró.
5. **Tradúcela.** Añade el texto español de la oferta en `locales/es/offers.json` bajo el mismo id. El validador falla si falta.

## Extraerlo por programa

Los tres archivos son JSON plano. Además, `guide.html` incrusta todo bajo `<script type="application/json" id="guide-data">` (en inglés; la prosa en español va bajo `id="guide-data-es"`), así que la página también sirve como fuente de datos.

```bash
# Ofertas gratuitas que no exigen tarjeta de crédito
node -e "const d=require('./data/offers.json');
console.log(d.offers.filter(o=>o.free&&o.card_required===false).map(o=>o.provider+': '+o.service).join('\n'))"

# Todo lo que caduca
node -e "const d=require('./data/offers.json');
console.log(d.offers.filter(o=>o.expires).map(o=>o.provider+' → '+o.expires).join('\n'))"
```

### Líneas con varios escalones

Cuando un proveedor publica una tabla de tamaños (típico en máquinas virtuales), la oferta lleva un array `plans` con la tabla entera, y `price` resume el rango. Tres campos evitan comparaciones erróneas entre proveedores:

- `binary_units: true` marca a quien expresa memoria y disco en GiB en vez de GB. La diferencia es del 7,4 %.
- `transfer_tb: null` significa «no lo publica en esta tabla», que no es lo mismo que `transfer_unlimited: true`, ni que un número. Son tres estados distintos y confundirlos hace leer como carencia lo que a veces es una ventaja.
- `storage_gb: null` marca a quien no incluye disco y lo cobra aparte, como Fly.io con sus volúmenes.

El validador comprueba además que el precio mensual nunca supere las 730 horas a tarifa horaria. Comparar esa cifra entre los 48 escalones cargados revela algo que ninguna tabla dice en voz alta: **cuánto descuenta cada proveedor por dejar la máquina encendida**.

| Proveedor | Horas implícitas | Descuento frente al mes real |
|---|---|---|
| Hetzner (CX y CPX) | 613–649 | 13–15 % |
| Linode | 667 | 9 % |
| DigitalOcean | 672 | 8 % |
| Vultr | 625–714 | 8 % |
| Fly.io | 718–725 | ~1 % |

Fly.io es el caso distinto: factura por segundo, así que su precio «mensual» es una equivalencia a 30 días y no un tope. Por eso ronda las 720 horas y prácticamente no descuenta. En los demás, el precio mensual sí es un techo.

OVHcloud no aparece en la tabla porque **no publica tarifa horaria**: su línea de VPS se contrata por meses y no hay forma de pagar solo por el rato de uso. La ausencia de una cifra también es información.

## Idiomas

El inglés es el idioma canónico de los datos, el código y la documentación. El español es una traducción de primera clase: `locales/es/` replica `data/`, `GUIDE.es.md` y `README.es.md` son los documentos traducidos, y `guide.html` incluye ambos idiomas. `node scripts/validate.mjs` falla si falta una traducción o no tiene la misma forma. Para añadir otro idioma, ver «Languages (i18n)» en `CLAUDE.md`.

## Alcance y honestidad

Las 34 ofertas son las verificadas durante la investigación que originó este repositorio (septiembre de 2026), no un censo del mercado. Dos están marcadas como `confidence: "secondary"` porque no se pudieron confirmar en documentación oficial: el validador las lista cada vez que se ejecuta.

Los precios cambian sin aviso. Este repositorio no evita ese problema: lo hace **visible**.
