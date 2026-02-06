/**
 * Utilidades para obtener colores del semáforo según métricas.
 * 
 * Usa la misma lógica del modelo balanceado para colorear valores individuales.
 */

import { VERDICT_CONFIG } from '../config/verdict.config';
import type { EstadoColor } from '../types/analisis';

/**
 * Colores del semáforo para cada estado.
 */
export const SEMAFORO_COLORS = {
  verde: '#4caf50',    // 🟢 Verde
  amarillo: '#ffc107', // 🟡 Amarillo
  rojo: '#f44336',     // 🔴 Rojo
} as const;

/**
 * Obtiene el color del semáforo para una rentabilidad neta.
 * 
 * @param rentabilidadNeta - Rentabilidad neta en porcentaje
 * @returns Color del semáforo
 */
export function getColorRentabilidadNeta(rentabilidadNeta: number): string {
  if (rentabilidadNeta >= VERDICT_CONFIG.verde.rentabilidadNetaMin) {
    return SEMAFORO_COLORS.verde;
  }
  if (rentabilidadNeta >= VERDICT_CONFIG.amarillo.rentabilidadNetaMin) {
    return SEMAFORO_COLORS.amarillo;
  }
  return SEMAFORO_COLORS.rojo;
}

/**
 * Obtiene el color del semáforo para un ROCE final.
 * 
 * @param roceFinal - ROCE final en porcentaje
 * @returns Color del semáforo
 */
export function getColorROCEFinal(roceFinal: number): string {
  if (roceFinal >= VERDICT_CONFIG.verde.roceFinalMin) {
    return SEMAFORO_COLORS.verde;
  }
  if (roceFinal >= VERDICT_CONFIG.amarillo.roceFinalMin) {
    return SEMAFORO_COLORS.amarillo;
  }
  return SEMAFORO_COLORS.rojo;
}

/**
 * Obtiene el color del semáforo para un cashflow final.
 * 
 * @param cashflowFinal - Cashflow final en euros anuales
 * @returns Color del semáforo
 */
export function getColorCashflow(cashflowFinal: number): string {
  if (cashflowFinal >= VERDICT_CONFIG.verde.cashflowFinalMin) {
    return SEMAFORO_COLORS.verde;
  }
  // Para cashflow, solo verde o rojo (no hay amarillo)
  return SEMAFORO_COLORS.rojo;
}
