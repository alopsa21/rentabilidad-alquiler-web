# F3b-01 — Layout base + input persistente

## Objetivo

Refactorizar el frontend existente para pasar de calculadora clásica a herramienta de descubrimiento.

NO crear proyecto nuevo.

---

## Contexto importante

Este proyecto ya tiene frontend funcional. Los tickets de la carpata training.
Este ticket debe REUTILIZAR esa base.

Eliminar:
- formulario multiparámetro

Introducir:
- input único de URL persistente en header

Mantener:
- integración API existente
- types
- fetch logic

---

## Tareas

- Crear layout base:
  - header sticky con input URL + botón Analizar
  - contenedor principal debajo
- El input debe permanecer visible siempre
- Preparar estructura para panel de tarjetas

---

## Criterio de aceptación

- Se puede pegar una URL desde cualquier estado
- No existe ya el formulario clásico
- App sigue conectada a la API
