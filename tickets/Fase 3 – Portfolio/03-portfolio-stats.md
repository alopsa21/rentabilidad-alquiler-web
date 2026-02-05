# F3b-15 — Portfolio Stats (ROE medio + Cashflow total)

## Objetivo

Mostrar métricas agregadas del mini portfolio (tarjetas marcadas como favoritas):

- ROE medio
- Cashflow total anual
- Número de propiedades

Esto ayuda al usuario a pensar en términos de cartera, no de pisos individuales.

Todo client-side.
Sin backend.
Sin cuentas.

---

## UX

En vista "Favoritos":

Mostrar bloque superior:

---
📊 Mi portfolio

Propiedades: 3  
ROE medio: 9.4%  
Cashflow anual total: +1.240 €

---

Formato compacto, visible sin scroll.

---

## Métricas

Sobre tarjetas con:

isFavorite === true

Calcular:

### ROE medio

Media simple:

sum(ROE_final) / N

---

### Cashflow total anual

Sumatorio:

sum(cashflowFinal)

---

### Número de propiedades

N tarjetas favoritas.

---

## Alcance MVP

Implementar:

✅ ROE medio  
✅ Cashflow total  
✅ contador  

Opcional futuro:

- inversión total
- capital propio total
- rentabilidad cartera

---

## Tareas

### 1. Selector favoritos

Crear helper:

getFavoriteCards(cards)

---

### 2. Cálculos

Crear función:

calculatePortfolioStats(favoriteCards)

Devuelve:

{
  count,
  avgROE,
  totalCashflow
}

---

### 3. UI

Bloque superior en vista Favoritos:

- número de propiedades
- ROE medio
- cashflow total

---

## Criterios de aceptación

- Stats cambian al marcar/desmarcar favoritos
- Persisten tras recarga
- Solo consideran tarjetas favoritas
- UX clara en móvil

---

## Nota estratégica

Este es el primer paso hacia:

- cartera real
- visión global del inversor
- futura área de usuario

Convierte la app en herramienta de inversión.
