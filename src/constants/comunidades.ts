/**
 * Códigos de comunidades autónomas (CODAUTO 1-19, mismo orden que INE/motor).
 * Se usan para llamar al engine y para selección aleatoria cuando no hay autofill.
 */
export const CODIGOS_COMUNIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

/**
 * Nombre de la comunidad por código (para mostrar en UI y exportar CSV).
 */
export const NOMBRE_COMUNIDAD_POR_CODIGO: Record<number, string> = {
  1: 'Andalucía',
  2: 'Aragón',
  3: 'Asturias',
  4: 'Baleares',
  5: 'Canarias',
  6: 'Cantabria',
  7: 'Castilla y León',
  8: 'Castilla La Mancha',
  9: 'Cataluña',
  10: 'Comunidad Valenciana',
  11: 'Extremadura',
  12: 'Galicia',
  13: 'Comunidad de Madrid',
  14: 'Murcia',
  15: 'Navarra',
  16: 'País Vasco',
  17: 'La Rioja',
  18: 'Ceuta',
  19: 'Melilla',
};

/**
 * Comunidades autónomas por nombre (legacy: para obtenerCiudadAleatoria).
 */
export const COMUNIDADES_AUTONOMAS = Object.values(NOMBRE_COMUNIDAD_POR_CODIGO) as string[];
