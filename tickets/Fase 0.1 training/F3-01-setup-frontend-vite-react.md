# Ticket F3-01 — Setup Frontend (Vite + React + TypeScript)

## Objetivo

Inicializar el proyecto frontend usando **Vite + React + TypeScript** y dejar
la aplicación arrancando con hot reload.

Este ticket solo prepara el entorno de frontend, sin integrar aún la API.

---

## Alcance

Este ticket debe incluir:

- Creación del proyecto con Vite (template react-ts)
- Instalación de dependencias
- Arranque del servidor de desarrollo
- Verificación de hot reload

---

## Fuera de alcance

❌ Llamadas a la API  
❌ Formularios de negocio  
❌ Lógica de rentabilidad  
❌ Diseño UI final  

---

## Stack fijado

- Vite
- React
- TypeScript

---

## Estructura esperada

```
rentabilidad-alquiler-web/
├── src/
│   ├── main.tsx
│   └── App.tsx
├── index.html
├── package.json
└── tsconfig.json
```

---

## Pasos sugeridos

Desde el directorio donde tengas tus repos:

```bash
npm create vite@latest rentabilidad-alquiler-web -- --template react-ts
cd rentabilidad-alquiler-web
npm install
npm run dev
```

Abrir en navegador:

```
http://localhost:5173
```

---

## Criterios de aceptación

- El proyecto arranca con `npm run dev`
- Se ve la página por defecto de Vite + React
- Cambios en `App.tsx` se reflejan con hot reload

---

## Prompt para Cursor / Antigravity (copiar y pegar)

Configura el frontend del proyecto:

- Crear proyecto con Vite usando template `react-ts`
- Verificar que `npm run dev` arranca correctamente
- No integrar aún ninguna llamada a la API
- Mantener el proyecto lo más limpio posible

Objetivo: tener el entorno frontend listo para empezar a construir la UI.
