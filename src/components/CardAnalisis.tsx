import type { AnalisisCard } from '../types/analisis';

const estadoToColor: Record<AnalisisCard['estado'], string> = {
  verde: '#2e7d32',
  amarillo: '#f9a825',
  rojo: '#c62828',
};

const formatEuro = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
};

interface CardAnalisisProps {
  card: AnalisisCard;
}

export function CardAnalisis({ card }: CardAnalisisProps) {
  const color = estadoToColor[card.estado];

  return (
    <article
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '12px 16px',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span style={{ fontWeight: 500 }}>Estado</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: color,
              display: 'inline-block',
            }}
          />
          <span>
            {card.estado === 'verde'
              ? 'Buena oportunidad'
              : card.estado === 'amarillo'
              ? 'Interesante'
              : 'Riesgo'}
          </span>
        </span>
      </div>

      <div>
        <strong>Ubicación:</strong> {card.ubicacion || '—'}
      </div>
      <div>
        <strong>Precio:</strong> {formatEuro(card.precioCompra)}
      </div>
      <div>
        <strong>Alquiler estimado:</strong> {formatEuro(card.alquilerEstimado)} / mes
      </div>
      <div>
        <strong>Rentabilidad neta:</strong> {card.rentabilidadNetaPct.toFixed(2)} %
      </div>
      {card.url && (
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          <strong>URL:</strong> {card.url}
        </div>
      )}
    </article>
  );
}

