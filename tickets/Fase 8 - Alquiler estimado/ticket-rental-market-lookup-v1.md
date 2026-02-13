# 🎫 Ticket — Rental Market Lookup v1 (on‑demand + cache + bootstrap cookies)

## Objetivo

Estimar el alquiler de mercado de un piso usando los informes públicos de alquiler de Idealista, de forma:

- on‑demand (solo cuando un usuario analiza un piso)
- con cache por ciudad
- usando bootstrap de cookies (igual que el extractor de anuncios)

No se hace crawl masivo inicial.

---

## Flujo de alto nivel

Cuando el usuario analiza un piso:

1. Extraer ciudad del anuncio.
2. Buscar en BD si existe `rent_market` para esa ciudad y está fresco.
3. Si existe → usar.
4. Si no existe o está caducado:
   - bootstrap cookies Idealista
   - fetch informe de alquiler de esa ciudad
   - extraer €/m²
   - guardar en BD con timestamp
5. Calcular alquiler estimado:

estimatedRent = sqm * rentEurPerSqm

TTL recomendado: 30 días.

---

## Alcance

Backend (rentabilidad-alquiler-api):

- servicio de lookup de mercado
- extractor €/m² desde HTML
- cache en BD

Frontend:

- consume valor calculado
- permite override manual

---

## Modelo de datos

Tabla / colección:

rent_market

Campos:

city: string  
province?: string  
community?: string  
rentEurPerSqm: number  
source: "idealista-report:v1"  
fetchedAt: Date  

Clave única:

city + province (si aplica)

---

## Parte A — Bootstrap + Fetch informe

Reutilizar patrón existente:

GET https://www.idealista.com/  
→ guardar cookies  
→ GET informe ciudad con cookies  

Ejemplo URL:

/sala-de-prensa/informes-precio-vivienda/alquiler/{community}/{province}/{city}/

---

## Parte B — Extractor €/m² (Idealista Report v1)

Patrón principal:

<strong>XX,X €/m2</strong>

Regex:

<strong>\s*([\d,]+)\s*€/m2\s*</strong>

Implementación:

parseFloat(valor.replace(',', '.'))

---

## Parte C — Cache + TTL

Antes de fetch:

- buscar ciudad en rent_market
- si Date.now() - fetchedAt < 30 días → usar cache

Si no:

- refrescar desde Idealista

---

## Parte D — Rate limit

Reutilizar rate limiter global:

- máximo 1 request externa / segundo

---

## Logging mínimo

console.log("rent-market", {
  city,
  cached,
  rentEurPerSqm
});

---

## Criterios de aceptación

- Primera consulta ciudad hace fetch Idealista
- Segunda consulta misma ciudad usa BD
- TTL invalida correctamente tras 30 días
- €/m² se extrae correctamente
- alquiler estimado = sqm * €/m²
- fallback manual funciona si extractor falla
- rate limit respetado
- no hay crawl masivo

---

## Reglas

- No recorrer todas las ciudades.
- No cron global.
- Solo on‑demand.
- El alquiler estimado es ayuda, no verdad absoluta.
- Campo editable por usuario.

---

## Nota de producto

Esto proporciona un baseline de mercado.

La precisión fina vendrá después (API oficial, barrios, etc.).

Ahora prima:

- simplicidad
- estabilidad
- validación con usuarios.
