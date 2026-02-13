# F5-01 — Plugin de navegador (Desktop)

## Objetivo

Crear un plugin/extensión de navegador (Chrome-compatible inicialmente) que permita:

- detectar que el usuario está en un anuncio inmobiliario
- capturar la URL actual
- enviarla automáticamente al producto web
- abrir el frontend con el análisis ya iniciado

El plugin NO tiene lógica de negocio.
Solo es un atajo para enviar URLs.

---

## Principio clave

El plugin NO calcula nada.

Su único trabajo es:

URL actual → abrir web → disparar análisis

Toda la lógica vive en:

- rentabilidad-alquiler-api
- rentabilidad-alquiler-engine
- rentabilidad-alquiler-web

---

## Flujo UX

1. Usuario navega por Idealista (u otro portal)
2. Pulsa botón del plugin: "¿Merece la pena?"
3. Se abre una nueva pestaña:

https://tu-web/app?url=ENCODED_URL

4. El frontend:
- lee el parámetro url
- rellena el input
- lanza análisis automáticamente
- crea tarjeta

El usuario ve directamente el resultado.

---

## Alcance MVP del plugin

Solo:

- botón en toolbar
- captura window.location.href
- abrir nueva pestaña con esa URL

Nada más.

NO:

- UI compleja
- panel propio
- resultados dentro del plugin
- login
- storage

---

## Stack sugerido

- Chrome Extension Manifest v3
- background.ts
- content.ts (opcional)
- popup.html (mínimo)

---

## Estructura mínima

/extension
  /src
    background.ts
    popup.tsx (opcional)
  manifest.json

---

## Tareas

### 1. Crear extensión base

- manifest v3
- permisos mínimos:
  - activeTab
  - tabs

---

### 2. Capturar URL actual

Desde background:

chrome.tabs.query({ active: true })

---

### 3. Abrir frontend

Construir:

const target = `${WEB_URL}/app?url=${encodeURIComponent(currentUrl)}`

chrome.tabs.create({ url: target })

---

### 4. Frontend

Asegurarse de que:

- al cargar /app?url=...
- se lanza automáticamente el análisis

---

## Criterios de aceptación

- Click en plugin abre web con piso cargado
- Se genera tarjeta automáticamente
- No hay lógica financiera en el plugin
- El plugin funciona aunque el usuario no tenga sesión

---

## Notas estratégicas

- Desktop first
- Mobile no soportado aquí
- El plugin es opcional: la web funciona sin él

Este ticket crea el acelerador para power users.
