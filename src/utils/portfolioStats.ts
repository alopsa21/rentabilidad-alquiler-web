/**
 * Utilidades para métricas agregadas del mini portfolio (tarjetas favoritas).
 */

import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

export interface PortfolioStats {
  count: number;
  avgROE: number | null;
  totalCashflow: number;
}

/**
 * Devuelve solo las tarjetas marcadas como favoritas.
 */
export function getFavoriteCards(cards: AnalisisCard[]): AnalisisCard[] {
  return cards.filter((c) => c.isFavorite);
}

/**
 * Normaliza ROCE/ROE que puede venir en decimal (0.094) o en porcentaje (9.4).
 */
function normalizeROE(raw: number): number {
  if (Number.isNaN(raw)) return 0;
  return raw > -1 && raw < 1 ? raw * 100 : raw;
}

/**
 * Calcula estadísticas del portfolio sobre las tarjetas favoritas.
 * Solo incluye tarjetas que tengan resultado en resultadosPorTarjeta.
 */
export function calculatePortfolioStats(
  favoriteCards: AnalisisCard[],
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>
): PortfolioStats {
  const count = favoriteCards.length;
  if (count === 0) {
    return { count: 0, avgROE: null, totalCashflow: 0 };
  }

  let sumROE = 0;
  let totalCashflow = 0;
  let roeCount = 0;

  for (const card of favoriteCards) {
    const resultado = resultadosPorTarjeta[card.id];
    if (!resultado) continue;

    const cf = Number(resultado.cashflowFinal);
    if (!Number.isNaN(cf)) totalCashflow += cf;

    const roceRaw = Number(resultado.roceFinal);
    if (!Number.isNaN(roceRaw)) {
      sumROE += normalizeROE(roceRaw);
      roeCount += 1;
    }
  }

  const avgROE = roeCount > 0 ? sumROE / roeCount : null;
  return { count, avgROE, totalCashflow };
}
