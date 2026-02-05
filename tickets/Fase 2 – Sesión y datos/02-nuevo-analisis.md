# F3b-13 — Botón "Nuevo análisis" / Limpiar sesión

## Objetivo

Permitir al usuario empezar desde cero rápidamente:

- borrar todas las tarjetas
- limpiar estado local
- resetear inputs

Sin refrescar página.

---

## UX

Botón global visible:

[ Nuevo análisis ]

Ubicación sugerida:

- esquina superior derecha
o
- menú overflow

Al pulsar:

Mostrar confirmación:

"¿Quieres borrar todos los análisis actuales?"

Opciones:

- Cancelar
- Borrar

---

## Comportamiento

Si el usuario confirma:

- limpiar state frontend (cards = [])
- borrar localStorage:
  rentabilidad-alquiler:cards
- reset input URL

Opcional:

- volver a vista inicial (solo input + onboarding si aplica)

---

## Alcance MVP

Implementar:

✅ borrar tarjetas  
✅ limpiar persistencia  
✅ reset UI  

No:

- undo
- histórico

---

## Tareas

### 1. Acción global

Crear handler:

clearSession()

---

### 2. Limpieza

- setCards([])
- localStorage.removeItem("rentabilidad-alquiler:cards")

---

### 3. UI

- botón visible solo si hay tarjetas
- confirm dialog simple (window.confirm o modal)

---

## Criterios de aceptación

- Al pulsar se eliminan todas las tarjetas
- Persistencia queda vacía
- UI vuelve a estado inicial
- No requiere reload

---

## Nota estratégica

Reduce fricción.

El usuario necesita poder "empezar limpio" rápido.
