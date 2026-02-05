# F3b-06 — Edición de tarjetas + recalculo en tiempo real

## Objetivo

Permitir al usuario editar manualmente los datos clave de cada tarjeta:

- precio de compra
- alquiler mensual
- zona / comunidad (opcional)

y recalcular automáticamente todas las métricas (veredicto incluido).

Además, debe existir una opción clara para **revertir los cambios** y volver a los valores originales extraídos del anuncio.

---

## Principio UX

- Los valores iniciales vienen del análisis automático.
- El usuario puede ajustar.
- El sistema recalcula en vivo.
- El usuario puede volver atrás en un click.

Aprendizaje por interacción.

---

## Campos editables (MVP)

Por tarjeta:

- precioCompra
- alquilerMensual
- comunidadAutonoma (select simple)

Opcional futuro:
- metros
- habitaciones

---

## Comportamiento

### Al editar un campo:

- se actualiza el MotorInput local de esa tarjeta
- se vuelve a llamar al engine (frontend o API)
- se recalculan:

  - veredicto
  - cashflow
  - rentabilidades
  - ROCE

Sin necesidad de volver a scrapear ni llamar al LLM.

---

## Estado interno

Cada tarjeta debe mantener:

originalInput  (resultado del scraping/LLM)
currentInput   (editable por usuario)

El cálculo siempre usa currentInput.

---

## Botón Revertir

Cada tarjeta debe tener:

[ Revertir cambios ]

Al pulsar:

currentInput = originalInput
recalcular métricas

---

## UI sugerida

En vista detalle:

Precio compra:   [ input number ]
Alquiler mensual:[ input number ]
Zona:            [ select ]

Debajo:

[ Revertir cambios ]

---

## Tareas

### 1. Modelo de tarjeta

Extender modelo frontend:

{
  id
  originalInput
  currentInput
  motorOutput
}

---

### 2. Inputs editables

- inputs numéricos controlados
- debounce ligero (~300ms)
- trigger recalculo

---

### 3. Recalculo

- reutilizar endpoint existente
- NO volver a ejecutar scraping/LLM
- solo motor

---

### 4. Revert

- botón visible solo si currentInput != originalInput
- reset + recalculo

---

## Criterios de aceptación

- Cambiar precio o alquiler modifica veredicto en tiempo real
- Cada tarjeta mantiene sus propios ajustes
- Revertir restaura exactamente los valores iniciales
- No se vuelve a llamar al LLM al editar
- UX fluida en móvil

---

## Nota estratégica

Esto convierte la herramienta en interactiva:
el usuario aprende tocando.

Feature clave de engagement.
