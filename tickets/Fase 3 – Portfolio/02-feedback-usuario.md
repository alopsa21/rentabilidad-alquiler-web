# F3b-16 — Feedback del usuario por tarjeta

## Objetivo

Permitir que el usuario indique si una oportunidad le parece:

👍 Buena  
🤔 Dudosa  
👎 Mala  

Esto sirve para:

- recoger señal cualitativa
- entender comportamiento
- preparar futura personalización

Todo local.
Sin backend.
Sin cuentas.

---

## UX

En cada tarjeta, debajo del veredicto:

¿Te parece buena oportunidad?

[ 👍 ]   [ 🤔 ]   [ 👎 ]

Solo se puede elegir una opción.

El estado queda visible (botón activo).

---

## Modelo

Extender tarjeta:

```
feedback: "good" | "neutral" | "bad" | null
```

Persistir junto al resto del estado.

---

## Persistencia

Usar misma key:

rentabilidad-alquiler:cards

El feedback debe sobrevivir recargas.

---

## Alcance MVP

Implementar:

✅ selección feedback  
✅ persistencia  
✅ visualización del estado  

No:

- analytics remotos
- agregados globales
- dashboards

---

## Comportamiento

- Pulsar icono guarda feedback en tarjeta
- Si pulsa otro → reemplaza
- Puede limpiar feedback (opcional)

---

## Tareas

### 1. UI Feedback

- tres botones
- estados activos/inactivos
- responsive móvil

---

### 2. Modelo

- añadir campo feedback
- incluir en localStorage

---

### 3. Helpers

Crear:

setCardFeedback(cardId, value)

---

## Criterios de aceptación

- El usuario puede marcar feedback
- El feedback persiste tras recarga
- Cada tarjeta mantiene su propio feedback
- UX clara en móvil

---

## Nota estratégica

Este feedback permitirá en el futuro:

- aprender preferencias del usuario
- ajustar semáforo
- personalizar recomendaciones

Primer paso hacia producto inteligente.
