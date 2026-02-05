import type { FormularioRentabilidadState } from '../types/formulario';

/**
 * Validaciones básicas de UX en frontend.
 * La API sigue siendo la fuente de verdad; esto solo mejora la experiencia.
 */
export function getFormErrors(state: FormularioRentabilidadState): string[] {
  const errors: string[] = [];

  if (state.precioCompra <= 0) {
    errors.push('El precio de compra debe ser mayor que 0');
  }
  if (state.alquilerMensual < 0) {
    errors.push('El alquiler mensual no puede ser negativo');
  }
  if (!state.comunidadAutonoma?.trim()) {
    errors.push('Seleccione una comunidad autónoma');
  }

  if (state.hayHipoteca) {
    if (state.importeHipoteca <= 0) {
      errors.push('El importe de la hipoteca debe ser mayor que 0');
    }
    if (state.tipoInteres <= 0) {
      errors.push('El tipo de interés debe ser mayor que 0');
    }
    if (state.plazoHipoteca <= 0) {
      errors.push('El plazo de la hipoteca debe ser mayor que 0');
    }
  }

  return errors;
}
