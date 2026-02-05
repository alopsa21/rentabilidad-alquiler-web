# F3b-11 — Compartir resultados (link / snapshot)

## Objetivo

Permitir al usuario compartir una oportunidad o conjunto de tarjetas mediante:

- link compartible
- snapshot visual (imagen)

Sin cuentas.
Sin backend.
Todo client-side en MVP.

---

## Modalidades

### 1. Compartir link

Generar URL con estado serializado:

/app?state=BASE64_JSON

El state incluye:

- cards[]
- originalInput
- currentInput
- motorOutput

Al abrir el link:

- leer parámetro state
- hidratar tarjetas
- mostrar resultados directamente

---

### 2. Snapshot (imagen)

Botón:

[ Compartir imagen ]

Genera:

- captura de tarjeta o panel completo
- descarga PNG
- listo para WhatsApp / Telegram

Tecnología sugerida:

- html-to-image
o
- dom-to-image

---

## UX

En cada tarjeta:

[ Compartir ]

Opciones:

- Copiar link
- Descargar imagen

---

## Alcance MVP

Implementar:

✅ compartir UNA tarjeta  
Opcional:
- compartir todas

---

## Seguridad / tamaño

- limitar tamaño del state
- máximo N tarjetas (ej: 5)
- fallback si URL > límite

---

## Tareas

### 1. Serialización

Crear helpers:

serializeCards(cards) → string  
deserializeCards(string) → cards[]

Usar JSON + base64.

---

### 2. Link sharing

- botón copiar link
- usar navigator.clipboard

---

### 3. Snapshot

- capturar nodo DOM de tarjeta
- export PNG
- trigger download

---

## Criterios de aceptación

- Compartir link abre resultados completos
- Snapshot descarga imagen legible
- Funciona en móvil
- No requiere login

---

## Nota estratégica

Esto habilita:

- enviar oportunidades por WhatsApp
- compartir con socios
- feedback rápido

Feature clave de viralidad.
