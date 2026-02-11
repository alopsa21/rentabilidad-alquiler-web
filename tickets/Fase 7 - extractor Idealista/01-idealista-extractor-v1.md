# 🎫 Ticket — Idealista Extractor v1 (autofill asistido)

## Objetivo

Implementar un extractor **best-effort** para anuncios de Idealista que intente pre-rellenar:

- precio de compra  
- metros construidos  
- número de habitaciones  

a partir del HTML del anuncio.

El extractor **no es core**: si falla cualquier campo, el usuario completa manualmente.

---

## Alcance

### Entrada

- URL de anuncio Idealista (ej: `/inmueble/{id}`)

### Salida

```ts
export interface IdealistaAutofill {
  buyPrice: number | null;
  sqm: number | null;
  rooms: number | null;
  source: "idealista:v1";
}
```

---

## Reglas de producto (importantes)

- El extractor nunca bloquea UX.
- No lanzar exceptions: siempre devolver objeto con `nulls`.
- Solo extraer:
  - buyPrice
  - sqm
  - rooms
- Nada de fotos, texto, descripción, etc.
- Fallback manual obligatorio.
- Guardar siempre `source: "idealista:v1"` para versionado futuro.

---

## Implementación técnica

### 1. Fetch HTML

Backend:

```ts
const html = await fetch(url, browserLikeHeaders).then(r => r.text());
```

Headers mínimos:

- user-agent realista
- accept: text/html

---

### 2. Extractor v1 (regex específicas)

Archivo:

```
/extractors/idealistaV1.ts
```

Contenido:

```ts
export interface IdealistaAutofill {
  buyPrice: number | null;
  sqm: number | null;
  rooms: number | null;
  source: "idealista:v1";
}

function normalizeNumber(input: string): number {
  return Number(input.replace(/\./g, "").replace(",", "."));
}

export function extractIdealistaV1(html: string): IdealistaAutofill {
  const priceMatch =
    html.match(/<strong class="price">([\d\.]+)\s*€/i) ??
    html.match(/info-data-price[^>]*>[\s\S]*?txt-bold">([\d\.]+)/i);

  const buyPrice = priceMatch ? normalizeNumber(priceMatch[1]) : null;

  const sqmMatch =
    html.match(/(\d+)\s*m²\s*construidos/i) ??
    html.match(/<span>\s*<span>(\d+)<\/span>\s*m²/i);

  const sqm = sqmMatch ? Number(sqmMatch[1]) : null;

  const roomsMatch =
    html.match(/(\d+)\s*habitaciones/i) ??
    html.match(/<span>\s*<span>(\d+)<\/span>\s*hab\./i);

  const rooms = roomsMatch ? Number(roomsMatch[1]) : null;

  return {
    buyPrice,
    sqm,
    rooms,
    source: "idealista:v1"
  };
}
```

---

### 3. Router de extractores

Crear:

```
/autofill/autofillFromUrl.ts
```

Responsabilidad:

- detectar dominio
- delegar extractor

Ejemplo:

```ts
if (url.includes("idealista.com")) {
  return extractIdealistaV1(html);
}
```

---

### 4. Endpoint API

```
POST /autofill
```

Body:

```json
{ "url": "..." }
```

Response:

```ts
IdealistaAutofill
```

---

### 5. Frontend

Cuando llega autofill:

- pre-rellenar formulario
- mostrar badge:

> Datos pre-rellenados automáticamente

Campos siempre editables.

Si todo `null`:

- abrir formulario vacío normal.

---

## Tests mínimos

### Test unitario extractor

Con HTML real guardado como fixture:

```
/fixtures/idealista.html
```

Esperado:

```ts
{
  buyPrice: 320000,
  sqm: 118,
  rooms: 3,
  source: "idealista:v1"
}
```

---

## Criterios de aceptación

- [ ] URL Idealista crea tarjeta aunque autofill falle  
- [ ] Precio / m² / habitaciones se rellenan si existen  
- [ ] Campos siempre editables  
- [ ] Ninguna excepción rompe flujo  
- [ ] `source = idealista:v1` guardado  
- [ ] fallback manual funcional  

---

## Notas

- No usar Puppeteer / Playwright.
- No parsear DOM completo.
- Regex específicas únicamente.
- Mantener extractor pequeño y versionable.
