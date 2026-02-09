# F3b-19 — Notas por anuncio (apuntes del usuario)

## Objetivo

Permitir que el usuario añada notas libres a cada tarjeta/anuncio.

Esto sirve para:

- apuntar ideas
- guardar impresiones tras visitas
- comparar sensaciones
- preparar decisiones

Todo local.
Persistido en localStorage.
Sin cuentas.

---

## UX

En cada tarjeta:

Icono:

📝

Al pulsar:

- se abre pequeño panel o modal:

"Notas sobre este piso"

Textarea:

[ Escribe aquí tus apuntes... ]

Botones:

[ Guardar ]

El icono 📝 cambia de estado si existen notas.

---

## Modelo

Extender tarjeta:

```
notes?: string
```

---

## Persistencia

Las notas deben:

- guardarse junto al resto de la tarjeta
- sobrevivir recargas
- exportarse en CSV (opcional futuro)

Key:

rentabilidad-alquiler:cards

---

## Comportamiento

- Guardar reemplaza contenido previo
- Cerrar sin guardar mantiene valor anterior
- Puede dejarse vacío

---

## Alcance MVP

Implementar:

✅ añadir nota  
✅ editar nota  
✅ persistir  
✅ indicador visual si hay notas  

No:

- rich text
- historial de cambios

---

## Tareas

### 1. Icono notas

- añadir botón 📝 en tarjeta
- estado activo si notes.length > 0

---

### 2. Modal / panel

- textarea simple
- botón guardar

---

### 3. Modelo

- añadir campo notes
- incluir en persistencia

---

## Criterios de aceptación

- El usuario puede guardar texto por tarjeta
- Persiste tras recarga
- Cada tarjeta mantiene sus propias notas
- UX usable en móvil

---

## Nota estratégica

Esto transforma tarjetas en mini expedientes.

Muy útil para visitas físicas y seguimiento real.
