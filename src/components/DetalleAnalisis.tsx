import { Fragment, useState, memo, useCallback, useRef, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
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
 * Tabla de porcentajes de ITP por comunidad autónoma.
 * Basado en la legislación vigente y en códigos oficiales del INE.
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
 * Calcula el ITP (Impuesto de Transmisiones Patrimoniales).
 * ITP a pagar = %ITP(comunidad) × precioCompra
 */
function calcularITP(precioCompra: number, codigoComunidadAutonoma: number): number {
  const porcentajeITP = PORCENTAJES_ITP[codigoComunidadAutonoma];
  if (!porcentajeITP) {
    return 0;
  }
  return (porcentajeITP / 100) * precioCompra;
}

/**
 * Calcula los datos de la hipoteca usando la misma lógica del engine.
 * Fórmula PMT: PMT = PV × (r × (1 + r)^n) / ((1 + r)^n - 1)
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
  // Tasa de interés mensual
  const tasaMensual = tipoInteres / 100 / 12;
  
  // Número de períodos (meses)
  const numPeriodos = plazoHipoteca * 12;
  
  // (1 + r)^n
  const unoMasTasa = 1 + tasaMensual;
  const unoMasTasaElevadoN = Math.pow(unoMasTasa, numPeriodos);
  
  // r × (1 + r)^n
  const numerador = tasaMensual * unoMasTasaElevadoN;
  
  // (1 + r)^n - 1
  const denominador = unoMasTasaElevadoN - 1;
  
  // PMT = PV × (numerador / denominador)
  const cuotaMensual = importeHipoteca * (numerador / denominador);
  
  // Simular mes a mes durante 12 meses para calcular intereses y capital del primer año
  let saldoPendiente = importeHipoteca;
  let interesesPrimerAnio = 0;
  let capitalAmortizadoPrimerAnio = 0;
  
  for (let mes = 1; mes <= 12; mes++) {
    // Interés del mes = saldo pendiente × tasa mensual
    const interesMes = saldoPendiente * tasaMensual;
    
    // Amortización del mes = cuota mensual - interés del mes
    const amortizacionMes = cuotaMensual - interesMes;
    
    // Actualizar saldo pendiente
    saldoPendiente -= amortizacionMes;
    
    // Acumular para el primer año
    interesesPrimerAnio += interesMes;
    capitalAmortizadoPrimerAnio += amortizacionMes;
  }
  
  // Total a devolver = número de cuotas × cuota mensual
  const totalADevolver = cuotaMensual * numPeriodos;
  
  // Intereses totales = total a devolver - importe de la hipoteca
  const interesesTotales = totalADevolver - importeHipoteca;
  
  return {
    cuotaMensual,
    interesesPrimerAnio,
    capitalAmortizadoPrimerAnio,
    totalADevolver,
    interesesTotales,
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
      const totalCompra = Number(resultado.totalCompra);
      const capitalPropio = Number(resultado.capitalPropio);
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
      const totalCalculado = gastosFijos + mantenimiento + periodoSinAlquilar + interesesFinanciacion;
      
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

function InfoIcon({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      size="small"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label="Ver definición"
      sx={{ ml: 0.5, p: 0.25, color: '#666', verticalAlign: 'middle' }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );
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
      return ['ingresosAnuales', 'totalCompra'];
    case 'rentabilidadNeta':
      return ['beneficioAntesImpuestos', 'totalCompra'];
    case 'cashflowAntesAmortizar':
      return ['beneficioAntesImpuestos'];
    case 'cashflowFinal':
      return ['beneficioAntesImpuestos', 'capitalAmortizadoAnual'];
    case 'roceAntes':
      return ['beneficioAntesImpuestos', 'capitalPropio'];
    case 'roceFinal':
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

  const handleOptionalChange = useCallback(
    (field: keyof MotorInputOptionals, value: number | boolean) => {
      if (!onOverrideChange) return;
      const prev = localOverridesRef.current;
      const updates: Partial<MotorInputOptionals> = { [field]: value };
      
      if (field === 'hayHipoteca' && value === true) {
        const precioCompra = Number(card.currentInput.precioCompra) || 0;
        const currentImporte = prev.importeHipoteca ?? getEffectiveOptionals({ ...card, overrides: prev }).importeHipoteca;
        if (precioCompra > 0 && (!currentImporte || currentImporte === 0)) {
          updates.importeHipoteca = Math.round(precioCompra * 0.8);
        }
      }
      if (field === 'hayHipoteca' && value === false) {
        updates.importeHipoteca = 0;
        updates.tipoInteres = 0;
        updates.plazoHipoteca = 0;
      }
      
      const nextOverrides = { ...prev, ...updates };
      localOverridesRef.current = nextOverrides;
      setLocalOverrides(nextOverrides);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onOverrideChange(localOverridesRef.current);
      }, 500);
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
      }}
    >
      <div className={isHorizontalLayout ? 'detalle-secciones-container' : ''}>
        <div className={isHorizontalLayout ? 'detalle-secciones-fila' : ''}>
        <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Datos básicos</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: isHorizontalLayout ? '6px 8px' : '6px 16px', fontSize: 14 }}>
          <dt style={{ fontWeight: 500 }}>Comunidad autónoma</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>
            {card.currentInput.codigoComunidadAutonoma >= 1 && card.currentInput.codigoComunidadAutonoma <= 19
              ? NOMBRE_COMUNIDAD_POR_CODIGO[card.currentInput.codigoComunidadAutonoma] || '—'
              : '—'}
          </dd>
          <dt style={{ fontWeight: 500 }}>Ciudad</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{card.ciudad || '—'}</dd>
          <dt style={{ fontWeight: 500 }}>Habitaciones</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{card.habitaciones > 0 ? card.habitaciones : '—'}</dd>
          <dt style={{ fontWeight: 500 }}>Metros cuadrados</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{card.metrosCuadrados > 0 ? `${card.metrosCuadrados} m²` : '—'}</dd>
          <dt style={{ fontWeight: 500 }}>Baños</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{card.banos > 0 ? card.banos : '—'}</dd>
          <dt style={{ fontWeight: 500 }}>Precio compra</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>
            {formatEuro(String(card.currentInput.precioCompra))}
          </dd>
          <dt style={{ 
            fontWeight: 500,
            backgroundColor: highlightedFields.includes('alquilerMensual') ? '#fff9c4' : 'transparent',
            padding: highlightedFields.includes('alquilerMensual') ? '4px 8px' : '0',
            borderRadius: highlightedFields.includes('alquilerMensual') ? '4px' : '0',
            transition: 'background-color 0.2s ease, padding 0.2s ease',
          }}>
            Alquiler mensual
          </dt>
          <dd style={{ 
            margin: 0, 
            textAlign: 'right',
            backgroundColor: highlightedFields.includes('alquilerMensual') ? '#fff9c4' : 'transparent',
            padding: highlightedFields.includes('alquilerMensual') ? '4px 8px' : '0',
            borderRadius: highlightedFields.includes('alquilerMensual') ? '4px' : '0',
            transition: 'background-color 0.2s ease, padding 0.2s ease',
          }}>
            {formatEuro(String(card.currentInput.alquilerMensual))}
          </dd>
        </dl>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            label={card.veredictoTitulo}
            size="small"
            color={card.estado === 'verde' ? 'success' : card.estado === 'amarillo' ? 'warning' : 'error'}
            sx={{ fontWeight: 500, fontSize: '0.75rem' }}
          />
          {card.url && (
            <a 
              href={card.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#1976d2', 
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Ver anuncio ↗
            </a>
          )}
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Métricas clave</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: isHorizontalLayout ? '6px 8px' : '6px 16px', fontSize: 14 }}>
          {[
            { id: 'totalCompra', label: 'Total compra', value: formatEuro(resultado.totalCompra) },
            { id: 'capitalPropio', label: 'Capital propio', value: formatEuro(resultado.capitalPropio) },
            { id: 'ingresosAnuales', label: 'Ingresos anuales', value: formatEuro(resultado.ingresosAnuales) },
            { id: 'gastosAnuales', label: 'Gastos anuales', value: formatEuro(resultado.gastosAnuales) },
            { id: 'beneficioAntesImpuestos', label: 'Beneficio antes de impuestos', value: formatEuro(resultado.beneficioAntesImpuestos) },
          ].map(({ id, label, value }) => {
            const isHighlighted = highlightedFields.includes(id);
            return (
              <Fragment key={id}>
                <dt style={{ 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                  padding: isHighlighted ? '4px 8px' : '0',
                  borderRadius: isHighlighted ? '4px' : '0',
                  transition: 'background-color 0.2s ease, padding 0.2s ease',
                }}>
                  {label}
                  <InfoIcon onClick={() => setDefinicionAbierta((k) => (k === id ? null : id))} />
                </dt>
                <dd style={{ 
                  margin: 0, 
                  textAlign: 'right',
                  backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                  padding: isHighlighted ? '4px 8px' : '0',
                  borderRadius: isHighlighted ? '4px' : '0',
                  transition: 'background-color 0.2s ease, padding 0.2s ease',
                }}>
                  <Tooltip title="Pulsa para ver la fórmula" placement="left">
                    <button
                      type="button"
                      className="detalle-valor-clickable"
                      onClick={() => setDesgloseAbierto((k) => (k === id ? null : id))}
                      aria-label="Ver fórmula del cálculo"
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      {value}
                    </button>
                  </Tooltip>
                </dd>
              </Fragment>
            );
          })}
        </dl>
      </section>

      <section>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Rentabilidades</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: isHorizontalLayout ? '6px 8px' : '6px 16px', fontSize: 14 }}>
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
                <dt style={{ 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                  padding: isHighlighted ? '4px 8px' : '0',
                  borderRadius: isHighlighted ? '4px' : '0',
                  transition: 'background-color 0.2s ease, padding 0.2s ease',
                }}>
                  {label}
                  <InfoIcon onClick={() => setDefinicionAbierta((k) => (k === id ? null : id))} />
                </dt>
                <dd style={{ 
                  margin: 0, 
                  textAlign: 'right',
                  backgroundColor: isHighlighted ? '#fff9c4' : 'transparent',
                  padding: isHighlighted ? '4px 8px' : '0',
                  borderRadius: isHighlighted ? '4px' : '0',
                  transition: 'background-color 0.2s ease, padding 0.2s ease',
                }}>
                  <Tooltip title="Pulsa para ver la fórmula" placement="left">
                    <button
                      type="button"
                      className="detalle-valor-clickable"
                      onClick={() => setDesgloseAbierto((k) => (k === id ? null : id))}
                      aria-label="Ver fórmula del cálculo"
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      {value}
                    </button>
                  </Tooltip>
                </dd>
              </Fragment>
            );
          })}
        </dl>
      </section>

        </div>

      {/* Panel Gastos y Financiación: fila completa debajo (solo si editable) */}
      {editable && (
        <section className="detalle-gastos-full" style={{ marginBottom: 20 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, auto)' }, gap: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            {/* Columna 1 - Inmueble */}
            <Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                        <TextField type="number" label="Precio compra" value={card.currentInput.precioCompra || ''} disabled size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="precioCompra" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isReformaHighlighted ? '#fff9c4' : 'transparent',
                        padding: isReformaHighlighted ? '4px 8px' : '0',
                        borderRadius: isReformaHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Reforma" value={effective.reforma || ''} onChange={(e) => handleOptionalChange('reforma', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="reforma" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isNotariaHighlighted ? '#fff9c4' : 'transparent',
                        padding: isNotariaHighlighted ? '4px 8px' : '0',
                        borderRadius: isNotariaHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Notaría" value={effective.notaria || ''} onChange={(e) => handleOptionalChange('notaria', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="notaria" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isRegistroHighlighted ? '#fff9c4' : 'transparent',
                        padding: isRegistroHighlighted ? '4px 8px' : '0',
                        borderRadius: isRegistroHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Registro" value={effective.registro || ''} onChange={(e) => handleOptionalChange('registro', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="registro" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isComisionHighlighted ? '#fff9c4' : 'transparent',
                        padding: isComisionHighlighted ? '4px 8px' : '0',
                        borderRadius: isComisionHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Comisión inmob." value={effective.comisionInmobiliaria || ''} onChange={(e) => handleOptionalChange('comisionInmobiliaria', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="comisionInmobiliaria" />
                      </Box>
                      <Box sx={{ 
                        backgroundColor: isOtrosGastosHighlighted ? '#fff9c4' : 'transparent',
                        padding: isOtrosGastosHighlighted ? '4px 8px' : '0',
                        borderRadius: isOtrosGastosHighlighted ? '4px' : '0',
                        transition: 'background-color 0.2s ease, padding 0.2s ease',
                      }}>
                        <TextField type="number" label="Otros gastos" value={effective.otrosGastosCompra || ''} onChange={(e) => handleOptionalChange('otrosGastosCompra', Number(e.target.value) || 0)} size="small" inputProps={{ min: 0 }} sx={{ maxWidth: 150 }} id="otrosGastosCompra" />
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
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Impuestos
                    <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                      {totalITP > 0 ? formatEuro(String(totalITP)) : formatEuro('0')}
                    </Typography>
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField 
                      label="Comunidad autónoma" 
                      value={nombreComunidad} 
                      disabled 
                      size="small" 
                      sx={{ maxWidth: 150 }} 
                    />
                    <TextField 
                      label="% ITP" 
                      value={porcentajeITP > 0 ? `${porcentajeITP}%` : '—'} 
                      disabled 
                      size="small" 
                      sx={{ maxWidth: 150 }} 
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
                            sx={{ maxWidth: 150 }} 
                            id="totalITP"
                          />
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              );
            })()}
            
            {/* Columna 3 - Gastos Anuales */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                Gastos Anuales
                <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                  {formatEuro(resultado.gastosAnuales)}
                </Typography>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
            
            {/* Financiación - separado de Gastos */}
            <Box sx={{ ml: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Financiación</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <FormControlLabel
                  control={<Switch checked={effective.hayHipoteca} onChange={(_, v) => handleOptionalChange('hayHipoteca', v)} />}
                  label="Hay hipoteca"
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, alignItems: 'start' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(() => {
                      const tasacion = effective.tasacion || 0;
                      const gestoriaBanco = effective.gestoriaBanco || 0;
                      const seguroVidaHipoteca = effective.seguroVidaHipoteca || 0;
                      const subtotalGastosFinanciacion = tasacion + gestoriaBanco + seguroVidaHipoteca;
                      return (
                        <Box sx={{ mb: 0.5, minHeight: 40, display: 'flex', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'transparent', display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            Gastos Financiación
                            <Typography component="span" sx={{ fontWeight: 600, ml: 'auto' }}>
                              {formatEuro(String(subtotalGastosFinanciacion))}
                            </Typography>
                          </Typography>
                        </Box>
                      );
                    })()}
                    {(() => {
                      const isImporteHipotecaHighlighted = highlightedFields.includes('importeHipoteca');
                      return (
                        <Box sx={{ 
                          backgroundColor: isImporteHipotecaHighlighted ? '#fff9c4' : 'transparent',
                          padding: isImporteHipotecaHighlighted ? '4px 8px' : '0',
                          borderRadius: isImporteHipotecaHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                        }}>
                          <TextField 
                            type="number" 
                            label="Importe hipoteca (€)" 
                            value={effective.hayHipoteca ? (effective.importeHipoteca || '') : 0} 
                            onChange={(e) => handleOptionalChange('importeHipoteca', Number(e.target.value) || 0)} 
                            disabled={!effective.hayHipoteca}
                            size="small" 
                            inputProps={{ min: 0 }} 
                            sx={{ maxWidth: 150 }} 
                            id="importeHipoteca"
                          />
                        </Box>
                      );
                    })()}
                    <TextField 
                      type="number" 
                      label="Tipo interés (% anual)" 
                      value={effective.hayHipoteca ? (effective.tipoInteres || '') : 0} 
                      onChange={(e) => handleOptionalChange('tipoInteres', Number(e.target.value) || 0)} 
                      disabled={!effective.hayHipoteca}
                      size="small" 
                      inputProps={{ min: 0, step: 0.1 }} 
                      sx={{ maxWidth: 150 }} 
                    />
                    <TextField 
                      type="number" 
                      label="Plazo (años)" 
                      value={effective.hayHipoteca ? (effective.plazoHipoteca || '') : 0} 
                      onChange={(e) => handleOptionalChange('plazoHipoteca', Number(e.target.value) || 0)} 
                      disabled={!effective.hayHipoteca}
                      size="small" 
                      inputProps={{ min: 0 }} 
                      sx={{ maxWidth: 150 }} 
                    />
                  </Box>
                  
                  {/* Gastos Financiación - a la derecha */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(() => {
                      const tasacion = effective.tasacion || 0;
                      const gestoriaBanco = effective.gestoriaBanco || 0;
                      const seguroVidaHipoteca = effective.seguroVidaHipoteca || 0;
                      const subtotalGastosFinanciacion = tasacion + gestoriaBanco + seguroVidaHipoteca;
                      return (
                        <Box sx={{ mb: 0.5, minHeight: 40, display: 'flex', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            Gastos Financiación
                            <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 'auto' }}>
                              {formatEuro(String(subtotalGastosFinanciacion))}
                            </Typography>
                          </Typography>
                        </Box>
                      );
                    })()}
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
                              value={effective.tasacion || ''} 
                              onChange={(e) => handleOptionalChange('tasacion', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ maxWidth: 150 }} 
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
                              value={effective.gestoriaBanco || ''} 
                              onChange={(e) => handleOptionalChange('gestoriaBanco', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ maxWidth: 150 }} 
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
                              value={effective.seguroVidaHipoteca || ''} 
                              onChange={(e) => handleOptionalChange('seguroVidaHipoteca', Number(e.target.value) || 0)} 
                              size="small" 
                              inputProps={{ min: 0 }} 
                              sx={{ maxWidth: 150 }} 
                              id="seguroVidaHipoteca"
                            />
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
              </Box>
                {effective.hayHipoteca && effective.importeHipoteca > 0 && effective.tipoInteres > 0 && effective.plazoHipoteca > 0 && (() => {
                  const datosHipoteca = calcularDatosHipoteca(
                    effective.importeHipoteca,
                    effective.tipoInteres,
                    effective.plazoHipoteca
                  );
                  const isCapitalAmortizadoHighlighted = highlightedFields.includes('capitalAmortizadoAnual');
                  return (
                    <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Datos calculados de la hipoteca:</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px', fontSize: 13 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cuota mensual:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{formatEuro(String(datosHipoteca.cuotaMensual))}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total a devolver:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{formatEuro(String(datosHipoteca.totalADevolver))}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Intereses totales:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{formatEuro(String(datosHipoteca.interesesTotales))}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Intereses primer año:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{formatEuro(String(datosHipoteca.interesesPrimerAnio))}</Typography>
                        <Box sx={{ 
                          gridColumn: '1 / -1',
                          backgroundColor: isCapitalAmortizadoHighlighted ? '#fff9c4' : 'transparent',
                          padding: isCapitalAmortizadoHighlighted ? '4px 8px' : '0',
                          borderRadius: isCapitalAmortizadoHighlighted ? '4px' : '0',
                          transition: 'background-color 0.2s ease, padding 0.2s ease',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: '4px 16px',
                        }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: isCapitalAmortizadoHighlighted ? 600 : 400 }}>Capital amortizado (año):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }} id="capitalAmortizadoAnual">{formatEuro(String(datosHipoteca.capitalAmortizadoPrimerAnio))}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>
            </Box>
          </Box>
        </section>
      )}
      {editable && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          Valores orientativos basados en medias habituales en España. Puedes modificarlos.
        </Typography>
      )}
      {hasOverrides && onRestoreDefaults && (
        <Button startIcon={<RestoreIcon />} onClick={onRestoreDefaults} size="small" sx={{ mt: 1, mb: 2 }} variant="outlined">
          Restaurar valores por defecto
        </Button>
      )}
      </div>

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
