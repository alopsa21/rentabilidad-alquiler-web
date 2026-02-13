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
  /** Valores originales del inmueble del análisis inicial (scraping/LLM) */
  originalHabitaciones: number;
  originalMetrosCuadrados: number;
  originalBanos: number;
  /** Ciudad original del análisis inicial (scraping/LLM) */
  originalCiudad: string;
  /** Input original del análisis inicial (scraping/LLM) */
  originalInput: FormularioRentabilidadState;
  /** Input actual editable por el usuario */
  currentInput: FormularioRentabilidadState;
  /** Si el usuario la ha marcado como favorita (mini portfolio) */
  isFavorite: boolean;
  /** Notas libres del usuario sobre este anuncio */
  notes?: string;
  /** Campos que faltan y deben ser completados por el usuario */
  camposFaltantes?: {
    habitaciones?: boolean;
    metrosCuadrados?: boolean;
    banos?: boolean;
    codigoComunidadAutonoma?: boolean;
    ciudad?: boolean;
    precioCompra?: boolean;
    alquilerMensual?: boolean;
  };
}

