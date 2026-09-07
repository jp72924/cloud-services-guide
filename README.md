# Base de conocimiento de servicios de nube

Un índice estructurado de servicios de internet y nube, pensado para **tomar decisiones de infraestructura y coste** comparando ofertas de distintos proveedores sobre una base común.

Responde siempre las mismas ocho preguntas para cada servicio:

| Pregunta | De dónde sale la respuesta |
|---|---|
| ¿Cómo se llama? | `ofertas.json` → `proveedor` + `servicio` |
| ¿Qué es? | `tipos.json` → `que_es` |
| ¿Para qué sirve? | `tipos.json` → `para_que_sirve` |
| ¿Qué ofrece y en qué cantidad? | `ofertas.json` → `incluye[]`, en las unidades de `unidades.json` |
| ¿Cuánto dura? | `ofertas.json` → `modalidad` |
| ¿Cuánto cuesta? | `ofertas.json` → `precio` |
| ¿Quién lo ofrece? | `ofertas.json` → `proveedor` |
| ¿Dónde consultarlo? | `ofertas.json` → `fuentes[]` + `verificado` |

## La idea de fondo: dos capas

Los precios se pudren; las definiciones no. Por eso están separados.

- **Capa estable** — `datos/tipos.json` y `datos/unidades.json`. Qué tipos de servicio existen, para qué sirven y en qué unidades se miden. Se revisa una o dos veces al año.
- **Capa volátil** — `datos/ofertas.json`. Qué da cada proveedor y a qué precio. **Caduca rápido**: cada fila lleva fecha y fuente, y el validador avisa a los 90 días.

Si se mezclaran en un solo documento, todo caducaría a la velocidad de lo más volátil.

## Archivos

```
GUIA.md              La guía legible: cómo leer una oferta sin que te engañen
datos/unidades.json  46 unidades, con explicación en lenguaje llano
datos/tipos.json     71 tipos de servicio en 10 familias
datos/ofertas.json   37 ofertas verificadas, con fecha y fuente
                     (7 de ellas con la tabla de planes completa: 48 escalones)
esquema/esquema.json El contrato de los datos y las reglas de integridad
scripts/validar.mjs  Valida y avisa de lo que está viejo
scripts/generar.mjs  Genera guia.html desde los datos
```

`guia.html` es **producto generado**, no fuente. No lo edites: cambia los datos y vuelve a generarlo.

## Cómo actualizarlo

Es lo más importante de este repositorio. El flujo, entero:

```bash
node scripts/validar.mjs     # ¿qué lleva más de 90 días sin verificar?
# ...abres la fuente oficial de eso y compruebas las cifras...
# ...editas datos/ofertas.json: cantidades, precio, verificado, fuentes...
node scripts/validar.mjs     # que siga siendo íntegro
node scripts/generar.mjs     # regenera la página
git add datos/ && git commit -m "Verificar cuotas de X (septiembre 2026)"
```

Ese último paso es el que justifica que esto sea un repositorio y no una página suelta: **`git log datos/ofertas.json` te dice exactamente cuándo cambió cada cifra**, con diff. Es la única forma de responder «¿esto siempre fue así?» cuando un proveedor recorta su nivel gratuito sin avisar, como hizo Oracle en agosto de 2026.

### Reglas al añadir una oferta

1. **Sin fuente no entra.** `fuentes[]` no puede quedar vacío.
2. **Prefiere la documentación del proveedor.** Marca `confianza: "oficial"` solo si la cifra está en su propia documentación; si viene de un blog o un agregador, `"secundaria"`.
3. **Marca el tipo de límite.** Si una cantidad es un tope por petición y no una bolsa mensual, dilo con `tipo_limite`. Es el dato que más decisiones cambia.
4. **Pon la fecha de hoy** en `verificado`, no la de la última vez que alguien lo miró.

## Extraerlo por programa

Los tres archivos son JSON plano. Además, `guia.html` incrusta todo bajo `<script type="application/json" id="datos-json">`, así que la página también sirve como fuente de datos.

```bash
# Ofertas gratuitas que no exigen tarjeta de crédito
node -e "const d=require('./datos/ofertas.json');
console.log(d.ofertas.filter(o=>o.gratis&&o.requiere_tarjeta===false).map(o=>o.proveedor+': '+o.servicio).join('\n'))"

# Todo lo que caduca
node -e "const d=require('./datos/ofertas.json');
console.log(d.ofertas.filter(o=>o.caduca).map(o=>o.proveedor+' → '+o.caduca).join('\n'))"
```

### Líneas con varios escalones

Cuando un proveedor publica una tabla de tamaños (típico en máquinas virtuales), la oferta lleva un array `planes` con la tabla entera, y `precio` resume el rango. Dos campos evitan comparaciones erróneas entre proveedores:

- `unidades_binarias: true` marca a quien expresa memoria y disco en GiB en vez de GB. La diferencia es del 7,4 %.
- `transferencia_tb: null` significa «no lo publica en esta tabla», que no es lo mismo que `transferencia_ilimitada: true`, ni que un número. Son tres estados distintos y confundirlos hace leer como carencia lo que a veces es una ventaja.
- `almacenamiento_gb: null` marca a quien no incluye disco y lo cobra aparte, como Fly.io con sus volúmenes.

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

## Alcance y honestidad

Las 37 ofertas son las verificadas durante la investigación que originó este repositorio (septiembre de 2026), no un censo del mercado. Seis están marcadas como `confianza: "secundaria"` porque no se pudieron confirmar en documentación oficial: el validador las lista cada vez que se ejecuta.

Los precios cambian sin aviso. Este repositorio no evita ese problema: lo hace **visible**.
