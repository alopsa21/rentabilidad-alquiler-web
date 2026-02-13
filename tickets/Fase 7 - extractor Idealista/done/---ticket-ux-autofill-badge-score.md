# 🎫 Ticket — UX Autofill Badge + Scoring de Confianza

## Objetivo

Dar transparencia al usuario sobre qué datos del anuncio se han rellenado automáticamente y adaptar el copy del formulario según el nivel de autofill.

Se introduce un **scoring técnico (0–3)** basado en cuántos campos se han podido detectar:

- buyPrice
- sqm
- rooms

Esto evita confusión, mejora confianza y permite detectar roturas del extractor.

---

## Alcance

Frontend + Backend del flujo:

POST /autofill

---

## Parte A — Scoring en backend

### Definición

autofillScore = [buyPrice, sqm, rooms].filter(Boolean).length;

Valores:

- 0 → ningún dato automático
- 1 → un dato
- 2 → dos datos
- 3 → completo

---

### Respuesta del endpoint

{
  buyPrice,
  sqm,
  rooms,
  source: "idealista:v1",
  autofillScore: 0 | 1 | 2 | 3
}

---

### Logging mínimo

console.log("autofill", { url, autofillScore });

---

## Parte B — Badge UX

### autofillScore === 3

🟢 Datos del anuncio detectados automáticamente

### autofillScore === 2

🟡 Algunos datos rellenados automáticamente

### autofillScore <= 1

⚪ No se han podido detectar datos automáticamente

Ubicación: encima del formulario.

---

## Parte C — Copy dinámico

### autofillScore === 0

No hemos podido leer este anuncio. Completa los datos manualmente.

### autofillScore > 0

Hemos rellenado algunos datos automáticamente. Revísalos antes de continuar.

---

## Reglas UX

- Campos siempre editables
- No bloquear flujo
- Sin mensajes técnicos
- El autofill es ayuda, no promesa

---

## Criterios de aceptación

- Backend devuelve autofillScore
- Frontend muestra badge correcto
- Copy cambia según score
- UX funciona con score 0
- Logs visibles

---

## Regla

El autofill es un asistente. El usuario siempre tiene el control.
