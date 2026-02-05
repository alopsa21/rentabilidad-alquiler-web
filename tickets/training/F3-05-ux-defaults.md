# Ticket F3-05 — UX mínima + defaults

## Objetivo

Pulir la experiencia de usuario del MVP para que sea **usable por terceros**,
añadiendo defaults razonables, pequeñas mejoras de UX y validaciones básicas.

Con este ticket se da por cerrada la **Fase 3 — Web MVP**.

---

## Alcance

Este ticket debe incluir:

- Defaults razonables en el formulario
- Validaciones básicas en frontend
- Mejoras mínimas de UX
- Mensajes claros al usuario

---

## Fuera de alcance

❌ Diseño visual avanzado
❌ Gráficos
❌ Persistencia
❌ Autenticación

---

## Mejoras UX sugeridas

### Defaults
- comunidadAutonoma preseleccionada
- campos numéricos inicializados a 0
- hayHipoteca = false por defecto

### Validaciones básicas
- precioCompra > 0
- alquilerMensual >= 0
- si hayHipoteca:
  - importeHipoteca > 0
  - tipoInteres > 0
  - plazoHipoteca > 0

### UX
- Deshabilitar botón si inputs inválidos
- Mensajes de error simples y claros
- Scroll automático a resultados tras calcular
- Loading visible

---

## Reglas

- Las validaciones frontend son solo UX (la API sigue validando)
- No duplicar lógica financiera
- Mantener el código simple

---

## Ubicación sugerida

- Lógica en `App.tsx`
- Helpers opcionales en `src/utils/validation.ts`

---

## Criterios de aceptación

- El formulario es usable sin explicación
- Errores evidentes se detectan antes de enviar
- El usuario entiende qué está pasando
- El MVP se siente "terminado"

---

## Prompt para Cursor / Antigravity (copiar y pegar)

Mejora la UX del frontend:

- Añadir valores por defecto a los inputs
- Implementar validaciones básicas de formulario
- Deshabilitar botón "Calcular" si hay errores
- Mostrar mensajes claros al usuario
- Hacer scroll a resultados tras cálculo exitoso

Objetivo: cerrar un Web MVP usable y presentable.
