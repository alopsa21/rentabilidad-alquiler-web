# F3b-22 — Microcopy UX (textos pequeños que hacen grande el producto)

## Objetivo

Añadir microcopy (textos cortos contextuales) para mejorar:

- comprensión del producto
- confianza del usuario
- sensación de app profesional

Sin añadir pantallas nuevas.

---

## Alcance

Aplicar microcopy en:

- input principal
- botón analizar
- estados de carga
- semáforo
- métricas
- edición manual
- portfolio
- notas
- estados vacíos

---

## Textos propuestos

### Input principal

Placeholder:

"Pega aquí el enlace del piso (Idealista, etc.)"

Texto debajo:

"Analizamos el piso en segundos. Sin registros."

---

### Botón analizar

Normal:

"Analizar piso"

Durante loading:

"Analizando anuncio…"

---

### Estados de carga

Paso 1:

"Buscando precio y zona…"

Paso 2:

"Calculando rentabilidad…"

---

### Semáforo

Verde:

"Gana dinero cada mes"

Amarillo:

"Rentabilidad justa"

Rojo:

"Pierde dinero mensualmente"

---

### Métricas (tooltip)

Rentabilidad neta:

"Beneficio anual tras gastos dividido entre el coste total."

ROCE:

"Beneficio anual dividido entre tu capital aportado."

---

### Edición manual

Texto pequeño:

"Puedes ajustar estos valores para simular escenarios."

---

### Portfolio

Encabezado:

"Estas son tus mejores oportunidades guardadas."

---

### Notas

Placeholder:

"Apunta aquí tus impresiones, visitas, llamadas…"

---

### Estado vacío (sin tarjetas)

"Aún no has analizado ningún piso."

---

## Implementación

- usar Typography MUI
- textos en componentes existentes
- tooltips con MUI Tooltip
- evitar modales

---

## Alcance MVP

Implementar:

✅ textos base  
✅ tooltips métricas  
✅ loading messages  
✅ empty state  

No:

- i18n
- personalización de textos

---

## Criterios de aceptación

- El usuario entiende qué hacer sin explicación externa
- Los estados no están vacíos
- Métricas tienen ayuda contextual
- Funciona en móvil

---

## Nota estratégica

Microcopy convierte una herramienta técnica en producto usable.

Es UX invisible, pero crítico.
