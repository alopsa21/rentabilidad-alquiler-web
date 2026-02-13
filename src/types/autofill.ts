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
  source: "idealista:v1";
}
