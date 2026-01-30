/**
 * Respuesta del endpoint POST /rentabilidad.
 * Todos los valores vienen como string (serialización del motor).
 */
export interface RentabilidadApiResponse {
  totalCompra: string;
  capitalPropio: string;
  ingresosAnuales: string;
  gastosAnuales: string;
  beneficioAntesImpuestos: string;
  cashflowAntesAmortizar: string;
  cashflowFinal: string;
  rentabilidadBruta: string;
  rentabilidadNeta: string;
  roceAntes: string;
  roceFinal: string;
}

/**
 * Respuesta de error de la API (validación o interno).
 */
export interface RentabilidadApiError {
  status: 'error-validacion' | 'error-interno';
  message: string;
  errores?: unknown[];
}
