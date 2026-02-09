/**
 * Utilidad para comparar objetos FormularioRentabilidadState de forma eficiente
 * sin usar JSON.stringify (que es costoso).
 */

import type { FormularioRentabilidadState } from '../types/formulario';

/**
 * Compara dos objetos FormularioRentabilidadState campo por campo.
 * Mucho más eficiente que JSON.stringify para objetos simples.
 */
export function inputsAreEqual(
  a: FormularioRentabilidadState,
  b: FormularioRentabilidadState
): boolean {
  return (
    a.precioCompra === b.precioCompra &&
    a.alquilerMensual === b.alquilerMensual &&
    a.comunidadAutonoma === b.comunidadAutonoma &&
    a.reforma === b.reforma &&
    a.notaria === b.notaria &&
    a.registro === b.registro &&
    a.comunidadAnual === b.comunidadAnual &&
    a.ibi === b.ibi &&
    a.seguroHogar === b.seguroHogar &&
    a.hayHipoteca === b.hayHipoteca &&
    a.importeHipoteca === b.importeHipoteca &&
    a.tipoInteres === b.tipoInteres &&
    a.plazoHipoteca === b.plazoHipoteca
  );
}
