import { useState, memo, useCallback, useRef, useEffect, Fragment } from 'react';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import { Decimal } from 'decimal.js';
import { calcularITP as calcularITPEngine } from 'rentabilidad-alquiler-engine';
import { calcularHipotecaDesdeInput } from 'rentabilidad-alquiler-engine';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import type { MotorInputOptionals } from '../types/panelDefaults';
import { getEffectiveOptionals } from '../types/panelDefaults';
import { NOMBRE_COMUNIDAD_POR_CODIGO } from '../constants/comunidades';

/** Definiciones de métricas según contrato_del_motor_v1.md */
const DEFINICIONES_METRICAS: Record<string, string> = {
  totalCompra:
    'Coste total de adquisición del inmueble, incluyendo precio de compra, reformas, gastos notariales y de registro, comisión inmobiliaria, impuestos (ITP) y gastos de financiación (tasación, gestoría, seguro vida hipoteca).',
  capitalPropio:
    'Capital propio invertido en la operación. Se calcula como Total compra menos Importe de hipoteca (si hay financiación). Representa el dinero propio que el inversor pone de su bolsillo.',
  ingresosAnuales:
    'Total de ingresos generados por el alquiler en un año. Se calcula multiplicando el alquiler mensual por 12 meses.',
  gastosAnuales:
    'Total de gastos anuales asociados a la propiedad, incluyendo comunidad, IBI, seguros, mantenimiento (7% de ingresos), periodo sin alquilar (3% de ingresos), servicios e intereses de financiación.',
  beneficioAntesImpuestos:
    'Beneficio obtenido después de restar todos los gastos anuales a los ingresos anuales, pero antes de considerar la amortización de capital de la hipoteca.',
  rentabilidadBruta:
    'Mide el porcentaje de ingresos anuales sobre el total invertido. Representa la rentabilidad teórica máxima del activo sin considerar gastos.',
  rentabilidadNeta:
    'Mide la rentabilidad operativa del activo después de todos los gastos, pero antes de considerar los costes de financiación. Representa cuánto rinde la inversión independientemente de cómo se financie (con o sin hipoteca).',
  cashflowAntesAmortizar:
    'Dinero disponible después de pagar todos los gastos, antes de amortizar capital de la hipoteca. Coincide con el beneficio antes de impuestos.',
  cashflowFinal:
    'Dinero disponible después de amortizar capital de la hipoteca: lo que realmente queda disponible para el inversor.',
  roceAntes:
    'ROCE (Return on Capital Employed) antes de amortizar deuda: rentabilidad del capital propio invertido. Fórmula: BeneficioAntesImpuestos / capitalPropio.',
  roceFinal:
    'ROCE final: rentabilidad del capital propio después de amortizar capital de la hipoteca (rentabilidad real del capital invertido). Fórmula: CashflowFinal / capitalPropio.',
};

const formatEuro = (value: string): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
};

const formatPercent = (value: string): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const toShow = num > -1 && num < 1 ? num * 100 : num;
  return `${toShow.toFixed(2)} %`;
};

/** Número como ratio decimal para mostrar en fórmulas (ej. 0,0591) */
const formatRatio = (value: string): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const toShow = num > -1 && num < 1 ? num : num / 100;
  return toShow.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

/**
 * Tabla de porcentajes de ITP por comunidad autónoma (solo para mostrar en UI).
 * Los cálculos reales se hacen con el engine.
 */
const PORCENTAJES_ITP: Record<number, number> = {
  1: 7.0,   // Andalucía
  2: 8.0,   // Aragón
  3: 8.0,   // Asturias, Principado de
  4: 8.0,   // Balears, Illes
  5: 6.5,   // Canarias
  6: 9.0,   // Cantabria
  7: 8.0,   // Castilla y León
  8: 9.0,   // Castilla - La Mancha
  9: 10.0,  // Cataluña
  10: 10.0, // Comunitat Valenciana
  11: 8.0,  // Extremadura
  12: 8.0,  // Galicia
  13: 6.0,  // Madrid, Comunidad de
  14: 8.0,  // Murcia, Región de
  15: 6.0,  // Navarra, Comunidad Foral de
  16: 7.0,  // País Vasco
  17: 7.0,  // Rioja, La
  18: 6.0,  // Ceuta
  19: 6.0,  // Melilla
};

/**
 * Wrapper para calcularITP del engine que convierte entre number y Decimal.
 * Calcula el ITP (Impuesto de Transmisiones Patrimoniales).
 */
function calcularITP(precioCompra: number, codigoComunidadAutonoma: number): number {
  try {
    const itpDecimal = calcularITPEngine(new Decimal(precioCompra), codigoComunidadAutonoma);
    return itpDecimal.toNumber();
  } catch {
    // Si el código no es válido, devolver 0 (comportamiento anterior)
    return 0;
  }
}

/**
 * Wrapper para calcularHipotecaDesdeInput del engine que convierte entre number y Decimal.
 * Calcula los datos de la hipoteca usando el motor financiero.
 */
function calcularDatosHipoteca(
  importeHipoteca: number,
  tipoInteres: number,
  plazoHipoteca: number
): {
  cuotaMensual: number;
  interesesPrimerAnio: number;
  capitalAmortizadoPrimerAnio: number;
  totalADevolver: number;
  interesesTotales: number;
} {
  const resultado = calcularHipotecaDesdeInput({
    hayHipoteca: true,
    importeHipoteca: new Decimal(importeHipoteca),
    tipoInteres: new Decimal(tipoInteres),
    plazoHipoteca,
  });
  
  return {
    cuotaMensual: resultado.cuotaMensual.toNumber(),
    interesesPrimerAnio: resultado.interesesPrimerAnio.toNumber(),
    capitalAmortizadoPrimerAnio: resultado.capitalAmortizadoPrimerAnio.toNumber(),
    totalADevolver: resultado.totalADevolver.toNumber(),
    interesesTotales: resultado.interesesTotales.toNumber(),
  };
}

/**
 * Genera el desglose del cálculo con los números del resultado (según contrato_del_motor_v1.md).
 */
