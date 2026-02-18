import type { FormularioRentabilidadState } from './formulario';

/**
 * Campos opcionales del motor (MotorInput) que se pueden editar en el panel de detalle.
 * Valores en frontend como number | boolean; la API/motor usa Decimal.
 * Ver contrato v1 y rentabilidad-alquiler-engine/src/types.ts
 */
export interface MotorInputOptionals {
  // Financiación
  hayHipoteca: boolean;
  importeHipoteca: number;
  capitalPropio: number; // Capital propio invertido (Total compra - Importe hipoteca)
  tipoInteres: number;
  plazoHipoteca: number;
  // Gastos de compra (€)
  notaria: number;
  registro: number;
  comisionInmobiliaria: number;
  otrosGastosCompra: number;
  reforma: number;
  tasacion: number;
  gestoriaBanco: number;
  seguroVidaHipoteca: number;
  // Gastos anuales (€/año)
  comunidadAnual: number;
  ibi: number;
  seguroHogar: number;
  seguroImpago: number;
  basura: number;
  agua: number;
  electricidad: number;
  gas: number;
  internet: number;
  // Gastos calculados editables (€/año)
  mantenimiento: number; // Si es 0, se calcula como 7% de ingresos anuales
  periodoSinAlquilar: number; // Si es 0, se calcula como 3% de ingresos anuales
}

/**
 * Defaults globales realistas para inversión inmobiliaria residencial en España.
 * Punto de partida orientativo; el usuario puede editarlos en el panel de detalle.
 */
export const DEFAULT_PANEL_OPTIONALS: MotorInputOptionals = {
  hayHipoteca: false,
  importeHipoteca: 0, // Se calcula como precioCompra * 0.8 si hayHipoteca
  capitalPropio: 0, // Se calcula como Total compra - Importe hipoteca
  tipoInteres: 3.5,
  plazoHipoteca: 25,
  notaria: 0, // Se calcula según precioCompra
  registro: 0, // Se calcula según precioCompra
  comisionInmobiliaria: 0, // Se calcula según precioCompra
  otrosGastosCompra: 0,
  reforma: 0,
  tasacion: 0, // Se calcula si hay hipoteca
  gestoriaBanco: 0, // Se calcula si hay hipoteca
  seguroVidaHipoteca: 0, // Se calcula si hay hipoteca
  comunidadAnual: 600,
  ibi: 0, // Se calcula como precioCompra * 0.004
  seguroHogar: 300,
  seguroImpago: 0, // Se calcula como 5% ingresos anuales
  basura: 200,
  agua: 0,
  electricidad: 0,
  gas: 0,
  internet: 0,
  mantenimiento: 0, // 0 = calcular automáticamente (7% ingresos)
  periodoSinAlquilar: 0, // 0 = calcular automáticamente (3% ingresos)
};

/**
 * Defaults calculados en función del precio de compra y alquiler.
 * Se usan al crear tarjeta y al restaurar valores por defecto.
 */
export function getDefaultOptionalsForPrice(
  precioCompra: number,
  alquilerMensual: number,
  hayHipoteca: boolean = false
): Partial<MotorInputOptionals> {
  const ingresosAnuales = alquilerMensual * 12;
  const result: Partial<MotorInputOptionals> = {
    notaria: Math.round(precioCompra * 0.001), // 0,1% del precio
    registro: Math.round(precioCompra * 0.0005), // 0,05% del precio
    comisionInmobiliaria: Math.round(precioCompra * 0.03), // 3% del precio
    ibi: Math.round(precioCompra * 0.004), // 0,4% del precio (valor catastral aproximado)
    seguroImpago: Math.round(ingresosAnuales * 0.05), // 5% de ingresos anuales
  };
  if (hayHipoteca && precioCompra > 0) {
    result.importeHipoteca = Math.round(precioCompra * 0.8);
    result.tasacion = 400;
    result.gestoriaBanco = 400;
    result.seguroVidaHipoteca = 250;
  }
  return result;
}

/** Campos opcionales que ya lleva FormularioRentabilidadState (solo valores no cero para no pisar defaults) */
function optionalsFromForm(input: FormularioRentabilidadState): Partial<MotorInputOptionals> {
  const out: Partial<MotorInputOptionals> = {
    hayHipoteca: input.hayHipoteca,
  };
  if (input.importeHipoteca > 0) out.importeHipoteca = input.importeHipoteca;
  if (input.tipoInteres > 0) out.tipoInteres = input.tipoInteres;
  if (input.plazoHipoteca > 0) out.plazoHipoteca = input.plazoHipoteca;
  if (input.notaria > 0) out.notaria = input.notaria;
  if (input.registro > 0) out.registro = input.registro;
  if (input.reforma > 0) out.reforma = input.reforma;
  if (input.comunidadAnual > 0) out.comunidadAnual = input.comunidadAnual;
  if (input.ibi > 0) out.ibi = input.ibi;
  if (input.seguroHogar > 0) out.seguroHogar = input.seguroHogar;
  return out;
}

/** Valores efectivos de opcionales para una tarjeta: defaults estáticos + calculados + currentInput + overrides */
export function getEffectiveOptionals(card: { currentInput: FormularioRentabilidadState; overrides?: Partial<MotorInputOptionals> }): MotorInputOptionals {
  const precioCompra = Number(card.currentInput.precioCompra) || 0;
  const alquilerMensual = Number(card.currentInput.alquilerMensual) || 0;
  const calculated = getDefaultOptionalsForPrice(precioCompra, alquilerMensual, card.currentInput.hayHipoteca);
  return {
    ...DEFAULT_PANEL_OPTIONALS,
    ...calculated,
    ...optionalsFromForm(card.currentInput),
    ...(card.overrides ?? {}),
  };
}
