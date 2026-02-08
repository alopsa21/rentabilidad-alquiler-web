import { useState, useRef, useEffect } from 'react';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import type { FormularioRentabilidadState } from '../types/formulario';

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
  onToggleFavorite?: () => void;
  onOpenNotes?: () => void;
  mostrarDetalle?: boolean;
  resultado?: RentabilidadApiResponse;
  onInputChange?: (campo: keyof FormularioRentabilidadState, valor: number | string | boolean) => void;
  onRevert?: () => void;
}

export function CardAnalisis({ card, isActive = false, onClick, onDelete, onToggleFavorite, onOpenNotes, mostrarDetalle = false, resultado, onInputChange, onRevert }: CardAnalisisProps) {
  // Color único del semáforo basado en el veredicto de la tarjeta
  const colorSemaforo = estadoToColor[card.estado];
  
  // Extraer métricas para mostrar
  const cashflowFinal = resultado ? Number(resultado.cashflowFinal) : null;
  const rentabilidadNeta = card.rentabilidadNetaPct;
  const roceFinalRaw = resultado ? Number(resultado.roceFinal) : null;
  const roceFinal = roceFinalRaw !== null && !Number.isNaN(roceFinalRaw)
    ? (roceFinalRaw > -1 && roceFinalRaw < 1 ? roceFinalRaw * 100 : roceFinalRaw)
    : null;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Estados locales para inputs editables (con debounce)
  const [precioCompra, setPrecioCompra] = useState(card.currentInput.precioCompra.toString());
  const [alquilerMensual, setAlquilerMensual] = useState(card.currentInput.alquilerMensual.toString());
  
  // Refs para debounce
  const precioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alquilerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sincronizar estados locales cuando cambia currentInput externamente (ej. revert)
  useEffect(() => {
    setPrecioCompra(card.currentInput.precioCompra.toString());
    setAlquilerMensual(card.currentInput.alquilerMensual.toString());
  }, [card.currentInput.precioCompra, card.currentInput.alquilerMensual]);
  
  // Verificar si hay cambios pendientes
  const tieneCambios = JSON.stringify(card.currentInput) !== JSON.stringify(card.originalInput);
  
  // Handlers con debounce
  const handlePrecioChange = (valor: string) => {
    setPrecioCompra(valor);
    const numValor = parseFloat(valor);
    if (!isNaN(numValor) && numValor >= 0) {
      if (precioTimeoutRef.current) clearTimeout(precioTimeoutRef.current);
      precioTimeoutRef.current = setTimeout(() => {
        onInputChange?.('precioCompra', numValor);
      }, 300);
    }
  };
  
  const handleAlquilerChange = (valor: string) => {
    setAlquilerMensual(valor);
    const numValor = parseFloat(valor);
    if (!isNaN(numValor) && numValor >= 0) {
      if (alquilerTimeoutRef.current) clearTimeout(alquilerTimeoutRef.current);
      alquilerTimeoutRef.current = setTimeout(() => {
        onInputChange?.('alquilerMensual', numValor);
      }, 300);
    }
  };
  
  // Cleanup de timeouts al desmontar
  useEffect(() => {
    return () => {
      if (precioTimeoutRef.current) clearTimeout(precioTimeoutRef.current);
      if (alquilerTimeoutRef.current) clearTimeout(alquilerTimeoutRef.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle modo edición
    setIsEditing(!isEditing);
  };

  const handleRevertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tieneCambios && onRevert) {
      onRevert();
      setIsEditing(false);
    }
  };

  // Ref para la tarjeta (para detectar clics fuera)
  const cardRef = useRef<HTMLElement>(null);

  // Cerrar modo edición al hacer clic fuera de la tarjeta
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // No cerrar si el clic es dentro de la tarjeta (inputs, botones, etc.)
      if (cardRef.current?.contains(target)) {
        return;
      }
      // Cerrar si el clic es fuera de la tarjeta
      setIsEditing(false);
    };

    // Usar setTimeout para evitar que se cierre inmediatamente al abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditing]);


  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    
    // Long press para activar edición en móvil
    if (onInputChange) {
      longPressTimer.current = setTimeout(() => {
        setIsEditing(true);
        longPressTimer.current = null;
      }, 500); // 500ms para long press
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancelar long press si hay movimiento
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
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
    // Cancelar long press si se suelta antes de tiempo
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
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
      ref={cardRef}
      data-card-id={card.id}
      className={`card-analisis${isActive ? ' is-active' : ''}`}
      onClick={(e) => {
        // En móvil, solo activar onClick si no estamos en modo edición
        // El long press se maneja en handleTouchStart
        if (!isEditing) {
          onClick?.();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: '1px solid #ddd',
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
        {/* Botones de acción posicionados absolutamente */}
        <div style={{ position: 'absolute', top: 0, right: -8, display: 'flex', gap: 4, zIndex: 2 }}>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
              title={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.isFavorite ? '#f9a825' : '#999',
                fontSize: 18,
                lineHeight: 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {card.isFavorite ? '★' : '☆'}
            </button>
          )}
          {onOpenNotes && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
              aria-label="Notas"
              title={card.notes ? 'Ver o editar notas' : 'Añadir notas'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.notes ? '#1976d2' : '#999',
                fontSize: 18,
                lineHeight: 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              📝
            </button>
          )}
          {onInputChange && (
            <>
              <button
                className="card-edit-btn"
                onClick={handleEditClick}
                aria-label={isEditing ? 'Cerrar edición' : 'Editar tarjeta'}
                title={isEditing ? 'Cerrar edición' : 'Editar tarjeta'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEditing ? '#1976d2' : '#666',
                  fontSize: 16,
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
                ✏️
              </button>
              {tieneCambios && (
                <button
                  className="card-revert-btn"
                  onClick={handleRevertClick}
                  aria-label="Revertir cambios"
                  title="Revertir cambios"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c62828',
                    fontSize: 16,
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
                  ↺
                </button>
              )}
            </>
          )}
          {onDelete && (
            <button
              className="card-delete-btn"
              onClick={handleDeleteClick}
              aria-label="Eliminar tarjeta"
              title="Eliminar tarjeta"
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
        <div style={{ flex: 1.2 }}>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>
            {card.habitaciones} hab · {card.metrosCuadrados} m² · {card.banos} {card.banos === 1 ? 'baño' : 'baños'}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14 }}>{card.ciudad || '—'}</span>
        </div>
        <div style={{ flex: 1 }}>
          {isEditing && onInputChange ? (
            <input
              type="number"
              min="0"
              step="1000"
              value={precioCompra}
              onChange={(e) => handlePrecioChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '120px',
                padding: '2px 6px',
                fontSize: 14,
                border: '1px solid #1976d2',
                borderRadius: 4,
                textAlign: 'right',
              }}
            />
          ) : (
            <span style={{ fontSize: 14 }}>{formatEuro(card.precioCompra)}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {isEditing && onInputChange ? (
            <input
              type="number"
              min="0"
              step="50"
              value={alquilerMensual}
              onChange={(e) => handleAlquilerChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '100px',
                padding: '2px 6px',
                fontSize: 14,
                border: '1px solid #1976d2',
                borderRadius: 4,
                textAlign: 'right',
              }}
            />
          ) : (
            <span style={{ fontSize: 14 }}>{formatEuro(card.alquilerEstimado)}/mes</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, color: colorSemaforo }}>
            {card.rentabilidadNetaPct.toFixed(2)} %
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, color: colorSemaforo }}>
            {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, color: colorSemaforo }}>
            {roceFinal !== null ? `${roceFinal.toFixed(2)} %` : '—'}
          </span>
        </div>
      </div>

      {/* Mobile: Información vertical compacta */}
      <div className="card-info-mobile" style={{ position: 'relative' }}>
        {/* Botones de acción */}
        <div style={{ position: 'absolute', top: -4, right: -4, display: 'flex', gap: 4, zIndex: 10 }}>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
              title={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.isFavorite ? '#f9a825' : '#999',
                fontSize: 22,
                lineHeight: 1,
                transition: 'opacity 0.2s',
              }}
            >
              {card.isFavorite ? '★' : '☆'}
            </button>
          )}
          {onOpenNotes && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
              aria-label="Notas"
              title={card.notes ? 'Ver o editar notas' : 'Añadir notas'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.notes ? '#1976d2' : '#999',
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              📝
            </button>
          )}
          {onInputChange && tieneCambios && (
            <button
              className="card-revert-btn-mobile"
              onClick={handleRevertClick}
              aria-label="Revertir cambios"
              title="Revertir cambios"
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
            >
              ↺
            </button>
          )}
        </div>
        <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Inmueble</strong>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>
              {card.habitaciones} hab · {card.metrosCuadrados} m² · {card.banos} {card.banos === 1 ? 'baño' : 'baños'}
            </span>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Ciudad</strong>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{card.ciudad || '—'}</span>
          </div>
        </div>
        <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Precio compra</strong>
            {isEditing && onInputChange ? (
              <input
                type="number"
                min="0"
                step="1000"
                value={precioCompra}
                onChange={(e) => handlePrecioChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 14,
                  border: '1px solid #1976d2',
                  borderRadius: 4,
                }}
              />
            ) : (
              <span style={{ fontSize: 15 }}>{formatEuro(card.precioCompra)}</span>
            )}
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Alquiler estimado</strong>
            {isEditing && onInputChange ? (
              <input
                type="number"
                min="0"
                step="50"
                value={alquilerMensual}
                onChange={(e) => handleAlquilerChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 14,
                  border: '1px solid #1976d2',
                  borderRadius: 4,
                }}
              />
            ) : (
              <span style={{ fontSize: 15 }}>{formatEuro(card.alquilerEstimado)}/mes</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Rentabilidad neta</strong>
            <span style={{ fontSize: 15, color: colorSemaforo }}>
              {card.rentabilidadNetaPct.toFixed(2)} %
            </span>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>Cashflow</strong>
            <span style={{ fontSize: 15, color: colorSemaforo }}>
              {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
            </span>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase' }}>ROCE</strong>
            <span style={{ fontSize: 15, color: colorSemaforo }}>
              {roceFinal !== null ? `${roceFinal.toFixed(2)} %` : '—'}
            </span>
          </div>
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

