import { useState, useRef } from 'react';
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

const formatEuroFromString = (value: string): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return formatEuro(num);
};

interface CardAnalisisProps {
  card: AnalisisCard;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  mostrarDetalle?: boolean;
  cashflow?: string;
}

export function CardAnalisis({ card, isActive = false, onClick, onDelete, mostrarDetalle = false, cashflow }: CardAnalisisProps) {
  const color = estadoToColor[card.estado];
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

    // Solo permitir swipe horizontal (deltaX > deltaY)
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      // Swipe hacia la izquierda (negativo)
      setSwipeOffset(Math.max(deltaX, -100)); // Máximo -100px
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -50 && onDelete) {
      // Si se deslizó más de 50px, eliminar
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 200);
    } else {
      // Volver a la posición original
      setSwipeOffset(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active onClick de la tarjeta
    if (onDelete) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 200);
    }
  };

  return (
    <article
      className="card-analisis"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: isActive ? '2px solid #333' : '1px solid #ddd',
        borderRadius: 8,
        padding: '12px 12px 12px 12px',
        backgroundColor: isActive ? '#e8f5e9' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: isDeleting ? 'transform 0.2s, opacity 0.2s' : swipeOffset === 0 ? 'all 0.2s' : 'none',
        transform: `translateX(${swipeOffset}px)`,
        opacity: isDeleting ? 0 : 1,
        position: 'relative',
        boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
      }}
    >
      {/* Desktop: Información horizontal */}
      <div className="card-info-horizontal card-info-desktop" style={{ position: 'relative' }}>
        {/* Botón eliminar posicionado absolutamente dentro del contenido */}
        {onDelete && (
          <button
            className="card-delete-btn"
            onClick={handleDeleteClick}
            aria-label="Eliminar tarjeta"
            style={{
              position: 'absolute',
              top: 0,
              right: -8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c62828',
              fontSize: 18,
              lineHeight: 1,
              transition: 'opacity 0.2s',
              zIndex: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            ×
          </button>
        )}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14 }}>{card.ubicacion || '—'}</span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14 }}>{formatEuro(card.precioCompra)}</span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14 }}>{formatEuro(card.alquilerEstimado)}/mes</span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color }}>{card.rentabilidadNetaPct.toFixed(2)} %</span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14 }}>{cashflow ? formatEuroFromString(cashflow) : '—'}</span>
        </div>
      </div>

      {/* Mobile: Información vertical compacta */}
      <div className="card-info-mobile" style={{ position: 'relative' }}>
        {onDelete && (
          <button
            className="card-delete-btn-mobile"
            onClick={handleDeleteClick}
            aria-label="Eliminar tarjeta"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c62828',
              fontSize: 20,
              lineHeight: 1,
              transition: 'opacity 0.2s',
              zIndex: 1,
            }}
          >
            ×
          </button>
        )}
        <div style={{ marginBottom: 12 }}>
          <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Ubicación</strong>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{card.ubicacion || '—'}</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Precio</strong>
          <span style={{ fontSize: 15 }}>{formatEuro(card.precioCompra)}</span>
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Rentabilidad neta</strong>
          <span style={{ fontSize: 18, fontWeight: 600, color }}>{card.rentabilidadNetaPct.toFixed(2)} %</span>
        </div>
      </div>

      {/* Información adicional - solo en mobile */}
      <div className="card-info-extra">
        <div>
          <strong>Alquiler estimado:</strong> {formatEuro(card.alquilerEstimado)} / mes
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
      </div>
    </article>
  );
}

