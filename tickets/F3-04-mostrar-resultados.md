# Ticket F3-04 — Mostrar resultados (métricas clave)

## Objetivo

Mostrar en el frontend los resultados devueltos por la API de forma clara y útil
para el usuario final.

Con este ticket, la aplicación ya **entrega valor visible**.

---

## Alcance

Este ticket debe incluir:

- Renderizado de resultados del `MotorOutput`
- Mostrar métricas clave de forma legible
- Separar visualmente inputs y resultados

---

## Fuera de alcance

❌ Diseño visual final
❌ Gráficos avanzados
❌ Comparativas
❌ Persistencia

---

## Métricas mínimas a mostrar

Mostrar al menos:

- ingresosAnuales
- gastosAnuales
- beneficioAntesImpuestos
- cashflowFinal
- rentabilidadBruta
- rentabilidadNeta
- roceFinal

---

## Reglas

- Formatear números como € y %
- Manejar el caso "sin resultados"
- No recalcular nada en frontend
- Usar solo datos devueltos por la API

---

## Ubicación sugerida

- Componente `Resultados.tsx`
- Renderizado desde `App.tsx`

---

## Criterios de aceptación

- Los resultados se muestran tras un cálculo exitoso
- Los valores son legibles y bien formateados
- La UI no se rompe si no hay resultados

---

## Prompt para Cursor / Antigravity (copiar y pegar)

Implementa la visualización de resultados del cálculo:

- Crear componente `Resultados`
- Recibir `MotorOutput` como prop
- Mostrar métricas clave (euros y porcentajes)
- Manejar estado sin resultados
- Mantener el código simple y claro

Objetivo: presentar los resultados del motor al usuario.
