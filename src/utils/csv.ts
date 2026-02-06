/**
 * Utilidades para exportar tarjetas a CSV.
 */

import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

/**
 * Convierte un valor numérico a string sin formato (sin símbolos € o %).
 */
function formatNumberForCSV(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '';
  // Normalizar porcentajes (si viene como decimal 0.05, convertir a 5)
  if (num > -1 && num < 1 && num !== 0) {
    return (num * 100).toFixed(2);
  }
  return num.toFixed(2);
}

/**
 * Escapa valores para CSV (maneja comas, punto y coma, comillas, saltos de línea).
 */
function escapeCSVValue(value: string | number): string {
  const str = String(value);
  // Si contiene separador, comillas o saltos de línea, envolver en comillas y escapar comillas internas
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte las tarjetas y sus resultados a formato CSV.
 * 
 * @param cards - Array de tarjetas a exportar
 * @param resultadosPorTarjeta - Mapa de resultados por ID de tarjeta
 * @returns String CSV con headers y filas de datos
 */
export function cardsToCSV(
  cards: AnalisisCard[],
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>
): string {
  // Headers del CSV
  const headers = [
    'id',
    'url',
    'ciudad',
    'precioCompra',
    'alquilerMensual',
    'comunidadAutonoma',
    'rentabilidadBruta',
    'rentabilidadNeta',
    'cashflowFinal',
    'roceAntes',
    'roceFinal',
    'veredicto',
    'habitaciones',
    'metrosCuadrados',
    'banos',
  ];

  // Construir filas
  const rows = cards.map((card) => {
    const resultado = resultadosPorTarjeta[card.id];
    if (!resultado) {
      // Si no hay resultado, usar valores por defecto
      return [
        card.id,
        card.url || '',
        card.ciudad || '',
        card.currentInput.precioCompra,
        card.currentInput.alquilerMensual,
        card.currentInput.comunidadAutonoma || '',
        '',
        formatNumberForCSV(card.rentabilidadNetaPct),
        '',
        '',
        '',
        card.estado,
        card.habitaciones,
        card.metrosCuadrados,
        card.banos,
      ];
    }

    // Normalizar valores numéricos del resultado
    const rentabilidadBruta = formatNumberForCSV(resultado.rentabilidadBruta);
    const rentabilidadNeta = formatNumberForCSV(resultado.rentabilidadNeta);
    const cashflowFinal = formatNumberForCSV(resultado.cashflowFinal);
    const roceAntes = formatNumberForCSV(resultado.roceAntes);
    const roceFinal = formatNumberForCSV(resultado.roceFinal);

    return [
      card.id,
      card.url || '',
      card.ciudad || '',
      card.currentInput.precioCompra,
      card.currentInput.alquilerMensual,
      card.currentInput.comunidadAutonoma || '',
      rentabilidadBruta,
      rentabilidadNeta,
      cashflowFinal,
      roceAntes,
      roceFinal,
      card.estado,
      card.habitaciones,
      card.metrosCuadrados,
      card.banos,
    ];
  });

  // Construir CSV completo
  const csvLines = [
    headers.join(';'),
    ...rows.map((row) => row.map((val) => escapeCSVValue(val)).join(';')),
  ];

  return csvLines.join('\n');
}

/**
 * Descarga un string CSV como archivo.
 * 
 * @param csvString - Contenido CSV como string
 * @param filename - Nombre del archivo (por defecto 'rentabilidad-alquiler.csv')
 */
export function downloadCSV(csvString: string, filename = 'rentabilidad-alquiler.csv'): void {
  try {
    // Crear Blob con el contenido CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Crear URL temporal
    const url = URL.createObjectURL(blob);
    
    // Crear elemento anchor temporal para descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Añadir al DOM, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar URL temporal después de un breve delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.error('Error al descargar CSV:', err);
    throw new Error('No se pudo descargar el archivo CSV');
  }
}
