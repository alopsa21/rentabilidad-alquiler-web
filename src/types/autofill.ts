/**
 * Datos extraídos automáticamente de un anuncio inmobiliario.
 */
export interface IdealistaAutofill {
  buyPrice: number | null;
  sqm: number | null;
  rooms: number | null;
  banos: number | null;
  ciudad: string | null;
  codigoComunidadAutonoma: number | null;
  featuresText: string | null;
  estimatedRent?: number | null;
  alquilerMensual?: number | null;
  source: "idealista:v1" | "openai:v2";
}
