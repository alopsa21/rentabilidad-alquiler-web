# 🚦 Configuración del Modelo de Veredicto

Este documento explica cómo modificar el modelo de veredicto (semáforo 🟢🟡🔴).

---

## 📍 Ubicación de la Configuración

**TODO se configura en un solo archivo:**

```
src/config/verdict.config.ts
```

---

## 🎛️ Configuración Actual (Modelo Balanceado)

### 🟢 Umbrales para Buena Oportunidad

```typescript
verde: {
  rentabilidadNetaMin: 5,    // Rentabilidad neta mínima (%)
  roceFinalMin: 10,          // ROCE final mínimo (%)
  cashflowFinalMin: 0,       // Cashflow mínimo (€)
}
```

**Todas las condiciones deben cumplirse** para que sea 🟢 verde.

---

### 🟡 Umbrales para Oportunidad Justa

```typescript
amarillo: {
  rentabilidadNetaMin: 3,    // Rentabilidad neta mínima (%)
  roceFinalMin: 7,           // ROCE final mínimo (%)
}
```

**Todas las condiciones deben cumplirse** para que sea 🟡 amarillo.

---

### 🔴 Mala Oportunidad

Todo lo que no cumpla las condiciones de verde o amarillo.

---

## ✏️ Cómo Modificar los Umbrales

### Ejemplo 1: Hacer el modelo más estricto

Si quieres que sea más difícil conseguir 🟢 verde:

```typescript
verde: {
  rentabilidadNetaMin: 7,    // Antes: 5, ahora: 7
  roceFinalMin: 12,          // Antes: 10, ahora: 12
  cashflowFinalMin: 100,     // Antes: 0, ahora: mínimo 100€/año
}
```

**Resultado:** Menos inversiones serán verdes, solo las muy buenas.

---

### Ejemplo 2: Hacer el modelo más permisivo

Si quieres que sea más fácil conseguir 🟢 verde:

```typescript
verde: {
  rentabilidadNetaMin: 4,    // Antes: 5, ahora: 4
  roceFinalMin: 8,           // Antes: 10, ahora: 8
  cashflowFinalMin: 0,       // Sin cambios
}
```

**Resultado:** Más inversiones serán verdes.

---

### Ejemplo 3: Ajustar solo el amarillo

Si quieres cambiar qué se considera "oportunidad justa":

```typescript
amarillo: {
  rentabilidadNetaMin: 2,    // Antes: 3, ahora: 2
  roceFinalMin: 5,           // Antes: 7, ahora: 5
}
```

**Resultado:** Más inversiones pasarán de rojo a amarillo.

---

## 📝 Modificar Mensajes

Los mensajes que ve el usuario están en `VERDICT_MESSAGES`:

```typescript
VERDICT_MESSAGES = {
  verde: {
    titulo: 'Buena oportunidad',
    razones: {
      rentabilidadNeta: (valor) => `Rentabilidad neta alta (${valor}%)`,
      // ...
    },
  },
  // ...
}
```

Puedes cambiar los textos para personalizar cómo se muestran las razones.

---

## 🔄 Aplicar Cambios

1. **Edita** `src/config/verdict.config.ts`
2. **Modifica** los umbrales que quieras
3. **Guarda** el archivo
4. **Reinicia** el servidor de desarrollo (`npm run dev`)
5. **Prueba** con una nueva tarjeta

Los cambios son inmediatos.

---

## 📊 Ejemplos de Configuraciones

### Configuración Conservadora (más estricta)

```typescript
verde: {
  rentabilidadNetaMin: 6,
  roceFinalMin: 12,
  cashflowFinalMin: 200,
}

amarillo: {
  rentabilidadNetaMin: 4,
  roceFinalMin: 9,
}
```

**Uso:** Para inversores muy conservadores que solo quieren oportunidades excelentes.

---

### Configuración Permisiva (más flexible)

```typescript
verde: {
  rentabilidadNetaMin: 4,
  roceFinalMin: 8,
  cashflowFinalMin: 0,
}

amarillo: {
  rentabilidadNetaMin: 2,
  roceFinalMin: 5,
}
```

**Uso:** Para mercados con menos oportunidades o inversores más arriesgados.

---

### Configuración Actual (Balanceada) ⭐

```typescript
verde: {
  rentabilidadNetaMin: 5,
  roceFinalMin: 10,
  cashflowFinalMin: 0,
}

amarillo: {
  rentabilidadNetaMin: 3,
  roceFinalMin: 7,
}
```

**Uso:** Equilibrio entre conservador y permisivo. Recomendado para la mayoría.

---

## 🧪 Probar Cambios

Después de modificar los umbrales:

1. Crea una nueva tarjeta con valores conocidos
2. Verifica que el veredicto coincide con tus expectativas
3. Ajusta los umbrales si es necesario

**Ejemplo de prueba:**

- Precio: 150,000€
- Alquiler: 800€/mes
- Resultado esperado: ~4.5% rentabilidad neta, ~9% ROCE

Con configuración actual: 🟡 Amarillo
Con `verde.rentabilidadNetaMin: 4`: 🟢 Verde

---

## ⚠️ Notas Importantes

1. **Los valores son porcentajes** (5 = 5%, no 0.05)
2. **Cashflow es en euros anuales** (0 = sin pérdidas)
3. **Todas las condiciones deben cumplirse** para cada estado
4. **El orden importa:** Se evalúa verde primero, luego amarillo, luego rojo

---

## 📚 Referencia Rápida

| Métrica | Qué es | Unidad |
|---------|--------|--------|
| `rentabilidadNeta` | Rentabilidad después de gastos | % |
| `roceFinal` | Rentabilidad del capital propio | % |
| `cashflowFinal` | Dinero disponible al año | €/año |

---

## ✅ Checklist para Modificar

- [ ] Abrir `src/config/verdict.config.ts`
- [ ] Decidir qué umbral cambiar
- [ ] Modificar el valor
- [ ] Guardar el archivo
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Probar con una tarjeta nueva
- [ ] Verificar que el veredicto es correcto

---

## 💡 Tips

- **Empieza con cambios pequeños** (ej: 5% → 5.5%)
- **Prueba con varias tarjetas** antes de decidir
- **Documenta tus cambios** si los compartes con otros
- **Considera el mercado:** En mercados difíciles, baja los umbrales
