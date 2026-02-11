/**
 * Mapeo de comunidades autónomas a ciudades principales.
 * Se usa para seleccionar una ciudad aleatoria de la comunidad.
 */

export const CIUDADES_POR_COMUNIDAD: Record<string, string[]> = {
  'Andalucía': ['Sevilla', 'Málaga', 'Córdoba', 'Granada', 'Almería', 'Cádiz', 'Huelva', 'Jaén', 'Marbella', 'Jerez de la Frontera'],
  'Aragón': ['Zaragoza', 'Huesca', 'Teruel'],
  'Asturias': ['Oviedo', 'Gijón', 'Avilés'],
  'Baleares': ['Palma de Mallorca', 'Ibiza', 'Mahón', 'Ciutadella'],
  'Canarias': ['Las Palmas de Gran Canaria', 'Santa Cruz de Tenerife', 'San Cristóbal de La Laguna', 'Arona'],
  'Cantabria': ['Santander', 'Torrelavega'],
  'Castilla La Mancha': ['Toledo', 'Albacete', 'Ciudad Real', 'Guadalajara', 'Cuenca'],
  'Castilla y León': ['Valladolid', 'Burgos', 'León', 'Salamanca', 'Ávila', 'Segovia', 'Soria', 'Palencia', 'Zamora'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona', 'Badalona', 'Sabadell', 'Terrassa', 'Mataró'],
  'Ceuta': ['Ceuta'],
  'Comunidad de Madrid': ['Madrid', 'Móstoles', 'Alcalá de Henares', 'Fuenlabrada', 'Leganés', 'Getafe', 'Alcorcón', 'Torrejón de Ardoz'],
  'Comunidad Valenciana': ['Valencia', 'Alicante', 'Elche', 'Castellón de la Plana', 'Torrevieja', 'Gandía', 'Benidorm'],
  'Extremadura': ['Badajoz', 'Cáceres', 'Mérida', 'Plasencia'],
  'Galicia': ['Vigo', 'A Coruña', 'Ourense', 'Santiago de Compostela', 'Lugo', 'Pontevedra'],
  'La Rioja': ['Logroño', 'Calahorra'],
  'Melilla': ['Melilla'],
  'Murcia': ['Murcia', 'Cartagena', 'Lorca'],
  'Navarra': ['Pamplona', 'Tudela'],
  'País Vasco': ['Bilbao', 'Vitoria-Gasteiz', 'San Sebastián', 'Barakaldo', 'Getxo'],
};

/**
 * Obtiene una ciudad aleatoria de una comunidad autónoma.
 * 
 * @param comunidadAutonoma - Nombre de la comunidad autónoma
 * @returns Nombre de una ciudad aleatoria de esa comunidad, o la comunidad si no se encuentra
 */
export function obtenerCiudadAleatoria(comunidadAutonoma: string): string {
  const ciudades = CIUDADES_POR_COMUNIDAD[comunidadAutonoma];
  
  if (!ciudades || ciudades.length === 0) {
    // Si no encontramos la comunidad, devolver la comunidad como fallback
    return comunidadAutonoma;
  }
  
  // Seleccionar una ciudad aleatoria
  const indiceAleatorio = Math.floor(Math.random() * ciudades.length);
  return ciudades[indiceAleatorio];
}

/**
 * Infiere la comunidad autónoma desde el nombre de una ciudad.
 * Busca la ciudad en el mapeo de ciudades por comunidad.
 * 
 * @param ciudad - Nombre de la ciudad
 * @returns Nombre de la comunidad autónoma o null si no se encuentra
 */
export function inferirComunidadDesdeCiudad(ciudad: string): string | null {
  if (!ciudad) return null;
  
  const ciudadNormalizada = ciudad.trim();
  
  // Buscar en cada comunidad
  for (const [comunidad, ciudades] of Object.entries(CIUDADES_POR_COMUNIDAD)) {
    if (ciudades.some(c => c.toLowerCase() === ciudadNormalizada.toLowerCase())) {
      return comunidad;
    }
  }
  
  return null;
}
