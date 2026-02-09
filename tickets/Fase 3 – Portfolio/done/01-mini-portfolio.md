# F3b-14 — Mini Portfolio (Favoritos)

## Objetivo

Permitir al usuario marcar tarjetas como favoritas y construir un mini portfolio local.

Esto permite:

- guardar oportunidades interesantes
- separar exploración vs candidatos reales
- simular cartera personal

Todo en frontend.
Persistido con localStorage.
Sin cuentas.

---

## UX

En cada tarjeta:

⭐ icono (toggle)

Estados:

- vacío = no favorito
- lleno = favorito

Además:

Filtro o pestaña:

[ Todas ]   [ Favoritos ]

---

## Comportamiento

- Pulsar ⭐ marca / desmarca tarjeta
- Las tarjetas favoritas:

  - permanecen aunque el usuario limpie búsquedas (opcional MVP)
  - se muestran en vista "Favoritos"

---

## Modelo

Extender modelo de tarjeta:

```
{
  id
  originalInput
  currentInput
  motorOutput
  isFavorite: boolean
  createdAt
}
```

Persistir junto al resto del estado.

---

## Persistencia

Usar la misma key:

rentabilidad-alquiler:cards

El campo `isFavorite` debe sobrevivir recargas.

---

## Alcance MVP

Implementar:

✅ marcar favorito  
✅ filtrar favoritos  
✅ persistir estado  

Opcional futuro:

- estadísticas del portfolio
- suma de cashflows
- ROE medio

---

## Tareas

### 1. Toggle favorito

- añadir botón ⭐ a tarjeta
- actualizar isFavorite

---

### 2. Filtro

- botón o tabs:
  - Todas
  - Favoritos

Filtrar por isFavorite === true

---

### 3. Persistencia

- incluir isFavorite en localStorage
- hidratar correctamente al cargar

---

## Criterios de aceptación

- Marcar favorito persiste tras recarga
- Vista Favoritos solo muestra marcados
- Limpiar búsquedas no borra favoritos (si MVP lo incluye)
- UX clara en móvil

---

## Nota estratégica

Esto introduce mentalidad de cartera.

Primer paso hacia:

- portfolio real
- cuentas de usuario
- histórico de inversiones.
