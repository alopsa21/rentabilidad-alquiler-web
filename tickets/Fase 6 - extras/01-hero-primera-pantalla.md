# F3b-18 — Primera pantalla (Hero inicial + búsqueda centrada)

## Objetivo

Mejorar la primera impresión del producto:

- centrar visualmente el input de búsqueda
- añadir contexto con texto claro
- crear sensación de producto cuidado
- tras la primera búsqueda, compactar el layout y mover el input arriba

Esto convierte la app de "formulario" → "experiencia".

---

## Estado actual

Actualmente:

- título arriba
- input debajo
- botón simple

Problemas:

- parece formulario técnico
- no hay explicación
- mucho espacio vacío
- poca intención de producto

---

## UX propuesta

### Primera carga (sin tarjetas)

Pantalla tipo "hero":

Centrado vertical:

---

### Título principal

Invertir en alquiler, sin hojas de Excel

Tipografía grande.

---

### Subtítulo

Pega el enlace de un piso y te decimos en segundos si merece la pena.

Texto pequeño, gris.

---

### Input

Caja grande centrada:

[ Pega aquí el enlace del anuncio ]

Botón:

[ Analizar piso ]

---

### Texto secundario (opcional)

Debajo:

- Sin registros
- Sin spam
- Análisis instantáneo

---

## Comportamiento tras primera búsqueda

Cuando aparece la primera tarjeta:

- el bloque hero desaparece
- el input se mueve arriba (modo compacto)
- layout pasa a:

Input fijo arriba  
Tarjetas debajo  

Sin recargar página.

---

## Alcance MVP

Implementar:

✅ hero centrado  
✅ texto introductorio  
✅ transición a layout compacto  
✅ input persistente arriba  

No:

- animaciones complejas
- fondos avanzados

---

## Tareas

### 1. Estado UI

Crear flag:

hasCards

---

### 2. Layout condicional

if !hasCards:

mostrar Hero

else:

mostrar Header compacto

---

### 3. Componentes

Crear:

- HeroSearch.tsx
- CompactSearchHeader.tsx

Ambos reutilizan mismo input.

---

## Criterios de aceptación

- Primera pantalla centrada y clara
- Tras analizar piso, input pasa arriba
- No se pierde valor del input
- UX correcta en móvil

---

## Nota estratégica

Esta pantalla decide si el usuario se queda.

Es tu landing interna.

Tiene más impacto que muchas features.
