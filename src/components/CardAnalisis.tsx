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

interface CardAnalisisProps {
  card: AnalisisCard;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function CardAnalisis({ card, isActive = false, onClick, onDelete }: CardAnalisisProps) {
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
        padding: '12px 16px',
        backgroundColor: isActive ? '#f5f5f5' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: onClick ? 'pointer' : 'default',
        transition: isDeleting ? 'transform 0.2s, opacity 0.2s' : swipeOffset === 0 ? 'all 0.2s' : 'none',
        transform: `translateX(${swipeOffset}px)`,
        opacity: isDeleting ? 0 : 1,
        position: 'relative',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {onDelete && (
            <button
              className="card-delete-btn"
              onClick={handleDeleteClick}
              aria-label="Eliminar tarjeta"
              style={{
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
        </div>
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