function getDesgloseCalculo(
  id: string,
  resultado: RentabilidadApiResponse,
  card?: AnalisisCard
): { title: string; lines: string[] } {
  const t = Number(resultado.totalCompra);
  const b = Number(resultado.beneficioAntesImpuestos);
  const cfFinal = Number(resultado.cashflowFinal);
  const rb = Number(resultado.rentabilidadBruta);
  const rn = Number(resultado.rentabilidadNeta);
  const roceA = Number(resultado.roceAntes);
  const roceF = Number(resultado.roceFinal);

  const percent = (x: number) => (x > -1 && x < 1 ? x * 100 : x).toFixed(2);

  switch (id) {
    case 'totalCompra': {
      // Obtener valores efectivos de la tarjeta (defaults + currentInput + overrides)
      const effective = card ? getEffectiveOptionals(card) : null;
      const precioCompra = card ? card.currentInput.precioCompra : 0;
      const reforma = effective?.reforma || 0;
      const notaria = effective?.notaria || 0;
      const registro = effective?.registro || 0;
      const comisionInmobiliaria = effective?.comisionInmobiliaria || 0;
      const otrosGastosCompra = effective?.otrosGastosCompra || 0;
      const tasacion = effective?.tasacion || 0;
      const gestoriaBanco = effective?.gestoriaBanco || 0;
      const seguroVidaHipoteca = (effective?.hayHipoteca && effective?.seguroVidaHipoteca) ? effective.seguroVidaHipoteca : 0;
      
      const inmueble = precioCompra + reforma + notaria + registro + comisionInmobiliaria + otrosGastosCompra;
      const gastosFinanciacion = tasacion + gestoriaBanco + seguroVidaHipoteca;
      
      // ITP se calcula en el backend según comunidad autónoma, aquí lo obtenemos por diferencia
      const totalCompraNum = Number(resultado.totalCompra);
      const itp = totalCompraNum - inmueble - gastosFinanciacion;
      
      const lines: string[] = [
        `Fórmula: Inmueble + Impuestos (ITP) + Gastos de financiación`,
        ``,
        `Inmueble:`,
        `  Precio compra: ${formatEuro(String(precioCompra))}`,
        reforma > 0 ? `  Reforma: ${formatEuro(String(reforma))}` : null,
        notaria > 0 ? `  Notaría: ${formatEuro(String(notaria))}` : null,
        registro > 0 ? `  Registro: ${formatEuro(String(registro))}` : null,
        comisionInmobiliaria > 0 ? `  Comisión inmobiliaria: ${formatEuro(String(comisionInmobiliaria))}` : null,
        otrosGastosCompra > 0 ? `  Otros gastos compra: ${formatEuro(String(otrosGastosCompra))}` : null,
        `  Subtotal inmueble: ${formatEuro(String(inmueble))}`,
        ``,
        `Impuestos:`,
        itp > 0 ? `  ITP (según comunidad autónoma): ${formatEuro(String(itp))}` : `  ITP: ${formatEuro('0')}`,
        ``,
        `Gastos de financiación:`,
        tasacion > 0 ? `  Tasación: ${formatEuro(String(tasacion))}` : null,
        gestoriaBanco > 0 ? `  Gestoría banco: ${formatEuro(String(gestoriaBanco))}` : null,
        seguroVidaHipoteca > 0 ? `  Seguro vida hipoteca: ${formatEuro(String(seguroVidaHipoteca))}` : null,
        gastosFinanciacion > 0 ? `  Subtotal gastos financiación: ${formatEuro(String(gastosFinanciacion))}` : `  Subtotal gastos financiación: ${formatEuro('0')}`,
        ``,
        `Total compra: ${formatEuro(resultado.totalCompra)}`,
      ].filter(Boolean) as string[];
      
      return {
        title: 'Total compra',
        lines,
      };
    }
    case 'capitalPropio': {
      const effective = card ? getEffectiveOptionals(card) : null;
      const importeHipoteca = (effective?.hayHipoteca && effective?.importeHipoteca) ? effective.importeHipoteca : 0;
      return {
        title: 'Capital propio',
        lines: [
          `Fórmula: Total compra − Importe hipoteca`,
          `${formatEuro(resultado.totalCompra)} − ${formatEuro(String(importeHipoteca))} = ${formatEuro(resultado.capitalPropio)}`,
        ],
      };
    }
    case 'ingresosAnuales':
      const alquilerMensual = card ? card.currentInput.alquilerMensual : 0;
      return {
        title: 'Ingresos anuales',
        lines: [
          `Fórmula: Alquiler mensual × 12`,
          `${formatEuro(String(alquilerMensual))} × 12 = ${formatEuro(resultado.ingresosAnuales)}`,
        ],
      };
    case 'gastosAnuales': {
      // Calcular componentes de gastos anuales con valores específicos
      const ingresosAnuales = Number(resultado.ingresosAnuales);
      const mantenimiento = ingresosAnuales * 0.07;
      const periodoSinAlquilar = ingresosAnuales * 0.03;
      
      // Obtener valores efectivos de la tarjeta (defaults + currentInput + overrides)
      const effective = card ? getEffectiveOptionals(card) : null;
      const comunidadAnual = effective?.comunidadAnual || 0;
      const ibi = effective?.ibi || 0;
      const seguroHogar = effective?.seguroHogar || 0;
      const seguroImpago = effective?.seguroImpago || 0;
      const seguroVidaHipoteca = (effective?.hayHipoteca && effective?.seguroVidaHipoteca) ? effective.seguroVidaHipoteca : 0;
      const basura = effective?.basura || 0;
      const agua = effective?.agua || 0;
      const electricidad = effective?.electricidad || 0;
      const gas = effective?.gas || 0;
      const internet = effective?.internet || 0;
      
      // Calcular intereses de financiación (del primer año)
      // Fórmula inversa desde rentabilidadNeta: RentabilidadNeta = (BeneficioAntesImpuestos + Intereses) / TotalCompra
      // Por tanto: Intereses = RentabilidadNeta × TotalCompra − BeneficioAntesImpuestos
      const interesesFinanciacion = Number(resultado.rentabilidadNeta) * Number(resultado.totalCompra) - Number(resultado.beneficioAntesImpuestos);
      
      const gastosFijos = comunidadAnual + ibi + seguroHogar + seguroImpago + seguroVidaHipoteca + basura + agua + electricidad + gas + internet;
      
      const lines: string[] = [
        `Fórmula: Gastos fijos + Mantenimiento + Periodo sin alquilar + Intereses`,
        ``,
        `Gastos fijos:`,
        `  Comunidad: ${formatEuro(String(comunidadAnual))}`,
        `  IBI: ${formatEuro(String(ibi))}`,
        `  Seguro hogar: ${formatEuro(String(seguroHogar))}`,
        seguroVidaHipoteca > 0 ? `  Seguro vida hipoteca: ${formatEuro(String(seguroVidaHipoteca))}` : null,
        `  Seguro impago: ${formatEuro(String(seguroImpago))}`,
        `  Basura: ${formatEuro(String(basura))}`,
        `  Agua: ${formatEuro(String(agua))}`,
        `  Electricidad: ${formatEuro(String(electricidad))}`,
        `  Gas: ${formatEuro(String(gas))}`,
        `  Internet: ${formatEuro(String(internet))}`,
        `  Subtotal gastos fijos: ${formatEuro(String(gastosFijos))}`,
        ``,
        `Gastos calculados:`,
        `  Mantenimiento (7% ingresos): ${formatEuro(String(mantenimiento))}`,
        `  Periodo sin alquilar (3% ingresos): ${formatEuro(String(periodoSinAlquilar))}`,
        interesesFinanciacion > 0 ? `  Intereses financiación: ${formatEuro(String(interesesFinanciacion))}` : null,
        ``,
        `Total gastos anuales: ${formatEuro(resultado.gastosAnuales)}`,
      ].filter(Boolean) as string[];
      
      return {
        title: 'Gastos anuales',
        lines,
      };
    }
    case 'beneficioAntesImpuestos':
      return {
        title: 'Beneficio antes de impuestos',
        lines: [
          `Fórmula: Ingresos anuales − Gastos anuales`,
          `${formatEuro(resultado.ingresosAnuales)} − ${formatEuro(resultado.gastosAnuales)} = ${formatEuro(resultado.beneficioAntesImpuestos)}`,
        ],
      };
    case 'rentabilidadBruta':
      return {
        title: 'Rentabilidad bruta',
        lines: [
          `Fórmula: Ingresos anuales / Total compra`,
          `${formatEuro(resultado.ingresosAnuales)} / ${formatEuro(resultado.totalCompra)} = ${formatRatio(resultado.rentabilidadBruta)}`,
          `= ${percent(rb)} %`,
        ],
      };
    case 'rentabilidadNeta': {
      const intereses = rn * t - b;
      return {
        title: 'Rentabilidad neta',
        lines: [
          `Fórmula: (Beneficio antes impuestos + Intereses financiación) / Total compra`,
          `(${formatEuro(resultado.beneficioAntesImpuestos)} + ${formatEuro(String(intereses))}) / ${formatEuro(resultado.totalCompra)} = ${formatRatio(resultado.rentabilidadNeta)}`,
          `= ${percent(rn)} %`,
        ],
      };
    }
    case 'cashflowAntesAmortizar':
      return {
        title: 'Cashflow antes de amortizar deuda',
        lines: [
          `Fórmula: Cashflow antes = Beneficio antes de impuestos`,
          `${formatEuro(resultado.beneficioAntesImpuestos)} = ${formatEuro(resultado.cashflowAntesAmortizar)}`,
        ],
      };
    case 'cashflowFinal': {
      const capAmort = b - cfFinal;
      return {
        title: 'Cashflow final',
        lines: [
          `Fórmula: Beneficio antes impuestos − Capital amortizado (año)`,
          `${formatEuro(resultado.beneficioAntesImpuestos)} − ${formatEuro(String(capAmort))} = ${formatEuro(resultado.cashflowFinal)}`,
        ],
      };
    }
    case 'roceAntes':
      return {
        title: 'ROCE antes de amortizar deuda',
        lines: [
          `Fórmula: Beneficio antes impuestos / Capital propio`,
          `${formatEuro(resultado.beneficioAntesImpuestos)} / ${formatEuro(resultado.capitalPropio)} = ${formatRatio(resultado.roceAntes)}`,
          `= ${percent(roceA)} %`,
        ],
      };
    case 'roceFinal':
      return {
        title: 'ROCE final',
        lines: [
          `Fórmula: Cashflow final / Capital propio`,
          `${formatEuro(resultado.cashflowFinal)} / ${formatEuro(resultado.capitalPropio)} = ${formatRatio(resultado.roceFinal)}`,
          `= ${percent(roceF)} %`,
        ],
      };
    default:
      return { title: '', lines: [] };
  }
}

