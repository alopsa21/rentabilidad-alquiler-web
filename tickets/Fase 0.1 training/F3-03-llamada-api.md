# Ticket F3-03 — Llamada a la API y manejo de estados

## Objetivo

Conectar el formulario del frontend con la API real (`POST /rentabilidad`) y manejar
los estados de carga, éxito y error.

Con este ticket el usuario ya puede **calcular la rentabilidad real** desde la web.

---

## Alcance

Este ticket debe incluir:

- Función para llamar a la API `/rentabilidad`
- Envío del estado del formulario como JSON
- Manejo de estados:
  - loading
  - success
  - error
- Mostrar errores básicos al usuario

---

## Fuera de alcance

❌ Diseño UI final  
❌ Validaciones avanzadas  
❌ Persistencia  
❌ Auth  

---

## Flujo esperado

1. Usuario rellena formulario
2. Pulsa "Calcular"
3. Se hace POST a la API
4. Mientras tanto:
   - botón deshabilitado
   - indicador de loading
5. Si éxito:
   - guardar resultado en estado
6. Si error:
   - mostrar mensaje

---

## Reglas

- Usar `fetch` nativo (no axios)
- URL de la API configurable (env)
- No transformar números a Decimal en frontend
- Manejar errores HTTP correctamente

---

## Ubicación sugerida

- Lógica de llamada en `src/services/api.ts`
- Uso desde `App.tsx` o componente contenedor

---

## Criterios de aceptación

- El botón dispara la llamada a la API
- Se muestra loading mientras se espera respuesta
- En caso de error se muestra mensaje
- En caso de éxito se guarda el resultado

---

## Prompt para Cursor / Antigravity (copiar y pegar)

Implementa la llamada a la API desde el frontend:

- Crear función `calcularRentabilidadApi`
- Hacer POST a `/rentabilidad` con fetch
- Enviar el estado del formulario como JSON
- Manejar estados loading / error / success
- Deshabilitar botón mientras loading
- Mostrar mensaje de error básico si falla

Objetivo: conectar frontend con la API real.
