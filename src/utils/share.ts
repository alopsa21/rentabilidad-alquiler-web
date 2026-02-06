import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

/**
 * Datos compartibles de una tarjeta para serialización en URL
 */
export interface ShareableCardData {
  card: AnalisisCard;
  motorOutput: RentabilidadApiResponse;
}

/**
 * Serializa un array de tarjetas a una cadena base64 para compartir en URL
 */
export function serializeCards(cards: ShareableCardData[]): string {
  try {
    const json = JSON.stringify(cards);
    const base64 = btoa(encodeURIComponent(json));
    return base64;
  } catch (error) {
    console.error('Error serializando tarjetas:', error);
    throw new Error('No se pudieron serializar las tarjetas');
  }
}

/**
 * Deserializa una cadena base64 a un array de tarjetas
 */
export function deserializeCards(base64: string): ShareableCardData[] {
  try {
    const json = decodeURIComponent(atob(base64));
    const cards = JSON.parse(json) as ShareableCardData[];
    return cards;
  } catch (error) {
    console.error('Error deserializando tarjetas:', error);
    throw new Error('No se pudieron deserializar las tarjetas');
  }
}

/**
 * Genera una URL compartible con el estado serializado de las tarjetas
 */
export function generateShareableUrl(cards: ShareableCardData[]): string {
  if (cards.length === 0) {
    throw new Error('No hay tarjetas para compartir');
  }

  // Limitar a 5 tarjetas máximo para evitar URLs demasiado largas
  const MAX_CARDS = 5;
  const cardsToShare = cards.slice(0, MAX_CARDS);

  const serialized = serializeCards(cardsToShare);
  const currentUrl = window.location.origin + window.location.pathname;
  return `${currentUrl}?state=${serialized}`;
}

/**
 * Copia una URL al portapapeles
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    throw new Error('No se pudo copiar al portapapeles');
  }
}

/**
 * Obtiene el parámetro 'state' de la URL actual
 */
export function getStateFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('state');
}

