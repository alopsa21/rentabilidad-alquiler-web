import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

const estadoToColor: Record<AnalisisCard['estado'], string> = {
  verde: '#2e7d32',
  amarillo: '#f9a825',
  rojo: '#c62828',
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

interface DetalleAnalisisProps {
  card: AnalisisCard;
  resultado: RentabilidadApiResponse;
}

export function DetalleAnalisis({ card, resultado }: DetalleAnalisisProps) {
  const color = estadoToColor[card.estado];

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
          <dt style={{ fontWeight: 500 }}>Cashflow final</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatEuro(resultado.cashflowFinal)}</dd>
        </dl>
      </section>

      <section>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Rentabilidades</h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', fontSize: 14 }}>
          <dt style={{ fontWeight: 500 }}>Rentabilidad bruta</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatPercent(resultado.rentabilidadBruta)}</dd>
          <dt style={{ fontWeight: 500 }}>Rentabilidad neta</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatPercent(resultado.rentabilidadNeta)}</dd>
          <dt style={{ fontWeight: 500 }}>ROCE final</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>{formatPercent(resultado.roceFinal)}</dd>
        </dl>
      </section>
    </aside>
  );
}
