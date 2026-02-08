# F3b-12 — Exportar resultados a CSV

## Objetivo

Permitir al usuario exportar las tarjetas actuales a un archivo CSV descargable.

Esto facilita:

- análisis posterior en Excel / Sheets
- compartir con socios
- archivo personal

Todo client-side.
Sin backend.
Sin cuentas.

---

## Alcance MVP

Exportar por fila:

- id
- precioCompra
- alquilerMensual
- comunidadAutonoma
- rentabilidadBruta
- rentabilidadNeta
- cashflowFinal
- ROE_inicial
- ROE_final
- veredicto
- confidenceScore

Una fila por tarjeta.

---

## UX

Botón global:

[ Exportar CSV ]

Ubicado:

- arriba del panel
o
- menú overflow

Al pulsar:

- se descarga `rentabilidad-alquiler.csv`

---

## Formato CSV

Separador:

;
(o , según locale)

Header ejemplo:

id;precioCompra;alquilerMensual;comunidad;rentabilidadBruta;rentabilidadNeta;cashflowFinal;ROE_inicial;ROE_final;veredicto;confidence

Valores numéricos sin símbolo (€ o %).

---

## Tareas

### 1. Mapper CSV

Crear helper:

cardsToCSV(cards) → string

- recorrer tarjetas
- extraer currentInput + motorOutput + verdict + confidence
- construir string CSV

---

### 2. Descarga

Crear función:

downloadCSV(csvString)

- crear Blob
- URL.createObjectURL
- trigger anchor click

---

### 3. Botón UI

- botón visible si hay al menos 1 tarjeta
- disabled si lista vacía

---

## Criterios de aceptación

- Se descarga CSV válido
- Se abre correctamente en Excel / Sheets
- Cada tarjeta corresponde a una fila
- No requiere login

---

## Nota estratégica

Esto permite a usuarios avanzados:

- seguir trabajando fuera
- validar números
- crear portfolio manual

Feature pequeña, valor alto.
