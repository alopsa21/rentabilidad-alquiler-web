# F3b-20 — Footer legal + páginas legales mínimas

## Objetivo

Añadir footer legal básico y páginas obligatorias:

- Aviso legal
- Política de privacidad
- Política de cookies
- Disclaimer financiero
- Contacto

Cumplir mínimos RGPD + proteger producto.

Pensado para MVP (textos simples).

---

## Footer

Mostrar en todas las páginas:

© 2026 Rentabilidad Alquiler

Links:

- Aviso legal
- Privacidad
- Cookies
- Disclaimer
- Contacto

Layout simple:

centrado en móvil  
horizontal en desktop

---

## Páginas a crear

### 1. Aviso legal

Contenido mínimo:

- Nombre del responsable
- Email de contacto
- País
- Tipo de proyecto (herramienta educativa)

---

### 2. Política de privacidad

Indicar:

- No se recogen datos personales
- No hay cuentas
- No se almacenan emails
- Solo localStorage en navegador
- Posibilidad de borrar datos limpiando navegador

---

### 3. Política de cookies

Indicar:

- No cookies de tracking
- Uso de localStorage técnico
- Posible uso futuro de analytics

---

### 4. Disclaimer financiero

Texto base:

"Esta herramienta proporciona estimaciones orientativas y no constituye asesoramiento financiero. Las cifras mostradas pueden no reflejar resultados reales."

---

### 5. Contacto

Mostrar:

contacto@TU_DOMINIO

o simple mailto.

---

## Implementación

- Crear rutas:

/legal/aviso  
/legal/privacidad  
/legal/cookies  
/legal/disclaimer  
/contacto  

- Usar páginas estáticas React.

---

## Alcance MVP

Implementar:

✅ footer visible  
✅ páginas legales accesibles  
✅ textos simples  

No:

- banners cookies complejos
- consentimiento avanzado

---

## Criterios de aceptación

- Footer visible en todas las vistas
- Links funcionan
- Textos claros
- Mobile friendly

---

## Nota estratégica

Esto protege legalmente y da sensación de producto serio.

Obligatorio antes de usuarios reales.
