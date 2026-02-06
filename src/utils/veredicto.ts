/**
 * Sistema de veredicto (semáforo) para evaluar oportunidades de inversión.
 * 
 * Usa el modelo balanceado configurado en verdict.config.ts.
 * Convierte métricas numéricas en decisiones claras: 🟢🟡🔴
 */

import type { RentabilidadApiResponse } from '../types/api';
import type { EstadoColor } from '../types/analisis';
import { VERDICT_CONFIG, VERDICT_MESSAGES } from '../config/verdict.config';

export interface VeredictoHumano {
  estado: EstadoColor;
  titulo: string;
  razones: string[];
}

/**
 * Extrae y normaliza las métricas del resultado de la API.
 */
function extraerMetricas(resultado: RentabilidadApiResponse) {
  const rentNetaRaw = Number(resultado.rentabilidadNeta);
  const roceFinalRaw = Number(resultado.roceFinal);
  const cashflowFinal = Number(resultado.cashflowFinal);

  // Normalizar rentabilidad neta (puede venir como decimal 0.05 o porcentaje 5)
  const rentabilidadNeta =
    !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
      ? rentNetaRaw * 100
      : rentNetaRaw;

  // Normalizar ROCE final (puede venir como decimal 0.10 o porcentaje 10)
  const roceFinal =
    !Number.isNaN(roceFinalRaw) && roceFinalRaw > -1 && roceFinalRaw < 1
      ? roceFinalRaw * 100
      : roceFinalRaw;

  return {
    rentabilidadNeta: Number.isNaN(rentabilidadNeta) ? 0 : rentabilidadNeta,
    roceFinal: Number.isNaN(roceFinal) ? 0 : roceFinal,
    cashflowFinal: Number.isNaN(cashflowFinal) ? 0 : cashflowFinal,
  };
}

/**
 * Calcula el veredicto usando el modelo balanceado.
 * 
 * Reglas del modelo balanceado:
 * 
 * 🟢 Buena oportunidad:
 *   - rentabilidadNeta >= 5%
 *   - ROCE_final >= 10%
 *   - cashflowFinal >= 0
 * 
 * 🟡 Oportunidad justa:
 *   - rentabilidadNeta >= 3%
 *   - ROCE_final >= 7%
 * 
 * 🔴 Mala oportunidad:
 *   - Todo lo demás
 * 
 * @param resultado - Resultado del cálculo de rentabilidad
 * @returns Veredicto con estado, título y razones (máx 3)
 */
export function mapResultadosToVerdict(resultado: RentabilidadApiResponse): VeredictoHumano {
  const { rentabilidadNeta, roceFinal, cashflowFinal } = extraerMetricas(resultado);

  const razones: string[] = [];
  let estado: EstadoColor = 'rojo';
  let titulo = VERDICT_MESSAGES.rojo.titulo;

  // 🟢 Verificar si es buena oportunidad
  const esVerde =
    rentabilidadNeta >= VERDICT_CONFIG.verde.rentabilidadNetaMin &&
    roceFinal >= VERDICT_CONFIG.verde.roceFinalMin &&
    cashflowFinal >= VERDICT_CONFIG.verde.cashflowFinalMin;

  if (esVerde) {
    estado = 'verde';
    titulo = VERDICT_MESSAGES.verde.titulo;

    // Añadir razones para verde
    razones.push(VERDICT_MESSAGES.verde.razones.rentabilidadNeta(rentabilidadNeta));
    razones.push(VERDICT_MESSAGES.verde.razones.roceFinal(roceFinal));
    if (cashflowFinal > 0) {
      razones.push(VERDICT_MESSAGES.verde.razones.cashflowPositivo(cashflowFinal));
    }
  } else {
    // 🟡 Verificar si es oportunidad justa
    const esAmarillo =
      rentabilidadNeta >= VERDICT_CONFIG.amarillo.rentabilidadNetaMin &&
      roceFinal >= VERDICT_CONFIG.amarillo.roceFinalMin;

    if (esAmarillo) {
      estado = 'amarillo';
      titulo = VERDICT_MESSAGES.amarillo.titulo;

      // Añadir razones para amarillo
      razones.push(VERDICT_MESSAGES.amarillo.razones.rentabilidadNeta(rentabilidadNeta));
      razones.push(VERDICT_MESSAGES.amarillo.razones.roceFinal(roceFinal));

      if (cashflowFinal >= 0) {
        razones.push(VERDICT_MESSAGES.amarillo.razones.cashflowPositivo(cashflowFinal));
      } else {
        razones.push(VERDICT_MESSAGES.amarillo.razones.cashflowNegativo(cashflowFinal));
      }
    } else {
      // 🔴 Mala oportunidad
      estado = 'rojo';
      titulo = VERDICT_MESSAGES.rojo.titulo;

      // Añadir razones para rojo
      if (rentabilidadNeta < VERDICT_CONFIG.amarillo.rentabilidadNetaMin) {
        razones.push(VERDICT_MESSAGES.rojo.razones.rentabilidadNetaBaja(rentabilidadNeta));
      }
      if (roceFinal < VERDICT_CONFIG.amarillo.roceFinalMin) {
        razones.push(VERDICT_MESSAGES.rojo.razones.roceFinalBajo(roceFinal));
      }
      if (cashflowFinal < 0) {
        razones.push(VERDICT_MESSAGES.rojo.razones.cashflowNegativo(cashflowFinal));
      }
      if (razones.length === 0) {
        razones.push(VERDICT_MESSAGES.rojo.razones.rentabilidadInsuficiente());
      }
    }
  }

  return {
    estado,
    titulo,
    razones: razones.slice(0, 3), // Máximo 3 razones
  };
}
