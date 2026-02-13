import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import { NOMBRE_COMUNIDAD_POR_CODIGO } from '../constants/comunidades';

/**
 * Formatea un número para CSV, normalizando porcentajes
 */
function formatNumberForCSV(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  // Si es un porcentaje (entre -1 y 1), convertir a porcentaje
  if (value > -1 && value < 1) {
    return (value * 100).toFixed(2);
  }
  return value.toFixed(2);
}

/**
 * Escapa un valor para CSV (maneja comillas, delimitadores, saltos de línea)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convierte un array de tarjetas a formato CSV
 */
export function cardsToCSV(
  cards: AnalisisCard[],
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>
): string {
  const headers = [
    'ID',
    'URL',
    'Ciudad',
    'Precio Compra',
    'Alquiler Mensual',
    'Comunidad Autónoma',
    'Rentabilidad Bruta',
    'Rentabilidad Neta',
    'Cashflow Final',
    'ROCE Antes',
    'ROCE Final',
    'Veredicto',
    'Habitaciones',
    'Metros Cuadrados',
    'Baños',
  ];

  const rows = cards.map((card) => {
    const resultado = resultadosPorTarjeta[card.id];
    
    const rentabilidadBruta = resultado?.rentabilidadBruta 
      ? formatNumberForCSV(Number(resultado.rentabilidadBruta))
      : '';
    const rentabilidadNeta = formatNumberForCSV(card.rentabilidadNetaPct);
    const cashflowFinal = resultado?.cashflowFinal 
      ? formatNumberForCSV(Number(resultado.cashflowFinal))
      : '';
    const roceAntes = resultado?.roceAntes 
      ? formatNumberForCSV(Number(resultado.roceAntes))
      : '';
    const roceFinal = resultado?.roceFinal 
      ? formatNumberForCSV(Number(resultado.roceFinal))
      : '';

    return [
      escapeCSVValue(card.id),
      escapeCSVValue(card.url),
      escapeCSVValue(card.ciudad),
      card.precioCompra.toString(),
      card.alquilerEstimado.toString(),
      escapeCSVValue(NOMBRE_COMUNIDAD_POR_CODIGO[card.currentInput.codigoComunidadAutonoma] ?? ''),
      rentabilidadBruta,
      rentabilidadNeta,
      cashflowFinal,
      roceAntes,
      roceFinal,
      escapeCSVValue(card.veredictoTitulo),
      card.habitaciones.toString(),
      card.metrosCuadrados.toString(),
      card.banos.toString(),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Descarga un archivo CSV
 */
export function downloadCSV(csvContent: string, filename: string = 'rentabilidad-alquiler.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
