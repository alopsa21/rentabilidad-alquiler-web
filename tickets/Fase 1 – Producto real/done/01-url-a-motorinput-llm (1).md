# F2b-01 — URL → MotorInput vía Scraping + LLM (backend only)

## Objetivo

Permitir que el usuario pegue una URL de Idealista (u otro portal) y generar automáticamente un `MotorInput` real usando:

- descarga del HTML (backend)
- extracción de texto relevante
- LLM para estructurar datos
- validación con Zod

⚠️ Toda la lógica LLM vive EXCLUSIVAMENTE en `rentabilidad-alquiler-api`.

El frontend nunca debe conocer el token ni llamar directamente al modelo.

Este ticket desbloquea tarjetas distintas y convierte la demo en producto real.

---

## Flujo técnico

Frontend (URL)
   ↓
API recibe URL
   ↓
fetch HTML anuncio (backend)
   ↓
limpieza con cheerio (title + descripción + precio + ubicación)
   ↓
LLM devuelve JSON estructurado (token solo en backend)
   ↓
Zod valida
   ↓
Mapping a MotorInput
   ↓
Engine

---

## Seguridad (OBLIGATORIO)

- El token del LLM debe vivir en variables de entorno:

OPENAI_API_KEY=...

- Acceso únicamente desde la API:

process.env.OPENAI_API_KEY

Nunca:
- exponer token al frontend
- llamar al LLM desde React

Añadir:

- rate limit básico por IP
- timeout en llamadas LLM
- try/catch + fallback

---

## Campos mínimos a obtener

El LLM debe devolver:

{
  precioCompra: number
  comunidadAutonoma: string
  metros: number | null
  habitaciones: number | null
  alquilerMensualEstimado: number
}

Solo estos son obligatorios para el motor:

- precioCompra
- comunidadAutonoma
- alquilerMensualEstimado

---

## Prompt sugerido

Pasar al LLM únicamente texto limpio del anuncio.

Ejemplo:

A partir del siguiente texto de un anuncio inmobiliario, extrae:

- precioCompra (número en euros)
- comunidadAutonoma (string exacto, ej: Comunidad Valenciana)
- metros (number o null)
- habitaciones (number o null)
- alquilerMensualEstimado (número razonable según zona y características)

Devuelve SOLO JSON válido con esta forma:

{
  "precioCompra": number,
  "comunidadAutonoma": string,
  "metros": number | null,
  "habitaciones": number | null,
  "alquilerMensualEstimado": number
}

Texto:
{{TEXTO_ANUNCIO}}

---

## Tareas

### Scraping básico

- fetch HTML desde backend
- usar cheerio para extraer:
  - title
  - bloques de descripción
  - precio
  - ubicación

Unir todo en un string corto (máx ~5–10 KB).

---

### Integración LLM

- cliente OpenAI/Claude SOLO en API
- usar API key desde env
- timeout (~10s)
- retry simple (1 vez)
- log de errores

---

### Validación

Crear schema Zod:

- validar estructura
- validar números > 0

Si falla:

- log
- fallback a valores hardcoded temporales

---

### Mapping

Construir MotorInput:

- precioCompra → LLM
- comunidadAutonoma → LLM
- alquilerMensual → alquilerMensualEstimado
- resto → defaults

---

## Criterios de aceptación

- Pegar URLs distintas produce tarjetas distintas
- El precio coincide con el anuncio
- El alquiler cambia según zona
- El token nunca aparece en frontend
- Si el LLM falla, el sistema no se rompe

---

## Notas

- No exponer “IA” en frontend
- Mostrar siempre “estimado automáticamente”
- Mantener este módulo aislado del engine

Este ticket convierte la demo en producto.
