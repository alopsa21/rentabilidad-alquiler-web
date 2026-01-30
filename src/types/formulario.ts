/**
 * Estado del formulario de cálculo de rentabilidad.
 * Valores numéricos en frontend como number; la API/motor usa Decimal.
 */
export interface FormularioRentabilidadState {
  /** Precio de adquisición (€) - obligatorio */
  precioCompra: number;
  /** Comunidad autónoma - obligatorio */
  comunidadAutonoma: string;
  /** Alquiler mensual esperado (€/mes) - obligatorio */
  alquilerMensual: number;
  /** Coste de reforma (€) */
  reforma: number;
  /** Gastos de notaría (€) */
  notaria: number;
  /** Gastos de registro (€) */
  registro: number;
  /** Comunidad de propietarios (€/año) */
  comunidadAnual: number;
  /** IBI (€/año) */
  ibi: number;
  /** Seguro del hogar (€/año) */
  seguroHogar: number;
  /** Indica si hay hipoteca */
  hayHipoteca: boolean;
  /** Importe total de la hipoteca (€) */
  importeHipoteca: number;
  /** Tipo de interés anual (%) */
  tipoInteres: number;
  /** Plazo del préstamo (años) */
  plazoHipoteca: number;
}

export const INITIAL_FORM_STATE: FormularioRentabilidadState = {
  precioCompra: 0,
  comunidadAutonoma: '',
  alquilerMensual: 0,
  reforma: 0,
  notaria: 0,
  registro: 0,
  comunidadAnual: 0,
  ibi: 0,
  seguroHogar: 0,
  hayHipoteca: false,
  importeHipoteca: 0,
  tipoInteres: 0,
  plazoHipoteca: 0,
};
