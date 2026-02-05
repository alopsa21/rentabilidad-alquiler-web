import { Fragment, useState } from 'react';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

/** Definiciones de métricas según contrato_del_motor_v1.md */
const DEFINICIONES_RENTABILIDAD: Record<string, string> = {
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
  resultado: RentabilidadApiResponse
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
}

const iconBtnStyle = {
  marginLeft: 6,
  padding: 0,
  border: 'none' as const,
  background: 'none',
  cursor: 'pointer' as const,
  color: '#666',
  fontSize: 14,
  lineHeight: 1,
  verticalAlign: 'middle' as const,
};

function InfoIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label="Ver definición"
      style={iconBtnStyle}
    >
      ⓘ
    </button>
  );
}

export function DetalleAnalisis({ card, resultado }: DetalleAnalisisProps) {
  const [definicionAbierta, setDefinicionAbierta] = useState<string | null>(null);
  const [desgloseAbierto, setDesgloseAbierto] = useState<string | null>(null);

  return (
    <aside
      className="detalle-analisis"
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 20,
        backgroundColor: '#fff',
        position: 'sticky',
        top: 80,
      }}
    >

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Datos básicos</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', fontSize: 14 }}>
          <dt style={{ fontWeight: 500 }}>Ubicación</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{card.ubicacion || '—'}</dd>
          <dt style={{ fontWeight: 500 }}>Precio</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(String(card.precioCompra))}</dd>
          <dt style={{ fontWeight: 500 }}>Alquiler mensual</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(String(card.alquilerEstimado))}</dd>
        </dl>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Métricas clave</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', fontSize: 14 }}>
          <dt style={{ fontWeight: 500 }}>Ingresos anuales</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(resultado.ingresosAnuales)}</dd>
          <dt style={{ fontWeight: 500 }}>Gastos anuales</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(resultado.gastosAnuales)}</dd>
          <dt style={{ fontWeight: 500 }}>Beneficio antes de impuestos</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(resultado.beneficioAntesImpuestos)}</dd>
        </dl>
      </section>

      <section>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Rentabilidades</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', fontSize: 14 }}>
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
            <p style={{ margin: 0 }}>{DEFINICIONES_RENTABILIDAD[definicionAbierta]}</p>
            <button
              type="button"
              onClick={() => setDefinicionAbierta(null)}
              className="detalle-popover-btn"
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
        const { title, lines } = getDesgloseCalculo(desgloseAbierto, resultado);
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
                className="detalle-popover-btn"
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