interface DetalleAnalisisProps {
  card: AnalisisCard;
  resultado: RentabilidadApiResponse;
  isHorizontalLayout?: boolean;
  /** Al editar un campo opcional en el panel, actualiza overrides de la tarjeta y dispara recálculo */
  onOverrideChange?: (overrides: Partial<MotorInputOptionals>) => void;
  /** Restaura valores por defecto (elimina overrides de esta tarjeta) */
  onRestoreDefaults?: () => void;
}

/**
 * Devuelve los IDs de los campos que deben resaltarse cuando se muestra el desglose de una métrica.
 */
function getHighlightedFields(metricId: string | null): string[] {
  if (!metricId) return [];
  
  switch (metricId) {
    case 'totalCompra':
      return ['precioCompra', 'reforma', 'notaria', 'registro', 'comisionInmobiliaria', 'otrosGastosCompra', 'totalITP', 'tasacion', 'gestoriaBanco', 'seguroVidaHipoteca'];
    case 'capitalPropio':
      return ['totalCompra', 'importeHipoteca'];
    case 'ingresosAnuales':
      return ['alquilerMensual'];
    case 'gastosAnuales':
      return ['comunidadAnual', 'ibi', 'seguroHogar', 'seguroImpago', 'basura', 'agua', 'electricidad', 'gas', 'internet', 'mantenimiento', 'periodoSinAlquilar', 'seguroVidaHipoteca'];
    case 'beneficioAntesImpuestos':
      // Resaltar los campos de entrada que componen ingresosAnuales y gastosAnuales
      return ['alquilerMensual', 'comunidadAnual', 'ibi', 'seguroHogar', 'seguroImpago', 'basura', 'agua', 'electricidad', 'gas', 'internet', 'mantenimiento', 'periodoSinAlquilar', 'seguroVidaHipoteca'];
    case 'rentabilidadBruta':
      // Resaltar solo los títulos de las secciones que componen la fórmula (no los campos individuales)
      return ['totalCompra', 'ingresosAnuales'];
    case 'rentabilidadNeta':
      // Resaltar títulos: Beneficios, Intereses financiación, Total compra
      return ['beneficioAntesImpuestos', 'interesesPrimerAnio', 'totalCompra'];
    case 'cashflowAntesAmortizar':
      // Resaltar solo el título Beneficios (Cashflow antes de amortizar = BeneficioAntesImpuestos)
      return ['beneficioAntesImpuestos'];
    case 'cashflowFinal':
      // Resaltar solo Beneficios y Capital amortizado (año)
      return ['beneficioAntesImpuestos', 'capitalAmortizadoAnual'];
    case 'roceAntes':
      // Resaltar solo Beneficios y Capital Propio
      return ['beneficioAntesImpuestos', 'capitalPropio'];
    case 'roceFinal':
      // Resaltar solo Cashflow final y Capital propio
      return ['cashflowFinal', 'capitalPropio'];
    default:
      return [];
  }
}

