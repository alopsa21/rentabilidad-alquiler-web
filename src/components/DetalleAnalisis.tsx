import { Fragment, useState, memo } from 'react';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import { NOMBRE_COMUNIDAD_POR_CODIGO } from '../constants/comunidades';

/** Definiciones de métricas según contrato_del_motor_v1.md */
const DEFINICIONES_METRICAS: Record<string, string> = {
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
    case 'ingresosAnuales':
      const alquilerMensual = card ? card.currentInput.alquilerMensual : 0;
      return {
        title: 'Ingresos anuales',
        lines: [
          `Fórmula: Alquiler mensual × 12`,
          `${formatEuro(String(alquilerMensual))} × 12 = ${formatEuro(resultado.ingresosAnuales)}`,
        ],
      };
    case 'gastosAnuales':
      // Los gastos anuales incluyen múltiples componentes, mostramos la fórmula general
      return {
        title: 'Gastos anuales',
        lines: [
          `Fórmula: Suma de todos los gastos anuales`,
          `Incluye: comunidad, IBI, seguros, mantenimiento (7%), periodo sin alquilar (3%), servicios e intereses`,
          `Total: ${formatEuro(resultado.gastosAnuales)}`,
        ],
      };
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

function DetalleAnalisisComponent({ card, resultado, isHorizontalLayout = false }: DetalleAnalisisProps) {
  const [definicionAbierta, setDefinicionAbierta] = useState<string | null>(null);
  const [desgloseAbierto, setDesgloseAbierto] = useState<string | null>(null);

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
          <dt style={{ fontWeight: 500 }}>Precio compra</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>
            {formatEuro(String(card.currentInput.precioCompra))}
          </dd>
          <dt style={{ fontWeight: 500 }}>Alquiler mensual</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>
            {formatEuro(String(card.currentInput.alquilerMensual))}
          </dd>
        </dl>
        <div style={{ marginTop: 12 }}>
          <Chip
            label={card.veredictoTitulo}
            size="small"
            color={card.estado === 'verde' ? 'success' : card.estado === 'amarillo' ? 'warning' : 'error'}
            sx={{ fontWeight: 500, fontSize: '0.75rem' }}
          />
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Métricas clave</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: isHorizontalLayout ? '6px 8px' : '6px 16px', fontSize: 14 }}>
          {[
            { id: 'ingresosAnuales', label: 'Ingresos anuales', value: formatEuro(resultado.ingresosAnuales) },
            { id: 'gastosAnuales', label: 'Gastos anuales', value: formatEuro(resultado.gastosAnuales) },
            { id: 'beneficioAntesImpuestos', label: 'Beneficio antes de impuestos', value: formatEuro(resultado.beneficioAntesImpuestos) },
          ].map(({ id, label, value }) => (
            <Fragment key={id}>
              <dt style={{ fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                {label}
                <InfoIcon onClick={() => setDefinicionAbierta((k) => (k === id ? null : id))} />
              </dt>
              <dd style={{ margin: 0, textAlign: 'right' }}>
                <button
                  type="button"
                  className="detalle-valor-clickable"
                  onClick={() => setDesgloseAbierto((k) => (k === id ? null : id))}
                  aria-label="Ver desglose del cálculo"
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
              </dd>
            </Fragment>
          ))}
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
          ].map(({ id, label, value }) => (
            <Fragment key={id}>
              <dt style={{ fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                {label}
                <InfoIcon onClick={() => setDefinicionAbierta((k) => (k === id ? null : id))} />
              </dt>
              <dd style={{ margin: 0, textAlign: 'right' }}>
                <button
                  type="button"
                  className="detalle-valor-clickable"
                  onClick={() => setDesgloseAbierto((k) => (k === id ? null : id))}
                  aria-label="Ver desglose del cálculo"
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
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>
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
