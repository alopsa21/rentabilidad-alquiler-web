import { useState, useRef, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import EditNoteIcon from '@mui/icons-material/StickyNote2Outlined';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

interface CardAnalisisProps {
  card: AnalisisCard;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onOpenNotes?: () => void;
  resultado?: RentabilidadApiResponse;
  resultadoOriginal?: RentabilidadApiResponse;
  onInputChange?: (campo: keyof FormularioRentabilidadState, valor: number | string | boolean) => void;
  onRevertField?: (campo: 'precioCompra' | 'alquilerMensual') => void;
}

function normalizePct(raw: number): number {
  if (Number.isNaN(raw)) return 0;
  return raw > -1 && raw < 1 ? raw * 100 : raw;
}

function DeltaLabel({ delta, unit }: { delta: number; unit: '%' | '€' }) {
  if (delta === 0) return null;
  const isPositive = delta > 0;
  const sign = delta > 0 ? '+' : '';
  const value = unit === '€' ? `${sign}${Math.round(delta)}€` : `${sign}${delta.toFixed(2)}%`;
  return (
    <Typography component="span" variant="caption" sx={{ color: isPositive ? 'success.main' : 'error.main', fontWeight: 600, ml: 0.5 }}>
      ({value})
    </Typography>
  );
}

export function CardAnalisis({ card, isActive = false, onClick, onDelete, onToggleFavorite, onOpenNotes, resultado, resultadoOriginal, onInputChange, onRevertField }: CardAnalisisProps) {
  // Color único del semáforo basado en el veredicto de la tarjeta
  const colorSemaforo = estadoToColor[card.estado];
  
  // Extraer métricas para mostrar
  const cashflowFinal = resultado ? Number(resultado.cashflowFinal) : null;
  const roceFinalRaw = resultado ? Number(resultado.roceFinal) : null;
  const roceFinal = roceFinalRaw !== null && !Number.isNaN(roceFinalRaw)
    ? (roceFinalRaw > -1 && roceFinalRaw < 1 ? roceFinalRaw * 100 : roceFinalRaw)
    : null;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [editingField, setEditingField] = useState<'precioCompra' | 'alquilerMensual' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Estados locales para inputs editables (con debounce)
  const [precioCompra, setPrecioCompra] = useState(card.currentInput.precioCompra.toString());
  const [alquilerMensual, setAlquilerMensual] = useState(card.currentInput.alquilerMensual.toString());
  
  // Refs para debounce
  const precioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alquilerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Sincronizar estados locales cuando cambia currentInput externamente (ej. revert)
  useEffect(() => {
    setPrecioCompra(card.currentInput.precioCompra.toString());
    setAlquilerMensual(card.currentInput.alquilerMensual.toString());
  }, [card.currentInput.precioCompra, card.currentInput.alquilerMensual]);

  // Verificar si hay cambios pendientes (global y por campo)
  const tieneCambios = JSON.stringify(card.currentInput) !== JSON.stringify(card.originalInput);
  const precioCambiado = card.currentInput.precioCompra !== card.originalInput.precioCompra;
  const alquilerCambiado = card.currentInput.alquilerMensual !== card.originalInput.alquilerMensual;

  // Deltas respecto al resultado original (solo cuando hay cambios y tenemos ambos resultados)
  const showDeltas = tieneCambios && resultado && resultadoOriginal;
  const deltaRentabilidad = showDeltas
    ? normalizePct(Number(resultado.rentabilidadNeta)) - normalizePct(Number(resultadoOriginal.rentabilidadNeta))
    : 0;
  const deltaCashflow = showDeltas
    ? Number(resultado.cashflowFinal) - Number(resultadoOriginal.cashflowFinal)
    : 0;
  const roceCur = showDeltas ? normalizePct(Number(resultado.roceFinal)) : 0;
  const roceOrig = showDeltas ? normalizePct(Number(resultadoOriginal.roceFinal)) : 0;
  const deltaRoce = showDeltas ? roceCur - roceOrig : 0;
  
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
  
  const handleRevertPrecio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (precioCambiado && onRevertField) {
      onRevertField('precioCompra');
      setEditingField(null);
    }
  };
  const handleRevertAlquiler = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (alquilerCambiado && onRevertField) {
      onRevertField('alquilerMensual');
      setEditingField(null);
    }
  };

  // Ref para la tarjeta (para detectar clics fuera)
  const cardRef = useRef<HTMLDivElement>(null);

  // Cerrar modo edición al hacer clic fuera de la tarjeta (modo móvil o edición por campo)
  useEffect(() => {
    if (!isEditing && editingField === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current?.contains(target)) return;
      setIsEditing(false);
      setEditingField(null);
    };

    // Usar setTimeout para evitar que se cierre inmediatamente al abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditing, editingField]);


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
    <Card
      ref={cardRef}
      data-card-id={card.id}
      className={`card-analisis${isActive ? ' is-active' : ''}`}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      onClick={() => {
        if (editingField !== null || isEditing) {
          setEditingField(null);
          setIsEditing(false);
        } else {
          onClick?.();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: isDeleting ? 'transform 0.2s, opacity 0.2s' : swipeOffset === 0 ? 'all 0.2s' : 'none',
        transform: `translateX(${swipeOffset}px)`,
        opacity: isDeleting ? 0 : 1,
        position: 'relative',
        backgroundColor: isActive ? '#e8f5e9' : undefined,
        boxShadow: isActive ? 2 : 0,
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      {/* Desktop: Información horizontal */}
      <Box className="card-info-horizontal card-info-desktop" sx={{ position: 'relative', alignItems: 'center', minHeight: 40 }}>
        {/* Botones de acción posicionados absolutamente */}
        <Box sx={{ position: 'absolute', top: '50%', right: -8, transform: 'translateY(-50%)', display: 'flex', gap: 0, zIndex: 2 }}>
          {onToggleFavorite && (
            <Tooltip title={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                aria-label={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
                sx={{
                  color: card.isFavorite ? '#f9a825' : '#c9a227',
                  p: 0.5,
                  '&:hover': { color: card.isFavorite ? '#ffb74d' : '#f9a825' },
                }}
              >
                {card.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          {onOpenNotes && (
            <Tooltip title={card.notes ? 'Ver o editar notas' : 'Añadir notas'}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
                aria-label="Notas"
                sx={{ color: card.notes ? '#1976d2' : 'primary.main', p: 0.5, '&:hover': { color: '#1565c0' } }}
              >
                <EditNoteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Eliminar tarjeta">
              <IconButton
                size="small"
                onClick={handleDeleteClick}
                aria-label="Eliminar tarjeta"
                sx={{ color: '#c62828', p: 0.5, '&:hover': { color: '#b71c1c' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ flex: '1.2 1 0', minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center' }}>
          <Typography component="span" variant="body2" sx={{ fontSize: 13, lineHeight: 1.4 }}>
            {card.habitaciones} hab · {card.metrosCuadrados} m² · {card.banos} {card.banos === 1 ? 'baño' : 'baños'}
          </Typography>
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center' }}>
          <Typography component="span" variant="body2" sx={{ fontSize: 14 }}>{card.ciudad || '—'}</Typography>
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
          {(isEditing || editingField === 'precioCompra') && onInputChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={precioCompra}
                onChange={(e) => handlePrecioChange(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1000 }}
                sx={{
                  width: '100%',
                  maxWidth: 120,
                  '& .MuiInputBase-root': { minHeight: 36 },
                  '& .MuiInputBase-input': { textAlign: 'right', fontSize: 14 },
                }}
              />
              {precioCambiado && onRevertField && (
                <Tooltip title="Deshacer precio compra">
                  <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : (
            <>
              <Typography component="span" variant="body2" sx={{ fontSize: 14 }}>{formatEuro(card.precioCompra)}</Typography>
              {precioCambiado && onRevertField && (
                <Tooltip title="Deshacer precio compra">
                  <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {onInputChange && isCardHovered && (
                <Tooltip title="Editar precio compra">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setEditingField('precioCompra'); }}
                    aria-label="Editar precio compra"
                    sx={{ p: 0.25, color: '#666', '&:hover': { color: 'primary.main' } }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
          {(isEditing || editingField === 'alquilerMensual') && onInputChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                value={alquilerMensual}
                onChange={(e) => handleAlquilerChange(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 50 }}
                sx={{
                  width: '100%',
                  maxWidth: 100,
                  '& .MuiInputBase-root': { minHeight: 36 },
                  '& .MuiInputBase-input': { textAlign: 'right', fontSize: 14 },
                }}
              />
              {alquilerCambiado && onRevertField && (
                <Tooltip title="Deshacer alquiler estimado">
                  <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : (
            <>
              <Typography component="span" variant="body2" sx={{ fontSize: 14 }}>{formatEuro(card.alquilerEstimado)}/mes</Typography>
              {alquilerCambiado && onRevertField && (
                <Tooltip title="Deshacer alquiler estimado">
                  <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {onInputChange && isCardHovered && (
                <Tooltip title="Editar alquiler estimado">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setEditingField('alquilerMensual'); }}
                    aria-label="Editar alquiler estimado"
                    sx={{ p: 0.25, color: '#666', '&:hover': { color: 'primary.main' } }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography component="span" variant="body2" sx={{ fontSize: 14, color: colorSemaforo }}>
            {card.rentabilidadNetaPct.toFixed(2)} %
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaRentabilidad} unit="%" />}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography component="span" variant="body2" sx={{ fontSize: 14, color: colorSemaforo }}>
            {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaCashflow} unit="€" />}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 40, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography component="span" variant="body2" sx={{ fontSize: 14, color: colorSemaforo }}>
            {roceFinal !== null ? `${roceFinal.toFixed(2)} %` : '—'}
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaRoce} unit="%" />}
        </Box>
      </Box>

      {/* Mobile: Información vertical compacta */}
      <Box className="card-info-mobile" sx={{ position: 'relative' }}>
        {/* Botones de acción */}
        <Box sx={{ position: 'absolute', top: '50%', right: -4, transform: 'translateY(-50%)', display: 'flex', gap: 0, zIndex: 10 }}>
          {onToggleFavorite && (
            <Tooltip title={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                aria-label={card.isFavorite ? 'Quitar de Mi Portfolio' : 'Añadir a Mi Portfolio'}
                sx={{
                  color: card.isFavorite ? '#f9a825' : '#c9a227',
                  p: 0.75,
                  '&:hover': { color: card.isFavorite ? '#ffb74d' : '#f9a825' },
                }}
              >
                {card.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          {onOpenNotes && (
            <Tooltip title={card.notes ? 'Ver o editar notas' : 'Añadir notas'}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onOpenNotes(); }}
                aria-label="Notas"
                sx={{ color: card.notes ? '#1976d2' : 'primary.main', p: 0.75, '&:hover': { color: '#1565c0' } }}
              >
                <EditNoteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ mb: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>Inmueble</Typography>
            <Typography variant="body2" sx={{ fontSize: 14, lineHeight: 1.4 }}>
              {card.habitaciones} hab · {card.metrosCuadrados} m² · {card.banos} {card.banos === 1 ? 'baño' : 'baños'}
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>Ciudad</Typography>
            <Typography variant="body2" sx={{ fontSize: 15, fontWeight: 500 }}>{card.ciudad || '—'}</Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>Precio compra</Typography>
            {(isEditing || editingField === 'precioCompra') && onInputChange ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
                <TextField
                  type="number"
                  size="small"
                  variant="outlined"
                  value={precioCompra}
                  onChange={(e) => handlePrecioChange(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onClick={(e) => e.stopPropagation()}
                  inputProps={{ min: 0, step: 1000 }}
                  sx={{ width: '100%', '& .MuiInputBase-root': { minHeight: 36 }, '& .MuiInputBase-input': { fontSize: 14 } }}
                />
                {precioCambiado && onRevertField && (
                  <Tooltip title="Deshacer precio compra">
                    <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
                <Typography variant="body2" sx={{ fontSize: 15 }}>{formatEuro(card.precioCompra)}</Typography>
                {precioCambiado && onRevertField && (
                  <Tooltip title="Deshacer precio compra">
                    <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {onInputChange && (
                  <Tooltip title="Editar precio compra">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingField('precioCompra'); }} aria-label="Editar precio compra" sx={{ p: 0.25, color: '#666', '&:hover': { color: 'primary.main' } }}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>Alquiler estimado</Typography>
            {(isEditing || editingField === 'alquilerMensual') && onInputChange ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
                <TextField
                  type="number"
                  size="small"
                  variant="outlined"
                  value={alquilerMensual}
                  onChange={(e) => handleAlquilerChange(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onClick={(e) => e.stopPropagation()}
                  inputProps={{ min: 0, step: 50 }}
                  sx={{ width: '100%', '& .MuiInputBase-root': { minHeight: 36 }, '& .MuiInputBase-input': { fontSize: 14 } }}
                />
                {alquilerCambiado && onRevertField && (
                  <Tooltip title="Deshacer alquiler estimado">
                    <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 40 }}>
                <Typography variant="body2" sx={{ fontSize: 15 }}>{formatEuro(card.alquilerEstimado)}/mes</Typography>
                {alquilerCambiado && onRevertField && (
                  <Tooltip title="Deshacer alquiler estimado">
                    <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {onInputChange && (
                  <Tooltip title="Editar alquiler estimado">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingField('alquilerMensual'); }} aria-label="Editar alquiler estimado" sx={{ p: 0.25, color: '#666', '&:hover': { color: 'primary.main' } }}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Rentabilidad neta</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontSize: 15, color: colorSemaforo }}>
                {card.rentabilidadNetaPct.toFixed(2)} %
              </Typography>
              {showDeltas && <DeltaLabel delta={deltaRentabilidad} unit="%" />}
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>Cashflow</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontSize: 15, color: colorSemaforo }}>
                {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
              </Typography>
              {showDeltas && <DeltaLabel delta={deltaCashflow} unit="€" />}
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.5, textTransform: 'uppercase' }}>ROCE</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontSize: 15, color: colorSemaforo }}>
                {roceFinal !== null ? `${roceFinal.toFixed(2)} %` : '—'}
              </Typography>
              {showDeltas && <DeltaLabel delta={deltaRoce} unit="%" />}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Información adicional - solo en mobile */}
      <Box className="card-info-extra">
        <Typography variant="body2">
          <Typography component="span" variant="body2" fontWeight={600}>Alquiler estimado:</Typography>{' '}
          {formatEuro(card.alquilerEstimado)} / mes
        </Typography>
        {card.veredictoRazones.length > 0 && (
          <ul style={{ margin: '4px 0 0 1rem', padding: 0, fontSize: 13 }}>
            {card.veredictoRazones.map((razon, idx) => (
              <li key={idx}><Typography component="span" variant="body2" sx={{ fontSize: 13 }}>{razon}</Typography></li>
            ))}
          </ul>
        )}
        {card.url && (
          <Typography variant="body2" sx={{ fontSize: 12, color: '#555', mt: 1 }}>
            <Typography component="span" variant="body2" fontWeight={600} sx={{ fontSize: 12, color: '#555' }}>URL:</Typography>{' '}
            {card.url}
          </Typography>
        )}
      </Box>
      </CardContent>
    </Card>
  );
}

