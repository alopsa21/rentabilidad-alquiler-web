# F3b-08 — Definición del semáforo (Modelo Balanceado)

## Objetivo

Implementar el sistema de veredicto 🟢🟡🔴 usando métricas ya calculadas por el motor.

Se implementa **únicamente el modelo Balanceado**, con configuración centralizada para facilitar la modificación de reglas.

No exponer fórmulas al usuario.

---

## Métricas disponibles

Ya calculadas por el engine:

- rentabilidadBruta
- rentabilidadNeta
- cashflowFinal
- ROCE_inicial
- ROCE_final

El veredicto debe derivarse exclusivamente de estas.

---

## Modelo Balanceado (implementado)

### Reglas

🟢

rentabilidadNeta >= 5%  
AND ROCE_final >= 10%  
AND cashflowFinal >= 0

---

🟡

rentabilidadNeta >= 3%  
AND ROCE_final >= 7%

---

🔴

Todo lo demás.

---

## Implementación

### Función principal

`mapResultadosToVerdict(resultado: RentabilidadApiResponse): VeredictoHumano`

Retorna:
```typescript
{
  estado: "verde" | "amarillo" | "rojo",
  titulo: string,
  razones: string[] // Máximo 3
}
```

### Configuración centralizada

Todas las reglas están en `src/config/verdict.config.ts`:

- `VERDICT_CONFIG`: Umbrales numéricos para cada estado
- `VERDICT_MESSAGES`: Títulos y plantillas de razones

Esto permite modificar las reglas sin tocar la lógica de cálculo.

---

## Reasons (máx 3)

Ejemplos:

- Cashflow positivo
- Buena rentabilidad neta
- ROCE elevado
- Margen justo
- Rentabilidad baja

Generar reasons coherentes con el modelo aplicado.

---

## Tareas completadas

### 1. ✅ Módulo de veredicto

- Implementado `src/utils/veredicto.ts` con modelo balanceado
- Configuración centralizada en `src/config/verdict.config.ts`
- Función `mapResultadosToVerdict()` que convierte métricas en veredicto

---

### 2. ✅ Integración frontend

- Veredicto calculado automáticamente al crear tarjetas
- Colores del semáforo aplicados a:
  - **Rentabilidad neta** (en tarjetas y detalle)
  - **Cashflow** (en tarjetas y detalle)
  - **ROCE** (en tarjetas y detalle)
- Todos los colores reflejan el **veredicto general de la tarjeta** (no métricas individuales)
- Columna ROCE añadida a las tarjetas con ordenamiento
- Razones mostradas en el panel de detalle

---

### 3. ✅ Documentación

- `docs/CONFIGURACION_VEREDICTO.md`: Guía completa para modificar reglas y mensajes

---

## Criterios de aceptación ✅

- ✅ Cambiar métricas cambia el semáforo
- ✅ Modelo balanceado activo por defecto
- ✅ Usuario solo ve veredicto + razones (sin fórmulas)
- ✅ Colores del semáforo aplicados consistentemente a rentabilidad neta, cashflow y ROCE
- ✅ Configuración centralizada permite modificar reglas fácilmente
- ✅ Columna ROCE visible y ordenable en las tarjetas

## Archivos implementados

- `src/utils/veredicto.ts`: Lógica de cálculo del veredicto
- `src/config/verdict.config.ts`: Configuración de reglas y mensajes
- `src/components/CardAnalisis.tsx`: Aplicación de colores del semáforo
- `src/components/DetalleAnalisis.tsx`: Visualización de veredicto y razones
- `src/App.tsx`: Integración del veredicto en el flujo principal
- `docs/CONFIGURACION_VEREDICTO.md`: Documentación de configuración

---

## Nota estratégica

Esto convierte números en decisiones.

El usuario no debe ver fórmulas.
Solo conclusiones.

## Decisiones de diseño

- **Un solo modelo**: Se simplificó a solo el modelo balanceado para reducir complejidad y facilitar mantenimiento
- **Colores consistentes**: Todas las métricas relevantes (rentabilidad neta, cashflow, ROCE) usan el mismo color según el veredicto general de la tarjeta
- **Configuración centralizada**: Todas las reglas en un solo archivo (`verdict.config.ts`) para facilitar ajustes futuros
