# Guía de servicios de internet y nube

Esta guía explica **cómo leer una oferta de nube sin que te engañen**. Los datos concretos viven en `datos/`; aquí están las ideas que hacen falta para interpretarlos.

Está escrita para que la entienda alguien sin formación técnica. Si algo no se entiende, es un defecto de la guía, no del lector.

---

## Lo primero: dos cosas que la gente confunde

### Una bolsa no es un tope

Es la distinción más importante de todo el documento, y la que más dinero y tiempo hace perder.

- Una **bolsa** es un total mensual que gastas como quieras. Si te dan 180 000 vCPU-segundos al mes, puedes usarlos en una operación larguísima o en un millón de operaciones cortas. Da igual cómo los repartas.
- Un **tope por petición** es un máximo que ninguna operación individual puede superar, **aunque te sobre todo el mes**.

Ejemplo real: el plan gratuito de Cloudflare Workers da 10 milisegundos de CPU **por petición**. Verificar una contraseña con un cifrado fuerte cuesta unos 33 milisegundos. Resultado: el inicio de sesión falla siempre, aunque el resto del mes esté sin tocar. Con una bolsa mensual del mismo tamaño total, no habría pasado nada.

Cuando compares planes, pregunta siempre: **¿esto es una bolsa o un tope?**

### GB no siempre es GB

- Un **GB** (gigabyte) son 1 000 millones de bytes.
- Un **GiB** (gibibyte) son 1 073 741 824 bytes.

La diferencia es del 7,4 %. Proveedores distintos usan uno u otro para el mismo producto, así que comparar sin mirar cuál usa cada uno introduce un error silencioso.

---

## Las cuatro formas de limitar

| Forma | Qué significa | Dónde duele |
|---|---|---|
| **Bolsa mensual** | Un total para el mes, repartible a tu gusto | En nada, mientras el total alcance |
| **Tope por petición** | Un máximo por operación individual | Las operaciones caras fallan **siempre** |
| **Tope diario** | Una bolsa que se repone cada día | Un pico te deja fuera hasta mañana |
| **Tope simultáneo** | Cuántas cosas a la vez, sin límite de total | En las horas punta |

---

## Las diez familias de servicios

1. **Cómputo** — dónde se ejecuta tu código. Desde alquilar un ordenador entero hasta pagar por milisegundo de ejecución.
2. **Almacenamiento** — dónde viven tus archivos. Barato de llenar, casi siempre caro de vaciar.
3. **Bases de datos** — dónde viven tus datos con estructura y relaciones.
4. **Red y entrega** — cómo llega tu servicio a quien lo usa: tráfico, dominios, certificados, protección.
5. **Comunicación** — cómo tu sistema habla con las personas: correo, SMS, voz, vídeo, notificaciones.
6. **Identidad y seguridad** — quién entra y qué puede hacer.
7. **Desarrollo y operación** — cómo construyes, publicas y vigilas lo que hiciste.
8. **Contenido y aplicación** — piezas de producto ya resueltas: buscadores, mapas, pagos, imágenes.
9. **Inteligencia artificial** — servicios que interpretan o generan texto, voz e imágenes.
10. **Orquestación** — qué se ejecuta, cuándo y en qué orden.

El detalle de los 71 tipos está en `datos/tipos.json` y en la página generada.

---

## Las nueve formas de cobrar

Responden a la pregunta «¿cada cuánto hay que pagar esto?».

| Modalidad | Cómo funciona |
|---|---|
| **Perpetuo gratuito** | Gratis sin fecha de fin, dentro de unos límites |
| **Cuota mensual que se repone** | Cada mes vuelves a tener lo mismo; lo no usado no se acumula |
| **Cuota diaria que se repone** | Se reinicia cada día, normalmente a medianoche UTC |
| **Crédito único** | Un regalo en dinero que, cuando se acaba, se acaba |
| **Gratis por tiempo limitado** | Gratis N meses y luego se cobra, o se cierra la cuenta |
| **Suscripción por tiempo** | Precio fijo, uses lo que uses |
| **Uso medido** | Pagas lo consumido, sin mínimo |
| **Base fija más excedente** | Una cuota que incluye cierto consumo, y tarifa por encima |
| **Por transacción** | Comisión sobre cada operación |

Ojo con la diferencia entre **perpetuo gratuito** y **gratis por tiempo limitado**: las dos se anuncian como «free tier».

---

## Las doce trampas

Todas encontradas verificando ofertas reales, no hipotéticas.

