import type { FormularioRentabilidadState } from './formulario';

export type EstadoColor = 'verde' | 'amarillo' | 'rojo';

export interface AnalisisCard {
  id: string;
  url: string;
  ciudad: string;
  precioCompra: number;
  alquilerEstimado: number;
  rentabilidadNetaPct: number;
  estado: EstadoColor;
  veredictoTitulo: string;
  veredictoRazones: string[];
  habitaciones: number;
  metrosCuadrados: number;
  banos: number;
  /** Input original del análisis inicial (scraping/LLM) */
  originalInput: FormularioRentabilidadState;
  /** Input actual editable por el usuario */
  currentInput: FormularioRentabilidadState;
}

