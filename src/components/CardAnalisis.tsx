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
  isActive?: boolean;
  onClick?: () => void;
}

export function CardAnalisis({ card, isActive = false, onClick }: CardAnalisisProps) {
  const color = estadoToColor[card.estado];

  return (
    <article
      onClick={onClick}
      style={{
        border: isActive ? '2px solid #333' : '1px solid #ddd',
        borderRadius: 8,
        padding: '12px 16px',
        backgroundColor: isActive ? '#f5f5f5' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
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
        <span style={{ fontWeight: 500 }}>Veredicto</span>
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
          <span>{card.veredictoTitulo}</span>
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
      {card.veredictoRazones.length > 0 && (
        <ul style={{ margin: '4px 0 0 1rem', padding: 0, fontSize: 13 }}>
          {card.veredictoRazones.map((razon, idx) => (
            <li key={idx}>{razon}</li>
          ))}
        </ul>
      )}
      {card.url && (
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          <strong>URL:</strong> {card.url}
        </div>
      )}
    </article>
  );
}

