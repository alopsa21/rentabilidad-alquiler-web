# Ticket F3-02 — Formulario de Inputs (UI + estado local)

## Objetivo

Crear un formulario en React que permita introducir los **inputs principales**
del cálculo de rentabilidad y gestionar el estado local del formulario.

En este ticket **NO se llama aún a la API**. Solo UI + estado.

---

## Alcance

Este ticket debe incluir:

- Formulario React con campos controlados
- Estado local con `useState` (o equivalente)
- Agrupación básica de campos
- Botón "Calcular" (sin acción real todavía)

---

## Fuera de alcance

❌ Llamadas a la API  
❌ Mostrar resultados  
❌ Validación avanzada  
❌ Estilos finales  

---

## Inputs mínimos a incluir

### Obligatorios
- precioCompra
- comunidadAutonoma
- alquilerMensual

### Opcionales (subset inicial)
- reforma
- notaria
- registro
- comunidadAnual
- ibi
- seguroHogar
- hayHipoteca
- importeHipoteca
- tipoInteres
- plazoHipoteca

(No es necesario incluir todos los inputs del motor todavía)

---

## Reglas

- Usar inputs HTML controlados
- Mantener el estado en un solo objeto
- Usar TypeScript para tipar el estado
- Valores numéricos como `number` en frontend (la conversión a Decimal será backend)

---

## Ubicación sugerida

- `src/App.tsx`
- o componentes en `src/components/Formulario.tsx`

---

## Criterios de aceptación

- El formulario renderiza correctamente
- Se pueden introducir valores
- El estado se actualiza correctamente
- El botón "Calcular" existe (aunque no haga nada)

---

## Prompt para Cursor / Antigravity (copiar y pegar)

Implementa un formulario React para introducir los inputs del cálculo:

- Crear formulario con campos controlados
- Mantener el estado en un objeto usando `useState`
- Incluir los campos obligatorios y algunos opcionales
- Añadir un botón "Calcular" sin lógica
- No llamar aún a la API
- Mantener el código simple y claro

Objetivo: capturar inputs del usuario en el frontend.
