# 🎫 Ticket — Cache + Rate Limit para Autofill Idealista

## Objetivo

Reducir llamadas innecesarias a Idealista y minimizar riesgo de bloqueo mediante:

- cache in-memory por URL
- rate limit global suave

Esto protege:

- infraestructura
- UX
- extractor Idealista

El autofill sigue siendo *best-effort*. Si falla, el usuario completa manualmente.

---

## Alcance

Aplicar únicamente al endpoint:

```
POST /autofill
```

Especialmente al flujo:

```
fetchIdealistaHtml()
```

---

## Parte A — Cache in-memory por URL

### Requisitos

- Cachear resultado final del autofill (no el HTML crudo).
- Key: URL del anuncio.
- TTL: 30–60 minutos.
- Implementación simple en memoria (Map).

No usar Redis todavía.

---

### Interfaz sugerida

Archivo:

```
/services/autofillCache.ts
```

```ts
type CacheEntry<T> = {
  value: T;
  ts: number;
};

const CACHE_TTL = 60 * 60 * 1000; // 1h

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCached<T>(key: string, value: T) {
  cache.set(key, { value, ts: Date.now() });
}
```

---

### Uso en `/autofill`

```ts
const cached = getCached(url);
if (cached) return res.json(cached);

// ... ejecutar extractor

setCached(url, result);
```

---

## Parte B — Rate limit global suave

### Objetivo

Evitar ráfagas contra Idealista.

Requisito:

- máximo 1 request externa / segundo (global)
- cola FIFO simple

---

### Implementación sugerida

Archivo:

```
/services/rateLimiter.ts
```

```ts
let lastRun = 0;
const MIN_INTERVAL = 1000;

export async function rateLimit() {
  const now = Date.now();
  const delta = now - lastRun;

  if (delta < MIN_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL - delta));
  }

  lastRun = Date.now();
}
```

---

### Uso

En `fetchIdealistaHtml()`:

```ts
await rateLimit();
```

Antes de cada request externa.

---

## Logging mínimo

Añadir logs (temporalmente):

- URL
- buyPrice null?
- sqm null?
- rooms null?

Ejemplo:

```ts
console.log("autofill", {
  url,
  buyPrice: !!result.buyPrice,
  sqm: !!result.sqm,
  rooms: !!result.rooms
});
```

---

## Criterios de aceptación

- [ ] Repetir la misma URL no dispara nuevo fetch externo dentro del TTL
- [ ] Nunca se hacen >1 requests externas por segundo
- [ ] Autofill sigue funcionando con cache activada
- [ ] UX no cambia
- [ ] Fallback manual intacto
- [ ] Logs visibles en consola

---

## Notas

- No Redis.
- No middleware pesado.
- No rate-limit por IP (solo global).
- Mantener implementación pequeña.
- Esto es protección MVP, no sistema definitivo.

---

## Regla

El autofill es asistente, no dependencia.

Cache + rate limit existen para proteger el producto, no para escalar scraping.