1. **El tope por petición disfrazado de bolsa.** Ver arriba. Es la número uno por un motivo.
2. **El egreso casi nunca es gratis.** Meter datos suele ser gratis; sacarlos se cobra. Y el precio cambia mucho por región: salir desde Sudamérica puede costar seis veces más que desde Estados Unidos.
3. **GiB ≠ GB.** Un 7,4 % de diferencia silenciosa.
4. **Bases de datos gratuitas que caducan.** El PostgreSQL gratuito de Render se borra a los 30 días de crearlo. «Gratis» y «permanente» son cosas distintas.
5. **Cuentas que se cierran solas.** Desde julio de 2025, la cuenta del plan gratuito de AWS se cierra a los seis meses.
6. **Cuotas recortadas sin avisar.** Oracle redujo su nivel gratuito de 4 OCPU/24 GB a 2 OCPU/12 GB en agosto de 2026, sin anuncio público. La gente se enteró cuando le apagaron las máquinas.
7. **Permanencia mínima en almacenamiento frío.** Guardar es baratísimo; borrar antes de tiempo se cobra igual, y recuperar cuesta dinero y horas.
8. **«Gratis» que exige tarjeta.** Koyeb retiene 29 USD para verificarla; Oracle exige tarjeta real, ni virtual ni prepaga. Cloudflare no pide ninguna. Si tus tarjetas son rechazadas con frecuencia, esto decide más que el precio.
9. **Escala a cero significa arranque en frío.** Pagar solo por uso implica que la primera visita tras un rato de calma espera a que el servicio despierte: hasta un minuto en algunos planes gratuitos.
10. **La cuota es por cuenta, no por servicio.** Dos aplicaciones en la misma cuenta comparten el mismo nivel gratuito.
11. **Sobreprecio regional.** La misma máquina en São Paulo cuesta entre un 30 % y un 40 % más que en Virginia.
12. **Gratis sin garantías.** Microsoft dice explícitamente que su plan gratuito de App Service «no está soportado para cargas de producción». Ningún plan gratuito tiene SLA.

---

## Cómo comparar dos ofertas, en orden

1. **¿Qué tipo de servicio es?** Busca el tipo en `datos/tipos.json`: te dice en qué unidades se mide.
2. **Convierte a la misma unidad.** Si una da OCPU-horas y otra vCPU-segundos, pásalas a lo mismo. Una OCPU rinde aproximadamente como dos vCPU.
3. **Mira si es bolsa o tope.** Un tope pequeño puede inutilizar el servicio aunque el total sea generoso.
4. **Busca el egreso.** Si no aparece en la comparación, falta el coste que más sorprende.
5. **Comprueba si caduca** y si exige tarjeta.
6. **Mira la fecha de verificación.** Si tiene más de tres meses, vuelve a la fuente antes de decidir.

### Cuidado con los ratios resumen

Es tentador reducir una línea de producto a un número, tipo «dólares por GB de RAM al mes». Dos avisos:

- **Un ratio no representa a la línea entera.** Dentro de una misma familia el mejor y el peor escalón pueden diferir bastante: en la línea CPX de Hetzner va de 6,75 USD por GB en el plan de entrada a 5,12 en el mayor, y en Linode el Nanode sale a 5,00 mientras el resto de la escala está en 6,00. Si citas un solo número, di **de qué plan salió**; mejor aún, da el rango.
- **El ratio de un recurso ignora los demás.** Los peores valores por GB de RAM suelen ser planes donde pagas por CPU adicional, no por memoria: el de 2 vCPU y 2 GiB de DigitalOcean sale a 9,00 USD por GB precisamente porque el segundo núcleo se cobra ahí. No es un plan malo, es un plan orientado a otra cosa.

---

## Por qué esta guía desconfía de los agregadores

Durante la investigación que originó estos datos se consultó un agregador de niveles gratuitos dirigido a agentes de IA. Sus fichas de Google Cloud y DigitalOcean eran exactas. La de Azure clasificaba la base SQL gratuita como oferta de 12 meses cuando Microsoft documenta que dura **toda la vida de la suscripción** — un error que habría descartado la mejor característica de Azure para el caso que se estaba evaluando.

La conclusión no es «los agregadores mienten», sino algo más útil: **sirven para descubrir opciones, no para decidir**. Por eso cada fila de `datos/ofertas.json` lleva su URL y un campo `confianza` que distingue lo confirmado en documentación oficial de lo que no.