function DetalleAnalisisComponent({ card, resultado, isHorizontalLayout = false, onOverrideChange, onRestoreDefaults }: DetalleAnalisisProps) {
  const [definicionAbierta, setDefinicionAbierta] = useState<string | null>(null);
  const [desgloseAbierto, setDesgloseAbierto] = useState<string | null>(null);
  const highlightedFields = getHighlightedFields(desgloseAbierto);
  /** Overrides locales: actualización inmediata al escribir; el recálculo (API) va con debounce */
  const [localOverrides, setLocalOverrides] = useState<Partial<MotorInputOptionals>>(card.overrides ?? {});
  const localOverridesRef = useRef<Partial<MotorInputOptionals>>(localOverrides);
  localOverridesRef.current = localOverrides;
  const cardWithLocalOverrides = { ...card, overrides: localOverrides };
  const effective = getEffectiveOptionals(cardWithLocalOverrides);
  const hasOverrides = (card.overrides && Object.keys(card.overrides).length > 0) || (localOverrides && Object.keys(localOverrides).length > 0);
  const editable = Boolean(onOverrideChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalOverrides(card.overrides ?? {});
  }, [card.overrides]);

  // Aplicar defaults de gastos de financiación cuando hay hipoteca pero no hay overrides explícitos
  useEffect(() => {
    if (!editable || !onOverrideChange) return;
    if (!card.currentInput.hayHipoteca) return;
    
    const precioCompra = Number(card.currentInput.precioCompra) || 0;
    if (precioCompra === 0) return;
    
    // Verificar overrides originales de la tarjeta, no los locales (para evitar bucles)
    const originalOverrides = card.overrides ?? {};
    const currentOverrides = localOverridesRef.current;
    const needsUpdate: Partial<MotorInputOptionals> = {};
    let hasChanges = false;
    
    // Solo aplicar defaults si no hay overrides explícitos (ni en card.overrides ni en localOverrides)
    if (!('tasacion' in originalOverrides) && !('tasacion' in currentOverrides)) {
      needsUpdate.tasacion = 400;
      hasChanges = true;
    }
    if (!('gestoriaBanco' in originalOverrides) && !('gestoriaBanco' in currentOverrides)) {
      needsUpdate.gestoriaBanco = 400;
      hasChanges = true;
    }
    if (!('seguroVidaHipoteca' in originalOverrides) && !('seguroVidaHipoteca' in currentOverrides)) {
      needsUpdate.seguroVidaHipoteca = 250;
      hasChanges = true;
    }
    
    if (hasChanges) {
      const nextOverrides = { ...currentOverrides, ...needsUpdate };
      localOverridesRef.current = nextOverrides;
      setLocalOverrides(nextOverrides);
      // Usar debounce para evitar múltiples llamadas
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onOverrideChange(nextOverrides);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.currentInput.hayHipoteca, card.currentInput.precioCompra, card.overrides, editable]);

  const handleOptionalChange = useCallback(
    (field: keyof MotorInputOptionals, value: number | boolean) => {
      if (!onOverrideChange) return;
      const prev = localOverridesRef.current;
      const updates: Partial<MotorInputOptionals> = { [field]: value };
      
      if (field === 'hayHipoteca' && value === true) {
        const precioCompra = Number(card.currentInput.precioCompra) || 0;
        const effective = getEffectiveOptionals({ ...card, overrides: prev });
        const currentImporte = prev.importeHipoteca ?? effective.importeHipoteca;
        if (precioCompra > 0 && (!currentImporte || currentImporte === 0)) {
          const importeHipotecaDefault = Math.round(precioCompra * 0.8);
          updates.importeHipoteca = importeHipotecaDefault;
        }
        // Aplicar valores por defecto de tipo de interés y plazo si no tienen valores
        const currentTipoInteres = prev.tipoInteres ?? effective.tipoInteres;
        if (!currentTipoInteres || currentTipoInteres === 0) {
          updates.tipoInteres = 3.5;
        }
        const currentPlazo = prev.plazoHipoteca ?? effective.plazoHipoteca;
        if (!currentPlazo || currentPlazo === 0) {
          updates.plazoHipoteca = 25;
        }
        // Aplicar defaults de gastos de financiación si no tienen valores
        const currentTasacion = prev.tasacion ?? effective.tasacion;
        if (!currentTasacion || currentTasacion === 0) {
          updates.tasacion = 400;
        }
        const currentGestoria = prev.gestoriaBanco ?? effective.gestoriaBanco;
        if (!currentGestoria || currentGestoria === 0) {
          updates.gestoriaBanco = 400;
        }
        const currentSeguroVida = prev.seguroVidaHipoteca ?? effective.seguroVidaHipoteca;
        if (!currentSeguroVida || currentSeguroVida === 0) {
          updates.seguroVidaHipoteca = 250;
        }
      }
      if (field === 'hayHipoteca' && value === false) {
        updates.importeHipoteca = 0;
        updates.tipoInteres = 0;
        updates.plazoHipoteca = 0;
        updates.tasacion = 0;
        updates.gestoriaBanco = 0;
        updates.seguroVidaHipoteca = 0;
      }
      
      const nextOverrides = { ...prev, ...updates };
      localOverridesRef.current = nextOverrides;
      setLocalOverrides(nextOverrides);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onOverrideChange(localOverridesRef.current);
      }, 1000);
    },
    [onOverrideChange, card]
  );

  return (
    <aside
      className={`detalle-analisis ${isHorizontalLayout ? 'detalle-analisis-horizontal' : ''}`}
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 20,
        backgroundColor: '#fff',
        position: 'sticky',
        top: 80,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'fit-content',
        overflow: 'visible',
        maxWidth: '100%',
      }}
    >

      {/* Panel Gastos y Financiación: fila completa debajo (solo si editable) */}
      {editable && (
        <section className="detalle-gastos-full" style={{ marginBottom: 20 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: { xs: 'wrap', lg: 'nowrap' }, justifyContent: 'flex-start', position: 'relative' }}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 1, md: 1.5 }, minWidth: { xs: '100%', md: 0 }, maxWidth: { xs: '100%', md: 'none' }, flex: { xs: '0 0 100%', md: '1 1 auto' }, flexShrink: 0, width: { xs: '100%', md: 'auto' }, boxSizing: 'border-box' }}>
              {(() => {
                const isTotalCompraHighlighted = highlightedFields.includes('totalCompra');
                return (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 2, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: isTotalCompraHighlighted ? '#fff9c4' : 'transparent', padding: isTotalCompraHighlighted ? '4px 8px' : '0', borderRadius: isTotalCompraHighlighted ? '4px' : '0', transition: 'background-color 0.2s ease, padding 0.2s ease' }}>
                    Importe Total Compra
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {formatEuro(resultado.totalCompra)}
                    </Typography>
                  </Typography>
                );
              })()}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(3, auto)' }, gap: { xs: 1.5, md: 2, lg: 3 }, columnGap: { xs: 1, md: 1.5, lg: 3 } }}>
            {/* Columna 1 - Inmueble */}
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
              {(() => {
                const precioCompra = Number(card.currentInput.precioCompra) || 0;
                const reforma = effective.reforma || 0;
                const notaria = effective.notaria || 0;
                const registro = effective.registro || 0;
                const comisionInmobiliaria = effective.comisionInmobiliaria || 0;
                const otrosGastosCompra = effective.otrosGastosCompra || 0;
                const subtotalInmueble = precioCompra + reforma + notaria + registro + comisionInmobiliaria + otrosGastosCompra;
                return (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Inmueble
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {formatEuro(String(subtotalInmueble))}
                    </Typography>
                  </Typography>
                );
              })()}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1fr' }, gap: { xs: 1.25, md: 1.5 }, columnGap: { xs: 0.5, md: 1.5 }, rowGap: { xs: 2, md: 2 } }}>
                {(() => {
                  const isPrecioCompraHighlighted = highlightedFields.includes('precioCompra');
                  const isReformaHighlighted = highlightedFields.includes('reforma');
                  const isNotariaHighlighted = highlightedFields.includes('notaria');
                  const isRegistroHighlighted = highlightedFields.includes('registro');
                  const isComisionHighlighted = highlightedFields.includes('comisionInmobiliaria');
                  const isOtrosGastosHighlighted = highlightedFields.includes('otrosGastosCompra');
                  return (
                    <>
                      <Box sx={{ 
                        backgroundColor: isPrecioCompraHighlighted ? '#fff9c4' : 'transparent',
                        padding: isPrecioCompraHighlighted ? '4px 8px' : '0',
                        borderRadius: isPrecioCompraHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Precio compra" value={card.currentInput.precioCompra || ''} disabled size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="precioCompra" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isReformaHighlighted ? '#fff9c4' : 'transparent',
                        padding: isReformaHighlighted ? '4px 8px' : '0',
                        borderRadius: isReformaHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Reforma" value={effective.reforma || ''} onChange={(e) => handleOptionalChange('reforma', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="reforma" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isNotariaHighlighted ? '#fff9c4' : 'transparent',
                        padding: isNotariaHighlighted ? '4px 8px' : '0',
                        borderRadius: isNotariaHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Notaría" value={effective.notaria || ''} onChange={(e) => handleOptionalChange('notaria', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="notaria" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isRegistroHighlighted ? '#fff9c4' : 'transparent',
                        padding: isRegistroHighlighted ? '4px 8px' : '0',
                        borderRadius: isRegistroHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Registro" value={effective.registro || ''} onChange={(e) => handleOptionalChange('registro', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="registro" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isComisionHighlighted ? '#fff9c4' : 'transparent',
                        padding: isComisionHighlighted ? '4px 8px' : '0',
                        borderRadius: isComisionHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Comisión inmob." value={effective.comisionInmobiliaria || ''} onChange={(e) => handleOptionalChange('comisionInmobiliaria', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="comisionInmobiliaria" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isOtrosGastosHighlighted ? '#fff9c4' : 'transparent',
                        padding: isOtrosGastosHighlighted ? '4px 8px' : '0',
                        borderRadius: isOtrosGastosHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Otros gastos" value={effective.otrosGastosCompra || ''} onChange={(e) => handleOptionalChange('otrosGastosCompra', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ width: '100%' }} id="otrosGastosCompra" />
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Box>
            
            {/* Columna 2 - Impuestos */}
            {(() => {
              const codigoComunidad = card.currentInput.codigoComunidadAutonoma;
              const precioCompra = Number(card.currentInput.precioCompra) || 0;
              const porcentajeITP = codigoComunidad >= 1 && codigoComunidad <= 19 ? PORCENTAJES_ITP[codigoComunidad] : 0;
              const totalITP = calcularITP(precioCompra, codigoComunidad);
              const nombreComunidad = codigoComunidad >= 1 && codigoComunidad <= 19
                ? NOMBRE_COMUNIDAD_POR_CODIGO[codigoComunidad] || '—'
                : '—';
              
              return (
                <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Impuestos
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {totalITP > 0 ? formatEuro(String(totalITP)) : formatEuro('0')}
                    </Typography>
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2 } }}>
                    <TextField 
                      label="Comunidad autónoma" 
                      value={nombreComunidad} 
                      disabled 
                      size="small" 
                      sx={{ maxWidth: { xs: '100%', md: 150 }, width: '100%' }} 
                    />
                    <TextField 
                      label="% ITP" 
                      value={porcentajeITP > 0 ? `${porcentajeITP}%` : '—'} 
                      disabled 
                      size="small" 
                      sx={{ maxWidth: { xs: '100%', md: 150 }, width: '100%' }} 
                    />
                    {(() => {
                      const isTotalITPHighlighted = highlightedFields.includes('totalITP');
                      return (
                        <Box sx={{ 
                          backgroundColor: isTotalITPHighlighted ? '#fff9c4' : 'transparent',
                          padding: isTotalITPHighlighted ? '4px 8px' : '0',
                          borderRadius: isTotalITPHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField 
                            label="Total ITP" 
                            value={totalITP > 0 ? formatEuro(String(totalITP)) : '—'} 
                            disabled 
                            size="small" 
                            sx={{ maxWidth: { xs: '100%', md: 130 }, width: '100%' }} 
                            id="totalITP"
                          />
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              );
            })()}
            
            {/* Columna 3 - Gastos Financiación */}
            {(() => {
              // Obtener valores efectivos, asegurando que se muestren los defaults cuando hay hipoteca
              const tasacion = effective.tasacion ?? 0;
              const gestoriaBanco = effective.gestoriaBanco ?? 0;
              const seguroVidaHipoteca = effective.seguroVidaHipoteca ?? 0;
              const subtotalGastosFinanciacion = tasacion + gestoriaBanco + seguroVidaHipoteca;
              return (
                <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    G. Financiación
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {formatEuro(String(subtotalGastosFinanciacion))}
                    </Typography>
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2 } }}>
                    {(() => {
                      const isTasacionHighlighted = highlightedFields.includes('tasacion');
                      const isGestoriaHighlighted = highlightedFields.includes('gestoriaBanco');
                      const isSeguroVidaHighlighted = highlightedFields.includes('seguroVidaHipoteca');
                      return (
                        <>
                          <Box sx={{ 
                            backgroundColor: isTasacionHighlighted ? '#fff9c4' : 'transparent',
                            padding: isTasacionHighlighted ? '4px 8px' : '0',
                            borderRadius: isTasacionHighlighted ? '4px' : '0',
                            transition: 'background-color 0.2s ease, padding 0.2s ease',
                          }}>
                            <TextField 
                              type="number" 
                              label="Tasación" 
                              value={tasacion > 0 ? tasacion : ''} 
                              onChange={(e) => handleOptionalChange('tasacion', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ width: { xs: '100%', md: 130 }, minWidth: { xs: '100%', md: 130 }, maxWidth: { xs: '100%', md: 130 } }} 
                              id="tasacion"
                            />
                          </Box>
                          <Box sx={{ 
                            backgroundColor: isGestoriaHighlighted ? '#fff9c4' : 'transparent',
                            padding: isGestoriaHighlighted ? '4px 8px' : '0',
                            borderRadius: isGestoriaHighlighted ? '4px' : '0',
                            transition: 'background-color 0.2s ease, padding 0.2s ease',
                          }}>
                            <TextField 
                              type="number" 
                              label="Gestoría" 
                              value={gestoriaBanco > 0 ? gestoriaBanco : ''} 
                              onChange={(e) => handleOptionalChange('gestoriaBanco', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ width: { xs: '100%', md: 130 }, minWidth: { xs: '100%', md: 130 }, maxWidth: { xs: '100%', md: 130 } }} 
                              id="gestoriaBanco"
                            />
                          </Box>
                          <Box sx={{ 
                            backgroundColor: isSeguroVidaHighlighted ? '#fff9c4' : 'transparent',
                            padding: isSeguroVidaHighlighted ? '4px 8px' : '0',
                            borderRadius: isSeguroVidaHighlighted ? '4px' : '0',
                            transition: 'background-color 0.2s ease, padding 0.2s ease',
                          }}>
                            <TextField 
                              type="number" 
                              label="Seguro vida" 
                              value={seguroVidaHipoteca > 0 ? seguroVidaHipoteca : ''} 
                              onChange={(e) => handleOptionalChange('seguroVidaHipoteca', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ width: { xs: '100%', md: 130 }, minWidth: { xs: '100%', md: 130 }, maxWidth: { xs: '100%', md: 130 } }} 
                              id="seguroVidaHipoteca"
                            />
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              );
            })()}
              </Box>
            </Box>
            
            {/* Panel Beneficios */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, ml: { xs: 0, md: 1.5 }, mt: { xs: 1.5, md: 0 }, minWidth: { xs: '100%', md: 0 }, maxWidth: { xs: '100%', md: 'none' }, flex: { xs: '0 0 100%', md: '1 1 auto' }, flexShrink: 0 }}>
              {(() => {
                const isBeneficiosHighlighted = highlightedFields.includes('beneficioAntesImpuestos');
                return (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 2, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: isBeneficiosHighlighted ? '#fff9c4' : 'transparent', padding: isBeneficiosHighlighted ? '4px 8px' : '0', borderRadius: isBeneficiosHighlighted ? '4px' : '0', transition: 'background-color 0.2s ease, padding 0.2s ease' }}>
                    Beneficios
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {formatEuro(resultado.beneficioAntesImpuestos)}
                    </Typography>
                  </Typography>
                );
              })()}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, auto)' }, gap: 3 }}>
                {/* Panel Ingresos Anuales */}
                <Box>
                  {(() => {
                    const isIngresosAnualesHighlighted = highlightedFields.includes('ingresosAnuales');
                    return (
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: isIngresosAnualesHighlighted ? '#fff9c4' : 'transparent', padding: isIngresosAnualesHighlighted ? '4px 8px' : '0', borderRadius: isIngresosAnualesHighlighted ? '4px' : '0', transition: 'background-color 0.2s ease, padding 0.2s ease' }}>
                        Ingresos Anuales
                        <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                          {formatEuro(resultado.ingresosAnuales)}
                        </Typography>
                      </Typography>
                    );
                  })()}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2 } }}>
                    {(() => {
                      const isAlquilerMensualHighlighted = highlightedFields.includes('alquilerMensual');
                      return (
                        <Box sx={{ 
                          backgroundColor: isAlquilerMensualHighlighted ? '#fff9c4' : 'transparent',
                          padding: isAlquilerMensualHighlighted ? '4px 8px' : '0',
                          borderRadius: isAlquilerMensualHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField 
                            type="number" 
                            label="Alquiler mensual" 
                            value={card.currentInput.alquilerMensual || ''} 
                            disabled 
                            size="small" 
                            inputProps={{ min: 0 }} 
                            sx={{ maxWidth: 130 }} 
                            id="alquilerMensual"
                          />
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
                
                {/* Panel Gastos Anuales */}
                <Box>
                  <Tooltip title="Incluye los intereses de financiación" arrow>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'help' }}>
                      Gastos Anuales
                      <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                        {formatEuro(resultado.gastosAnuales)}
                      </Typography>
                    </Typography>
                  </Tooltip>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, rowGap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    const isComunidadHighlighted = highlightedFields.includes('comunidadAnual');
                    const isIbiHighlighted = highlightedFields.includes('ibi');
                    const isSeguroHogarHighlighted = highlightedFields.includes('seguroHogar');
                    const isSeguroImpagoHighlighted = highlightedFields.includes('seguroImpago');
                    const isBasuraHighlighted = highlightedFields.includes('basura');
                    return (
                      <>
                        <Box sx={{ 
                          backgroundColor: isComunidadHighlighted ? '#fff9c4' : 'transparent',
                          padding: isComunidadHighlighted ? '4px 8px' : '0',
                          borderRadius: isComunidadHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Comunidad" value={effective.comunidadAnual || ''} onChange={(e) => handleOptionalChange('comunidadAnual', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="comunidadAnual" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isIbiHighlighted ? '#fff9c4' : 'transparent',
                          padding: isIbiHighlighted ? '4px 8px' : '0',
                          borderRadius: isIbiHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="IBI" value={effective.ibi || ''} onChange={(e) => handleOptionalChange('ibi', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="ibi" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isSeguroHogarHighlighted ? '#fff9c4' : 'transparent',
                          padding: isSeguroHogarHighlighted ? '4px 8px' : '0',
                          borderRadius: isSeguroHogarHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Seguro hogar" value={effective.seguroHogar || ''} onChange={(e) => handleOptionalChange('seguroHogar', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="seguroHogar" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isSeguroImpagoHighlighted ? '#fff9c4' : 'transparent',
                          padding: isSeguroImpagoHighlighted ? '4px 8px' : '0',
                          borderRadius: isSeguroImpagoHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Seguro impago" value={effective.seguroImpago || ''} onChange={(e) => handleOptionalChange('seguroImpago', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="seguroImpago" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isBasuraHighlighted ? '#fff9c4' : 'transparent',
                          padding: isBasuraHighlighted ? '4px 8px' : '0',
                          borderRadius: isBasuraHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Basura" value={effective.basura || ''} onChange={(e) => handleOptionalChange('basura', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="basura" />
                        </Box>
                      </>
                    );
                  })()}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    const isAguaHighlighted = highlightedFields.includes('agua');
                    const isElectricidadHighlighted = highlightedFields.includes('electricidad');
                    const isGasHighlighted = highlightedFields.includes('gas');
                    const isInternetHighlighted = highlightedFields.includes('internet');
                    const isMantenimientoHighlighted = highlightedFields.includes('mantenimiento');
                    const isPeriodoSinAlquilarHighlighted = highlightedFields.includes('periodoSinAlquilar');
                    const ingresosAnuales = (Number(card.currentInput.alquilerMensual) || 0) * 12;
                    const mantenimientoDisplay = effective.mantenimiento > 0 ? effective.mantenimiento : Math.round(ingresosAnuales * 0.07);
                    const periodoSinAlquilarDisplay = effective.periodoSinAlquilar > 0 ? effective.periodoSinAlquilar : Math.round(ingresosAnuales * 0.03);
                    return (
                      <>
                        <Box sx={{ 
                          backgroundColor: isAguaHighlighted ? '#fff9c4' : 'transparent',
                          padding: isAguaHighlighted ? '4px 8px' : '0',
                          borderRadius: isAguaHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Agua" value={effective.agua || ''} onChange={(e) => handleOptionalChange('agua', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="agua" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isElectricidadHighlighted ? '#fff9c4' : 'transparent',
                          padding: isElectricidadHighlighted ? '4px 8px' : '0',
                          borderRadius: isElectricidadHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Electricidad" value={effective.electricidad || ''} onChange={(e) => handleOptionalChange('electricidad', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="electricidad" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isGasHighlighted ? '#fff9c4' : 'transparent',
                          padding: isGasHighlighted ? '4px 8px' : '0',
                          borderRadius: isGasHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Gas" value={effective.gas || ''} onChange={(e) => handleOptionalChange('gas', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="gas" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isInternetHighlighted ? '#fff9c4' : 'transparent',
                          padding: isInternetHighlighted ? '4px 8px' : '0',
                          borderRadius: isInternetHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Internet" value={effective.internet || ''} onChange={(e) => handleOptionalChange('internet', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="internet" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isMantenimientoHighlighted ? '#fff9c4' : 'transparent',
                          padding: isMantenimientoHighlighted ? '4px 8px' : '0',
                          borderRadius: isMantenimientoHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Mantenimiento" value={mantenimientoDisplay || ''} onChange={(e) => handleOptionalChange('mantenimiento', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="mantenimiento" />
                        </Box>
                        <Box sx={{ 
                          backgroundColor: isPeriodoSinAlquilarHighlighted ? '#fff9c4' : 'transparent',
                          padding: isPeriodoSinAlquilarHighlighted ? '4px 8px' : '0',
                          borderRadius: isPeriodoSinAlquilarHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField type="number" label="Periodo sin alquilar" value={periodoSinAlquilarDisplay || ''} onChange={(e) => handleOptionalChange('periodoSinAlquilar', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="periodoSinAlquilar" />
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              </Box>
            </Box>
              </Box>
            </Box>
            
            {/* Financiación y Rentabilidades - en la misma fila */}
            <Box sx={{ display: 'flex', gap: 1.5, ml: { xs: 0, md: 1.5 }, mt: { xs: 1.5, md: 0 }, alignItems: 'flex-start', flexShrink: 0, flexWrap: { xs: 'wrap', md: 'nowrap' }, minWidth: { xs: '100%', md: 0 }, maxWidth: { xs: '100%', md: 'none' }, flex: { xs: '0 0 100%', md: '1 1 auto' }, width: { xs: '100%', md: 'auto' }, overflow: 'visible' }}>
              {/* Financiación */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, minWidth: { xs: '100%', md: 0 }, maxWidth: { xs: '100%', md: 'none' }, flex: { xs: '0 0 100%', md: '1 1 auto' }, flexShrink: 0, width: { xs: '100%', md: 'auto' }, overflow: 'visible' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Financiación</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>
                <FormControlLabel
                  control={<Switch checked={effective.hayHipoteca} onChange={(_, v) => handleOptionalChange('hayHipoteca', v)} />}
                  label="Hay hipoteca"
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1fr' }, gap: { xs: 1.25, md: 2 }, columnGap: { xs: 0.5, md: 2 }, rowGap: { xs: 1.25, md: 2 } }}>
                  {(() => {
                    const isImporteHipotecaHighlighted = highlightedFields.includes('importeHipoteca');
                    const precioCompra = Number(card.currentInput.precioCompra) || 0;
                    const importeHipoteca = effective.importeHipoteca || 0;
                    const porcentajeHipoteca = precioCompra > 0 ? ((importeHipoteca / precioCompra) * 100).toFixed(1) : '0';
                    return (
                      <Box>
                        <Box sx={{ 
                          backgroundColor: isImporteHipotecaHighlighted ? '#fff9c4' : 'transparent',
                          padding: isImporteHipotecaHighlighted ? '4px 8px' : '0',
                          borderRadius: isImporteHipotecaHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField 
                            type="number" 
                            label="Importe hipoteca (€)"
                            value={effective.hayHipoteca ? (importeHipoteca || '') : 0} 
                            onChange={(e) => handleOptionalChange('importeHipoteca', Number(e.target.value) || 0)} 
                            disabled={!effective.hayHipoteca}
                            size="small" 
                            inputProps={{ min: 0 }} 
                            sx={{ width: '100%', maxWidth: { xs: '100%', md: 130 } }} 
                            id="importeHipoteca"
                          />
                        </Box>
                        {effective.hayHipoteca && importeHipoteca > 0 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                            {porcentajeHipoteca}% del precio de compra
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                  {(() => {
                    const isCapitalPropioHighlighted = highlightedFields.includes('capitalPropio');
                    const totalCompra = Number(resultado.totalCompra);
                    const capitalPropioCalculado = Math.max(0, totalCompra - (effective.importeHipoteca || 0));
                    // Usar resultado.capitalPropio de la API para que se actualice al cambiar precio de compra
                    const capitalPropioValue = Number(resultado.capitalPropio) || capitalPropioCalculado;
                    return (
                      <Box>
                        <Box sx={{ 
                          backgroundColor: isCapitalPropioHighlighted ? '#fff9c4' : 'transparent',
                          padding: isCapitalPropioHighlighted ? '4px 8px' : '0',
                          borderRadius: isCapitalPropioHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField 
                            type="number" 
                            label="Capital propio (€)"
                            value={effective.hayHipoteca ? (capitalPropioValue || '') : ''} 
                            onChange={(e) => handleOptionalChange('capitalPropio', Number(e.target.value) || 0)} 
                            disabled={!effective.hayHipoteca}
                            size="small" 
                            inputProps={{ min: 0 }} 
                            sx={{ width: '100%', maxWidth: { xs: '100%', md: 130 } }} 
                            id="capitalPropio"
                          />
                        </Box>
                      </Box>
                    );
                  })()}
                  {(() => {
                    const isTipoInteresHighlighted = highlightedFields.includes('tipoInteres');
                    const tipoInteresValue = effective.hayHipoteca ? (effective.tipoInteres ?? (localOverrides.tipoInteres ?? 0)) : 0;
                    const tipoInteresNum = typeof tipoInteresValue === 'number' ? tipoInteresValue : Number(tipoInteresValue) || 0;
                    return (
                      <Box sx={{ 
                        backgroundColor: isTipoInteresHighlighted ? '#fff9c4' : 'transparent',
                        padding: isTipoInteresHighlighted ? '4px 8px' : '0',
                        borderRadius: isTipoInteresHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField 
                          type="number" 
                          label="Tipo interés (% anual)" 
                          value={effective.hayHipoteca && tipoInteresNum > 0 ? tipoInteresNum : ''} 
                          onChange={(e) => handleOptionalChange('tipoInteres', Number(e.target.value) || 0)} 
                          disabled={!effective.hayHipoteca}
                          size="small" 
                          inputProps={{ min: 0, step: 0.1 }} 
                          sx={{ width: '100%', maxWidth: { xs: '100%', md: 130 } }} 
                          id="tipoInteres"
                        />
                      </Box>
                    );
                  })()}
                  {(() => {
                    const isPlazoHipotecaHighlighted = highlightedFields.includes('plazoHipoteca');
                    const plazoHipotecaValue = effective.hayHipoteca ? (effective.plazoHipoteca ?? (localOverrides.plazoHipoteca ?? 0)) : 0;
                    const plazoHipotecaNum = typeof plazoHipotecaValue === 'number' ? plazoHipotecaValue : Number(plazoHipotecaValue) || 0;
                    return (
                      <Box sx={{ 
                        backgroundColor: isPlazoHipotecaHighlighted ? '#fff9c4' : 'transparent',
                        padding: isPlazoHipotecaHighlighted ? '4px 8px' : '0',
                        borderRadius: isPlazoHipotecaHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField 
                          type="number" 
                          label="Plazo (años)" 
                          value={effective.hayHipoteca && plazoHipotecaNum > 0 ? plazoHipotecaNum : ''} 
                          onChange={(e) => handleOptionalChange('plazoHipoteca', Number(e.target.value) || 0)} 
                          disabled={!effective.hayHipoteca}
                          size="small" 
                          inputProps={{ min: 0 }} 
                          sx={{ width: '100%', maxWidth: { xs: '100%', md: 130 } }} 
                          id="plazoHipoteca"
                        />
                      </Box>
                    );
                  })()}
                </Box>
                {effective.hayHipoteca && effective.importeHipoteca > 0 && effective.tipoInteres > 0 && effective.plazoHipoteca > 0 && (() => {
                  const datosHipoteca = calcularDatosHipoteca(
                    effective.importeHipoteca,
                    effective.tipoInteres,
                    effective.plazoHipoteca
                  );
                  const totalOperacionConIntereses = Number(resultado.totalCompra) + datosHipoteca.interesesTotales;
                  const isCapitalAmortizadoHighlighted = highlightedFields.includes('capitalAmortizadoAnual');
                  return (
                    <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1, overflow: 'visible', width: '100%' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Datos calculados de la hipoteca:</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(min-content, max-content)', sm: '1fr auto' }, gap: { xs: '4px 8px', sm: '4px 16px' }, width: '100%', overflow: 'visible' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Cuota mensual:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}>{formatEuro(String(datosHipoteca.cuotaMensual))}</Typography>
                        <Box sx={{ 
                          gridColumn: '1 / -1',
                          backgroundColor: isCapitalAmortizadoHighlighted ? '#fff9c4' : 'transparent',
                          padding: isCapitalAmortizadoHighlighted ? '4px 8px' : '0',
                          borderRadius: isCapitalAmortizadoHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                          display: 'grid',
                          gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(min-content, max-content)', sm: '1fr auto' },
                          gap: { xs: '4px 8px', sm: '4px 16px' },
                        }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: isCapitalAmortizadoHighlighted ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Capital amortizado (año):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }} id="capitalAmortizadoAnual">{formatEuro(String(datosHipoteca.capitalAmortizadoPrimerAnio))}</Typography>
                        </Box>
                        {(() => {
                          const isInteresesPrimerAnioHighlighted = highlightedFields.includes('interesesPrimerAnio');
                          return (
                            <>
                              <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, backgroundColor: isInteresesPrimerAnioHighlighted ? '#fff9c4' : 'transparent', padding: isInteresesPrimerAnioHighlighted ? '4px 8px' : '0', borderRadius: isInteresesPrimerAnioHighlighted ? '4px' : '0', transition: 'background-color 0.2s ease, padding 0.2s ease' }}>Intereses primer año:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content', backgroundColor: isInteresesPrimerAnioHighlighted ? '#fff9c4' : 'transparent', padding: isInteresesPrimerAnioHighlighted ? '4px 8px' : '0', borderRadius: isInteresesPrimerAnioHighlighted ? '4px' : '0', transition: 'background-color 0.2s ease, padding 0.2s ease' }}>{formatEuro(String(datosHipoteca.interesesPrimerAnio))}</Typography>
                            </>
                          );
                        })()}
                        <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Intereses totales:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}>{formatEuro(String(datosHipoteca.interesesTotales))}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Total a devolver:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}>{formatEuro(String(datosHipoteca.totalADevolver))}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Total operación con intereses:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}>{formatEuro(String(totalOperacionConIntereses))}</Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>
              </Box>
              
              {/* Panel Rentabilidades - misma topografía y separaciones que Datos calculados de la hipoteca */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, minWidth: { xs: '100%', md: 0 }, maxWidth: { xs: '100%', md: 'none' }, flex: { xs: '0 0 100%', md: '1 1 auto' }, flexShrink: 0, width: { xs: '100%', md: 'auto' }, overflow: 'visible' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>Rentabilidades</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(min-content, max-content)', sm: '1fr auto' }, gap: { xs: '4px 8px', sm: '4px 16px' }, width: '100%', overflow: 'visible' }}>
                {[
                  { id: 'rentabilidadBruta', label: 'Rentabilidad bruta', value: formatPercent(resultado.rentabilidadBruta) },
                  { id: 'rentabilidadNeta', label: 'Rentabilidad neta', value: formatPercent(resultado.rentabilidadNeta) },
                  { id: 'cashflowAntesAmortizar', label: 'Cashflow antes de amortizar deuda', value: formatEuro(resultado.cashflowAntesAmortizar) },
                  { id: 'cashflowFinal', label: 'Cashflow final', value: formatEuro(resultado.cashflowFinal) },
                  { id: 'roceAntes', label: 'ROCE antes de amortizar deuda', value: formatPercent(resultado.roceAntes) },
                  { id: 'roceFinal', label: 'ROCE final', value: formatPercent(resultado.roceFinal) },
                ].map(({ id, label, value }) => {
                  const isHighlighted = highlightedFields.includes(id);
                  return (
                    <Fragment key={id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          minWidth: 0,
                          overflow: 'hidden',
                          backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                          padding: isHighlighted ? '4px 8px' : '0',
                          borderRadius: isHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.preventDefault();
                            setDefinicionAbierta((k) => (k === id ? null : id));
                          }}
                          aria-label="Ver definición"
                          sx={{ ml: 0.5, p: 0.25, color: '#666', flexShrink: 0 }}
                        >
                          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          color: 'primary.main',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted',
                          textDecorationColor: 'primary.main',
                          backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                          padding: isHighlighted ? '4px 8px' : '0',
                          borderRadius: isHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                          '&:hover': {
                            color: 'primary.dark',
                            textDecorationColor: 'primary.dark',
                          },
                        }}
                        onClick={() => setDesgloseAbierto((k) => (k === id ? null : id))}
                      >
                        {value}
                      </Typography>
                    </Fragment>
                  );
                })}
                </Box>
              </Box>
            </Box>
          </Box>
        </section>
      )}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: { xs: 'flex-start', md: 'space-between' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 1.5, md: 2 }, mt: 'auto', mb: 0, pt: 2 }}>
        {editable && (
          <Typography variant="caption" sx={{ color: 'text.secondary', flex: { xs: 'none', md: 1 }, textAlign: { xs: 'left', md: 'left' } }}>
            Valores orientativos basados en medias habituales en España. Puedes modificarlos.
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {card.url && (
            <a 
              href={card.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#1976d2', 
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Ver anuncio ↗
            </a>
          )}
          {hasOverrides && onRestoreDefaults && (
            <Button startIcon={<RestoreIcon />} onClick={onRestoreDefaults} size="small" variant="outlined" sx={{ whiteSpace: 'nowrap' }}>
              Restaurar valores por defecto
            </Button>
          )}
        </Box>
      </Box>

      {/* Popover emergente: por encima del contenido, sin desplazar */}
      {definicionAbierta && (
        <div
          role="dialog"
          aria-label="Definición"
          className="detalle-popover-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
          onClick={() => setDefinicionAbierta(null)}
        >
          <div
            className="detalle-popover-content"
            style={{
              maxWidth: 360,
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '14px 18px',
              fontSize: 13,
              lineHeight: 1.45,
              backgroundColor: '#fff',
              borderRadius: 8,
              color: '#333',
              border: '1px solid #e0e0e0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: 0 }}>{DEFINICIONES_METRICAS[definicionAbierta]}</p>
            <button
              type="button"
              onClick={() => setDefinicionAbierta(null)}
              className="detalle-popover-btn no-focus-outline"
              style={{
                marginTop: 12,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: 4,
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Popover emergente: desglose del cálculo con números */}
      {desgloseAbierto && (() => {
        const { title, lines } = getDesgloseCalculo(desgloseAbierto, resultado, card);
        return (
          <div
            role="dialog"
            aria-label="Desglose del cálculo"
            className="detalle-popover-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
            onClick={() => setDesgloseAbierto(null)}
          >
            <div
              className="detalle-popover-content"
              style={{
                maxWidth: 400,
                maxHeight: '80vh',
                overflow: 'auto',
                padding: '14px 18px',
                fontSize: 13,
                lineHeight: 1.5,
                backgroundColor: '#fff',
                borderRadius: 8,
                color: '#333',
                border: '1px solid #e0e0e0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontWeight: 600, marginBottom: 10 }}>{title}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {lines.map((line, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDesgloseAbierto(null)}
                className="detalle-popover-btn no-focus-outline"
                style={{
                  marginTop: 12,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}

// Memoizar componente pesado para evitar re-renders innecesarios
export const DetalleAnalisis = memo(DetalleAnalisisComponent);
