import type { RentabilidadApiResponse } from '../types/api';
import type { EstadoColor } from '../types/analisis';

export interface VeredictoHumano {
  estado: EstadoColor;
  titulo: string;
  razones: string[];
}

/**
 * Convierte los resultados numéricos del motor en un veredicto humano.
 * Max 3 razones sencillas.
 */
export function mapResultadosToVerdict(resultado: RentabilidadApiResponse): VeredictoHumano {
  const ingresos = Number(resultado.ingresosAnuales);
  const gastos = Number(resultado.gastosAnuales);
  const cashflow = Number(resultado.cashflowFinal);
  const rentNetaRaw = Number(resultado.rentabilidadNeta);

  const rentNetaPct =
    !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
      ? rentNetaRaw * 100
      : rentNetaRaw;

  let estado: EstadoColor = 'rojo';
  let titulo = 'Mala oportunidad';
  const razones: string[] = [];

  // Clasificación básica por rentabilidad neta
  if (rentNetaPct >= 6) {
    estado = 'verde';
    titulo = 'Buena oportunidad';
    razones.push(`Rentabilidad neta alta (~${rentNetaPct.toFixed(2)} %)`);
  } else if (rentNetaPct >= 3) {
    estado = 'amarillo';
    titulo = 'Oportunidad justa';
    razones.push(`Rentabilidad neta razonable (~${rentNetaPct.toFixed(2)} %)`);
  } else {
    estado = 'rojo';
    titulo = 'Mala oportunidad';
    razones.push(`Rentabilidad neta baja (~${rentNetaPct.toFixed(2)} %)`);
  }

  // Cashflow
  if (!Number.isNaN(cashflow)) {
    if (cashflow > 0) {
      razones.push(`Cashflow anual positivo (~${Math.round(cashflow)} €)`);
    } else if (cashflow < 0) {
      razones.push(`Cashflow anual negativo (~${Math.round(cashflow)} €)`);
    }
  }

  // Relación ingresos / gastos
  if (!Number.isNaN(ingresos) && !Number.isNaN(gastos) && gastos > 0) {
    const ratio = ingresos / gastos;
    if (ratio >= 3) {
      razones.push('Buena relación ingresos/gastos');
    } else if (ratio < 2) {
      razones.push('Gastos elevados respecto a los ingresos');
    }
  }

  return {
    estado,
    titulo,
    razones: razones.slice(0, 3),
  };
}

