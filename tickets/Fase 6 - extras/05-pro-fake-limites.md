# F4-01 — Límites gratis + Pro fake (sin usuarios)

## Objetivo

Implementar sistema Freemium inicial sin cuentas:

- límites para usuarios gratis
- desbloqueo Pro mediante flag local
- permitir desarrollo completo de UX Pro sin backend

Todo usando localStorage.

---

## Concepto

El usuario comienza en plan Gratis.

Existe flag local:

```
isPro = true | false
```

Guardado en localStorage.

---

## Gratis (por defecto)

Límites:

- 3 análisis por día
- máximo 3 tarjetas guardadas
- 1 favorito

Todo persistido en navegador.

Mostrar arriba:

"Plan gratuito — X análisis restantes hoy"

---

## Pro fake

Al activar Pro:

- análisis ilimitados
- tarjetas ilimitadas
- favoritos ilimitados
- portfolio stats
- score global
- export CSV

Sin login.
Sin backend.

---

## Activación Pro (dev)

Botón temporal:

"Activar Pro (dev)"

Acción:

```ts
localStorage.setItem("isPro", "true")
```

También permitir:

```
?pro=true
```

---

## Contadores

Guardar en localStorage:

- dailyAnalysisCount
- cardsCount
- favoriteCount
- lastResetDate

Reset automático al cambiar de día.

---

## UI

Si usuario intenta acción bloqueada:

Mostrar modal:

"Has alcanzado el límite gratuito. Pasa a Pro para continuar."

Botón:

[ Activar Pro ]

---

## Implementación

Crear helper:

usePlan()

Retorna:

- isPro
- remainingAnalysis
- canAddCard
- canFavorite

---

## Alcance MVP

Implementar:

✅ límites diarios  
✅ flag Pro  
✅ banner estado plan  
✅ bloqueo features  
✅ botón activar Pro dev  

No:

- Stripe
- login
- backend

---

## Criterios de aceptación

- Usuario gratis tiene límites
- Pro desbloquea todo
- Persistencia tras recarga
- UX clara

---

## Nota estratégica

Esto permite validar producto y UX antes de invertir en pagos o usuarios.

Fundamental para MVP real.
