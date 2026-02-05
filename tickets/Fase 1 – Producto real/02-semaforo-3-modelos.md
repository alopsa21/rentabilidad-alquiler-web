# F3b-08 — Definición del semáforo (3 modelos)

## Objetivo

Implementar el sistema de veredicto 🟢🟡🔴 usando métricas ya calculadas por el motor.

Se deben implementar **tres modelos distintos**, dejando la selección hardcodeada por ahora (se elegirá uno más adelante).

No exponer fórmulas al usuario.

---

## Métricas disponibles

Ya calculadas por el engine:

- rentabilidadBruta
- rentabilidadNeta
- cashflowFinal
- ROCE_inicial
- ROCE_final

El veredicto debe derivarse exclusivamente de estas.

---

## Modelo A — Conservador (Cashflow first)

### Reglas

🟢 Buena oportunidad

cashflowFinal > 0  
AND rentabilidadNeta >= 5%  
AND ROCE_final >= 8%

---

🟡 Oportunidad justa

(cashflowFinal >= 0 AND rentabilidadNeta >= 3%)  
OR (cashflowFinal < 0 AND ROCE_final >= 10%)

---

🔴 Mala oportunidad

Todo lo demás.

---

## Modelo B — Apalancado (ROCE driven)

### Reglas

🟢

ROCE_final >= 12%  
AND cashflowFinal >= 0

---

🟡

ROCE_final >= 8%

---

🔴

ROCE_final < 8%

---

## Modelo C — Balanceado (default recomendado)

### Reglas

🟢

rentabilidadNeta >= 5%  
AND ROCE_final >= 10%  
AND cashflowFinal >= 0

---

🟡

rentabilidadNeta >= 3%  
AND ROCE_final >= 7%

---

🔴

Todo lo demás.

---

## Implementación

Crear función:

calculateVerdict(metrics) =>

{
  status: "green" | "yellow" | "red",
  reasons: string[]
}

---

## Reasons (máx 3)

Ejemplos:

- Cashflow positivo
- Buena rentabilidad neta
- ROCE elevado
- Margen justo
- Rentabilidad baja

Generar reasons coherentes con el modelo aplicado.

---

## Tareas

### 1. Crear módulo verdict.ts

- implementar los tres modelos
- exportar calculateVerdict(model, metrics)

---

### 2. Integración frontend

- usar Modelo C por defecto
- pintar 🟢🟡🔴 en tarjetas y detalle
- mostrar reasons

---

### 3. Tests

- casos verdes claros
- casos amarillos límite
- casos rojos

---

## Criterios de aceptación

- Cambiar métricas cambia el semáforo
- Cada modelo produce resultados distintos
- Modelo C queda activo por defecto
- Usuario solo ve veredicto + reasons

---

## Nota estratégica

Esto convierte números en decisiones.

El usuario no debe ver fórmulas.
Solo conclusiones.
