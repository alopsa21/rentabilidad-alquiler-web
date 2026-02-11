/**
 * Utilidades para persistencia ligera usando localStorage.
 * 
 * Persiste las tarjetas de análisis con sus inputs y resultados.
 */

import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import type { FormularioRentabilidadState } from '../types/formulario';

const STORAGE_KEY = 'rentabilidad-alquiler:cards';
const STORAGE_VERSION = 2;

/**
 * Estructura de datos persistida en localStorage.
 */
interface PersistedCardsData {
  version: number;
  cards: PersistedCard[];
}

/**
 * Estructura de una tarjeta persistida.
 */
interface PersistedCard {
  id: string;
  url: string;
  ciudad: string;
  precioCompra: number;
  alquilerEstimado: number;
  rentabilidadNetaPct: number;
  estado: 'verde' | 'amarillo' | 'rojo';
  veredictoTitulo: string;
  veredictoRazones: string[];
  habitaciones: number;
  metrosCuadrados: number;
  banos: number;
  originalInput: unknown; // FormularioRentabilidadState
  currentInput: unknown; // FormularioRentabilidadState
  motorOutput: RentabilidadApiResponse;
  createdAt?: string; // Opcional para compatibilidad con versiones anteriores
  isFavorite?: boolean; // Opcional para compatibilidad con versiones anteriores
  notes?: string;
}

/**
 * Convierte una AnalisisCard a formato persistido.
 */
function cardToPersisted(
  card: AnalisisCard,
  motorOutput: RentabilidadApiResponse,
  createdAt?: string
): PersistedCard {
  return {
    id: card.id,
    url: card.url,
    ciudad: card.ciudad,
    precioCompra: card.precioCompra,
    alquilerEstimado: card.alquilerEstimado,
    rentabilidadNetaPct: card.rentabilidadNetaPct,
    estado: card.estado,
    veredictoTitulo: card.veredictoTitulo,
    veredictoRazones: card.veredictoRazones,
    habitaciones: card.habitaciones,
    metrosCuadrados: card.metrosCuadrados,
    banos: card.banos,
    originalInput: card.originalInput,
    currentInput: card.currentInput,
    motorOutput,
    createdAt: createdAt || new Date().toISOString(),
    isFavorite: card.isFavorite,
    notes: card.notes ?? '',
  };
}

/**
 * Convierte una tarjeta persistida a AnalisisCard.
 */
function persistedToCard(persisted: PersistedCard): AnalisisCard {
  return {
    id: persisted.id,
    url: persisted.url,
    ciudad: persisted.ciudad,
    precioCompra: persisted.precioCompra,
    alquilerEstimado: persisted.alquilerEstimado,
    rentabilidadNetaPct: persisted.rentabilidadNetaPct,
    estado: persisted.estado,
    veredictoTitulo: persisted.veredictoTitulo,
    veredictoRazones: persisted.veredictoRazones,
    habitaciones: persisted.habitaciones,
    metrosCuadrados: persisted.metrosCuadrados,
    banos: persisted.banos,
    originalInput: persisted.originalInput as FormularioRentabilidadState,
    currentInput: persisted.currentInput as FormularioRentabilidadState,
    isFavorite: persisted.isFavorite ?? false,
    notes: persisted.notes ?? '',
  };
}

/**
 * Carga las tarjetas desde localStorage.
 * 
 * @returns Array de objetos con card, motorOutput y createdAt, o array vacío si no hay datos o hay error
 */
export function loadCards(): Array<{ card: AnalisisCard; motorOutput: RentabilidadApiResponse; createdAt?: string }> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const data: PersistedCardsData = JSON.parse(stored);

    // Validar versión
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Versión de storage (${data.version}) no coincide con la actual (${STORAGE_VERSION}). Limpiando datos.`);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Convertir tarjetas persistidas a formato interno
    return data.cards.map((persisted) => ({
      card: persistedToCard(persisted),
      motorOutput: persisted.motorOutput,
      createdAt: persisted.createdAt,
    }));
  } catch (err) {
    console.error('Error al cargar tarjetas desde localStorage:', err);
    // En caso de error, limpiar datos corruptos
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

/**
 * Guarda las tarjetas en localStorage.
 * 
 * @param cards - Array de tarjetas a persistir
 * @param resultadosPorTarjeta - Mapa de resultados por ID de tarjeta
 */
export function saveCards(
  cards: AnalisisCard[],
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>,
  existingCreatedAt?: Record<string, string>
): void {
  try {
    const persistedCards: PersistedCard[] = cards.map((card) => {
      const motorOutput = resultadosPorTarjeta[card.id];
      if (!motorOutput) {
        // Si no hay resultado aún, no guardar esta tarjeta (puede estar en proceso de creación)
        return null;
      }
      const createdAt = existingCreatedAt?.[card.id];
      return cardToPersisted(card, motorOutput, createdAt);
    }).filter((card): card is PersistedCard => card !== null);

    const data: PersistedCardsData = {
      version: STORAGE_VERSION,
      cards: persistedCards,
    };

    // OPTIMIZACIÓN CRÍTICA: usar requestIdleCallback para no bloquear el hilo principal
    const saveOperation = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (innerErr) {
        console.error('Error escribiendo en localStorage:', innerErr);
      }
    };

    // Ejecutar en tiempos muertos del navegador si está disponible
    if ('requestIdleCallback' in window) {
      requestIdleCallback(saveOperation, { timeout: 2000 });
    } else {
      setTimeout(saveOperation, 0);
    }
  } catch (err) {
    console.error('Error al guardar tarjetas en localStorage:', err);
    // No lanzar error para no interrumpir la UX
  }
}

/**
 * Limpia todas las tarjetas guardadas en localStorage.
 */
export function clearCards(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error al limpiar tarjetas de localStorage:', err);
  }
}
