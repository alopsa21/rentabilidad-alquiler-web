# Ticket — Cola acotada y timeout para autofill (rate limit bajo carga)

## Objetivo

Evitar que, con muchos usuarios usando autofill a la vez, las peticiones queden encoladas durante minutos por el rate limit global. Definir e implementar (más adelante) una de estas estrategias: cola acotada o timeout de espera.

---

## Contexto

Hoy el autofill tiene:

- **Cache global por URL** (sin usuario): misma URL → respuesta desde cache, sin llamar a Idealista.
- **Rate limit global**: mínimo 2 s entre cada request externo a Idealista (cookie bootstrap + fetch del anuncio). Las peticiones que necesitan fetch se serializan.

**Problema:** Si muchas peticiones llegan con URLs distintas (cache miss), se encolan. Con 1 request cada 2 s, la petición N puede esperar ~2×(N−1) segundos. Con 50 usuarios simultáneos, el último podría esperar ~100 s. Eso genera mala UX y timeouts en el cliente.

---

## Opciones a implementar (elegir una o combinar)

### A) Cola acotada

- Definir un **máximo de peticiones en espera** (ej. 10).
- Si la cola está llena, no aceptar más en cola: responder de inmediato con **503** (o 429) y un mensaje tipo “Demasiadas peticiones de autofill; inténtalo en unos segundos”.
- Ventaja: nadie espera más de (tamaño_cola × 2 s). Desventaja: parte de los usuarios reciben error y tienen que reintentar.

### B) Timeout de espera

- Definir un **tiempo máximo de espera** en cola (ej. 15 s).
- Si una petición lleva más de X segundos esperando sin haber llegado a ejecutar el fetch, **cancelar** y responder con **503** o **504** y mensaje “Autofill no disponible ahora; inténtalo más tarde”.
- Ventaja: no hay esperas infinitas. Desventaja: implementación un poco más compleja (timers por petición o cola con timestamps).

### C) Híbrido

- Cola acotada (ej. 10) **y** timeout por petición (ej. 15 s).
- Si se supera el tamaño de cola → 503 inmediato.
- Si una petición está en cola más de 15 s → 503/504 y sacarla de la cola.

---

## Alcance técnico

- **Dónde:** `rentabilidad-alquiler-api` (servicio de rate limit y/o autofill).
- **No cambiar:** el comportamiento actual cuando hay poca carga (cache + rate limit cada 2 s).
- **Config:** poder configurar por env:
  - `AUTOFILL_QUEUE_MAX_SIZE` (opcional, para cola acotada).
  - `AUTOFILL_QUEUE_MAX_WAIT_MS` (opcional, para timeout).

---

## Criterios de aceptación (cuando se implemente)

- [ ] Con carga alta (más peticiones de las que el rate limit puede atender), ninguna petición espera más de X segundos (configurable) o recibe error claro.
- [ ] Respuesta de error incluye mensaje entendible para el usuario y/o código HTTP estándar (503/429).
- [ ] En carga normal, el comportamiento actual (cache + rate limit 2 s) se mantiene.
- [ ] Documentación o comentarios en código sobre los límites y variables de entorno.

---

## Notas

- El cache sigue siendo la primera línea de defensa: muchas peticiones repetidas (misma URL) no pasan por la cola.
- Este ticket es para hacer cuando se priorice producción y carga real; no es bloqueante para el MVP.
