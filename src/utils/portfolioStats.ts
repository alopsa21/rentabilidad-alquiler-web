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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calcula el score global del portfolio (0–100) a partir de favoritas.
 * Fórmula: 0.35 * ROE_score + 0.35 * Cashflow_score + 0.3 * verdes_score
 */
export function calculatePortfolioScore(
  favoriteCards: AnalisisCard[],
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>
): number {
  if (favoriteCards.length === 0) return 0;

  const stats = calculatePortfolioStats(favoriteCards, resultadosPorTarjeta);

  const avgROE = stats.avgROE ?? 0;
  const ROE_score = clamp(avgROE * 5, 0, 100);

  const totalCashflow = stats.totalCashflow;
  const Cashflow_score =
    totalCashflow <= 0 ? 0 : clamp(totalCashflow / 50, 0, 100);

  const verdesCount = favoriteCards.filter((c) => c.estado === 'verde').length;
  const verdes_score = (verdesCount / favoriteCards.length) * 100;

  const score =
    0.35 * ROE_score + 0.35 * Cashflow_score + 0.3 * verdes_score;
  return Math.round(clamp(score, 0, 100));
}

/** Color del score: verde ≥ 70, amarillo 40–69, rojo < 40 */
export function getScoreColor(score: number): 'verde' | 'amarillo' | 'rojo' {
  if (score >= 70) return 'verde';
  if (score >= 40) return 'amarillo';
  return 'rojo';
}
