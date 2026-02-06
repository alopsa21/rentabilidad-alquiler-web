/**
 * Configuración del modelo de veredicto (semáforo).
 * 
 * Este archivo centraliza TODAS las reglas del modelo balanceado.
 * Modifica aquí los umbrales para ajustar el comportamiento del semáforo.
 */

/**
 * Configuración del modelo balanceado de veredicto.
 * 
 * Este modelo equilibra rentabilidad neta, ROCE y cashflow para determinar
 * si una inversión es buena (🟢), justa (🟡) o mala (🔴).
 */
export const VERDICT_CONFIG = {
  /**
   * Umbrales para 🟢 Buena oportunidad
   * 
   * TODAS las condiciones deben cumplirse:
   */
  verde: {
    /** Rentabilidad neta mínima requerida (%) */
    rentabilidadNetaMin: 5,
    
    /** ROCE final mínimo requerido (%) */
    roceFinalMin: 10,
    
    /** Cashflow final mínimo requerido (€) */
    cashflowFinalMin: 0,
  },

  /**
   * Umbrales para 🟡 Oportunidad justa
   * 
   * TODAS las condiciones deben cumplirse:
   */
  amarillo: {
    /** Rentabilidad neta mínima requerida (%) */
    rentabilidadNetaMin: 3,
    
    /** ROCE final mínimo requerido (%) */
    roceFinalMin: 7,
  },

  /**
   * 🟴 Mala oportunidad
   * 
   * Todo lo que no cumpla las condiciones de verde o amarillo.
   * No necesita configuración.
   */
} as const;

/**
 * Títulos y mensajes para cada estado.
 * 
 * Puedes modificar estos textos para cambiar cómo se muestran al usuario.
 */
export const VERDICT_MESSAGES = {
  verde: {
    titulo: 'Buena oportunidad',
    razones: {
      rentabilidadNeta: (valor: number) => `Rentabilidad neta alta (${valor.toFixed(2)}%)`,
      roceFinal: (valor: number) => `ROCE elevado (${valor.toFixed(2)}%)`,
      cashflowPositivo: (valor: number) => `Cashflow positivo (${Math.round(valor)} €/año)`,
    },
  },
  amarillo: {
    titulo: 'Oportunidad justa',
    razones: {
      rentabilidadNeta: (valor: number) => `Rentabilidad neta razonable (${valor.toFixed(2)}%)`,
      roceFinal: (valor: number) => `ROCE aceptable (${valor.toFixed(2)}%)`,
      cashflowPositivo: (valor: number) => `Cashflow positivo (${Math.round(valor)} €/año)`,
      cashflowNegativo: (valor: number) => `Cashflow negativo (${Math.round(valor)} €/año)`,
      margenJusto: () => 'Margen justo',
    },
  },
  rojo: {
    titulo: 'Mala oportunidad',
    razones: {
      rentabilidadNetaBaja: (valor: number) => `Rentabilidad neta baja (${valor.toFixed(2)}%)`,
      roceFinalBajo: (valor: number) => `ROCE bajo (${valor.toFixed(2)}%)`,
      cashflowNegativo: (valor: number) => `Cashflow negativo (${Math.round(valor)} €/año)`,
      rentabilidadInsuficiente: () => 'Rentabilidad insuficiente',
    },
  },
} as const;
