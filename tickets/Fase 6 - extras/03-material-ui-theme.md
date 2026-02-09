# F3b-21 — Integrar Material UI + Theme base

## Objetivo

Integrar Material UI (MUI) como sistema de diseño principal y aplicar un theme global personalizado para toda la app.

Esto permite:

- coherencia visual inmediata
- acelerar desarrollo
- base profesional desde MVP

---

## Alcance

- instalar MUI
- crear theme.ts
- envolver App con ThemeProvider
- reemplazar componentes básicos por MUI
- aplicar CssBaseline

No incluye rediseño completo de layouts existentes (solo adaptación básica).

---

## Dependencias

Instalar:

```bash
npm install @mui/material @emotion/react @emotion/styled
```

---

## Implementación

### 1. Crear theme

Crear archivo:

src/theme.ts

Usar theme base financiero proporcionado (verde inversión + semáforo):

- palette primary / success / warning / error
- borderRadius global
- tipografía Inter
- overrides para Button, Card, TextField

---

### 2. Envolver aplicación

En main.tsx / index.tsx:

```tsx
<ThemeProvider theme={theme}>
  <CssBaseline />
  <App />
</ThemeProvider>
```

---

### 3. Tipografía

Añadir Inter en index.html:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
```

---

### 4. Sustituir componentes básicos

Reemplazar:

- button → MUI Button
- input → TextField
- card → Card
- typography → Typography

Mantener lógica existente.

---

## Alcance MVP

Implementar:

✅ theme global activo  
✅ botones usan color primary  
✅ cards usan estilo MUI  
✅ inputs con TextField  
✅ CssBaseline aplicado  

No:

- rediseño completo
- animaciones

---

## Criterios de aceptación

- Toda la app usa el theme
- No quedan botones HTML puros
- Cards tienen bordes suaves
- Inputs coherentes
- Funciona en móvil

---

## Nota estratégica

Esto convierte el proyecto en producto visual real.

Base para futuras mejoras UX.
