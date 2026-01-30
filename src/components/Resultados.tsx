import type { RentabilidadApiResponse } from '../types/api';

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

/**
 * Formatea un valor como porcentaje.
 * La API devuelve ratios (ej. 0.06 = 6%); si el valor está en (-1, 1) se multiplica por 100.
 */
const formatPercent = (value: string): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const toShow = num > -1 && num < 1 ? num * 100 : num;
  return `${toShow.toFixed(2)} %`;
};

interface ResultadosProps {
  resultado: RentabilidadApiResponse | null;
}

export function Resultados({ resultado }: ResultadosProps) {
  if (resultado === null) {
    return null;
  }

  return (
    <section
      id="resultados"
      aria-label="Resultados del cálculo"
      style={{
        maxWidth: 480,
        margin: '24px auto 0',
        padding: 20,
        border: '1px solid #ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Resultados</h2>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 24px', alignItems: 'baseline' }}>
        <ResultadoRow label="Ingresos anuales" value={formatEuro(resultado.ingresosAnuales)} />
        <ResultadoRow label="Gastos anuales" value={formatEuro(resultado.gastosAnuales)} />
        <ResultadoRow label="Beneficio antes de impuestos" value={formatEuro(resultado.beneficioAntesImpuestos)} />
        <ResultadoRow label="Cashflow final" value={formatEuro(resultado.cashflowFinal)} />
        <ResultadoRow label="Rentabilidad bruta" value={formatPercent(resultado.rentabilidadBruta)} />
        <ResultadoRow label="Rentabilidad neta" value={formatPercent(resultado.rentabilidadNeta)} />
        <ResultadoRow label="ROCE final" value={formatPercent(resultado.roceFinal)} />
      </dl>
    </section>
  );
}

function ResultadoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ margin: 0, fontWeight: 500 }}>{label}</dt>
      <dd style={{ margin: 0, marginLeft: 0 }}>{value}</dd>
    </>
  );
}
