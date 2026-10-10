# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Base de conocimiento (en español) de servicios de nube para comparar ofertas de proveedores sobre una base común. No hay build ni dependencias: son datos JSON más dos scripts de Node sin paquetes (`package.json` no existe). Todo el contenido y los mensajes están en español; mantén ese idioma en datos, commits y salidas.

## Comandos

```bash
node scripts/validar.mjs   # valida integridad referencial y lista lo que lleva >90 días sin verificar; sale con código 1 si hay errores
node scripts/generar.mjs   # regenera guia.html desde datos/*.json
```

No hay tests ni linter; `validar.mjs` es la única comprobación. Flujo normal tras tocar datos: validar → generar → commit de `datos/`.

## Arquitectura

Dos capas deliberadamente separadas por velocidad de caducidad:

- **Estable**: `datos/tipos.json` (tipos de servicio en familias) y `datos/unidades.json` (unidades y tipos de límite).
- **Volátil**: `datos/ofertas.json` (ofertas con precio, `verificado` y `fuentes[]`; también define `modalidades`).

Las ofertas referencian por id a tipos, modalidades y unidades; los tipos referencian familias y unidades; las unidades referencian tipos y tipos de límite. `scripts/validar.mjs` comprueba todas esas referencias cruzadas, ids únicos, campos obligatorios y reglas extra (p. ej. el precio mensual de un escalón no puede superar 730 h × tarifa horaria). `esquema/esquema.json` es el contrato documentado; si cambias la forma de los datos, actualiza esquema, validador y generador a la vez.

`guia.html` es producto generado (está en `.gitignore`): no se edita ni se versiona; incrusta los datos en `<script type="application/json" id="datos-json">`. `GUIA.md` es la guía escrita a mano sobre cómo leer una oferta. `fuentes/` guarda capturas de las tablas de precios oficiales usadas para cargar los planes.

## Convenciones de datos (las que más fallan)

- Sin fuente no entra: `fuentes[]` no puede estar vacío. `confianza: "oficial"` solo si la cifra está en documentación del proveedor; si no, `"secundaria"`.
- Marca `tipo_limite` cuando una cantidad es un tope por petición y no una bolsa mensual.
- `verificado` lleva la fecha real en que se comprobó la fuente, no la de la última revisión de otro.
- Ofertas con tabla de tamaños llevan `planes[]` y `precio` resume el rango. En ellos `transferencia_tb: null` (no publicado), `transferencia_ilimitada: true` y un número son tres estados distintos; `almacenamiento_gb: null` significa disco cobrado aparte; `unidades_binarias: true` marca GiB en vez de GB.
- Los recuentos (unidades, tipos, ofertas, escalones) aparecen escritos a mano en `README.md`: actualízalos al añadir o quitar ofertas, o quedarán desfasados.
- Los commits de `datos/` son el historial de precios (`git log datos/ofertas.json`); usa mensajes descriptivos en español del tipo «Verificar cuotas de X (mes año)».
