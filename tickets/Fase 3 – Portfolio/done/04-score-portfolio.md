# F3b-17 — Score global del portfolio

## Objetivo

Calcular y mostrar un score único (0–100) que represente la calidad global del portfolio (tarjetas favoritas).

Este score resume:

- ROE medio
- Cashflow total
- % de oportunidades verdes
- feedback del usuario

Sirve como indicador rápido del estado de la cartera.

Todo client-side.
Sin backend.
Sin cuentas.

---

## UX

En vista "Favoritos", encima de las stats:

---
🏆 Score del portfolio: 72 / 100
---

Color del número:

- verde ≥ 70
- amarillo 40–69
- rojo < 40

---

## Inputs al score

Solo tarjetas con:

isFavorite === true

Métricas usadas:

- avgROE (ROE medio)
- totalCashflow
- porcentajeVerdes
- feedback del usuario

---

## Fórmula MVP (simple y ajustable)

Normalizar cada componente a 0–100:

### 1. ROE score

clamp(ROE_medio * 5, 0, 100)

(ej: 10% → 50)

---

### 2. Cashflow score

if totalCashflow <= 0 → 0  
else clamp(totalCashflow / 50, 0, 100)

---

### 3. Veredictos

porcentajeVerdes * 100

---

### 4. Feedback

good = +10  
neutral = 0  
bad = -10  

media por tarjeta.

---

## Score final

media ponderada:

0.35 * ROE_score  
0.35 * Cashflow_score  
0.2 * verdes_score  
0.1 * feedback_score  

---

## Alcance MVP

Implementar:

✅ cálculo score  
✅ mostrar número  
✅ color semáforo  

No:

- explicación detallada
- breakdown visual

---

## Tareas

### 1. Helper

calculatePortfolioScore(favoriteCards) → number

---

### 2. Integración

- llamar tras calcular stats
- mostrar junto a ROE medio

---

## Criterios de aceptación

- Score cambia al modificar favoritos
- Score cambia al editar tarjetas
- Score persiste tras recarga
- Visible en móvil

---

## Nota estratégica

Este score convierte números complejos en una sola señal.

Ideal para usuarios no técnicos.
