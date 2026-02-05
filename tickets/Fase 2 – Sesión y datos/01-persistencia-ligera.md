# F3b-07 — Persistencia ligera (localStorage)

## Objetivo

Permitir que las búsquedas del usuario persistan entre recargas del navegador sin crear cuentas ni backend.

La persistencia será exclusivamente en frontend usando `localStorage`.

Esto permite:

- cerrar pestaña y volver
- conservar tarjetas
- mantener ajustes manuales

Sin login.
Sin base de datos.
Sin servidor.

---

## Alcance MVP

Persistir:

- lista de tarjetas
- originalInput por tarjeta
- currentInput por tarjeta
- motorOutput
- timestamp

No persistir:

- estado UI temporal
- loading flags
- errores

---

## Modelo almacenado

Guardar bajo una única key:

```
rentabilidad-alquiler:cards
```

Ejemplo:

```ts
{
  version: 1,
  cards: [
    {
      id,
      originalInput,
      currentInput,
      motorOutput,
      createdAt
    }
  ]
}
```

---

## Comportamiento

### Al añadir tarjeta

- push al state
- sincronizar localStorage

---

### Al editar tarjeta

- actualizar currentInput
- recalcular motor
- sincronizar localStorage

---

### Al revertir

- restaurar originalInput
- recalcular
- sincronizar

---

### Al cargar la app

- leer localStorage
- hidratar state inicial
- renderizar tarjetas

---

## Tareas

### 1. Storage helper

Crear util:

- loadCards()
- saveCards(cards)

Centralizar aquí toda la lógica localStorage.

---

### 2. Hidratación inicial

En App root:

- cargar cards al montar
- setState inicial

---

### 3. Sincronización automática

Usar `useEffect`:

- observar cambios en cards
- guardar automáticamente

---

### 4. Botón limpiar todo (opcional MVP)

Pequeño botón:

[ Limpiar búsquedas ]

Borra:

- state
- localStorage

---

## Criterios de aceptación

- Al refrescar la página, las tarjetas siguen ahí
- Ajustes manuales se conservan
- Revert funciona tras recarga
- Limpiar elimina todo

---

## Nota estratégica

Esta persistencia:

- simula cuentas de usuario
- permite uso real
- prepara el camino a backend más adelante

Sin añadir complejidad ahora.
