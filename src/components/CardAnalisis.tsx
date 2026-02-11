import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { inputsAreEqual } from '../utils/compareInputs';
import { NOMBRE_COMUNIDAD_POR_CODIGO, CODIGOS_COMUNIDADES } from '../constants/comunidades';
import { getCiudadesPorCodauto } from '../services/territorio';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import { useMediaQuery } from '@mui/material';
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
  onRevertInmueble?: (campo: 'habitaciones' | 'metrosCuadrados' | 'banos') => void;
  onCiudadChange?: (ciudad: string) => void;
  onInmuebleChange?: (campo: 'habitaciones' | 'metrosCuadrados' | 'banos', valor: number) => void;
  isInFavoritesView?: boolean;
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

function CardAnalisisComponent({ card, isActive = false, onClick, onDelete, onToggleFavorite, onOpenNotes, resultado, resultadoOriginal, onInputChange, onRevertField, onRevertInmueble, onCiudadChange, onInmuebleChange, isInFavoritesView = false }: CardAnalisisProps) {
  // Detectar modo oscuro
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Color único del semáforo basado en el veredicto de la tarjeta
  const colorSemaforo = estadoToColor[card.estado];
  
  // Helper para determinar si un campo está faltante
  const campoFalta = (campo: keyof NonNullable<AnalisisCard['camposFaltantes']>) => {
    return card.camposFaltantes?.[campo] === true;
  };
  
  // Estilos para campos faltantes (adaptado para modo claro y oscuro)
  const estiloCampoFaltante = useMemo(() => ({
    border: '2px solid #f44336',
    backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4', // Amarillo oscuro en modo oscuro, claro en modo claro
    color: prefersDarkMode ? '#fff' : '#000', // Texto blanco en modo oscuro, negro en modo claro
    borderRadius: '4px',
    padding: '2px 4px',
  }), [prefersDarkMode]);
  
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
  const [editingField, setEditingField] = useState<'precioCompra' | 'alquilerMensual' | 'codigoComunidadAutonoma' | 'ciudad' | 'inmueble' | null>(null);
  const [habitacionesInput, setHabitacionesInput] = useState(card.habitaciones > 0 ? card.habitaciones.toString() : '');
  const [metrosCuadradosInput, setMetrosCuadradosInput] = useState(card.metrosCuadrados > 0 ? card.metrosCuadrados.toString() : '');
  const [banosInput, setBanosInput] = useState(card.banos > 0 ? card.banos.toString() : '');
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Estados locales para inputs editables (con debounce)
  // Si el campo falta y el valor es 0, mostrar vacío en lugar de "0"
  const [precioCompra, setPrecioCompra] = useState(
    card.currentInput.precioCompra > 0 || !card.camposFaltantes?.precioCompra 
      ? card.currentInput.precioCompra.toString() 
      : ''
  );
  const [alquilerMensual, setAlquilerMensual] = useState(
    card.currentInput.alquilerMensual > 0 || !card.camposFaltantes?.alquilerMensual 
      ? card.currentInput.alquilerMensual.toString() 
      : ''
  );
  const [codigoComunidadAutonoma, setCodigoComunidadAutonoma] = useState(card.currentInput.codigoComunidadAutonoma);
  const [ciudad, setCiudad] = useState(card.ciudad || '');
  
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(codigoComunidadAutonoma >= 1 && codigoComunidadAutonoma <= 19)) {
        setCiudadesDisponibles([]);
        return;
      }
      try {
        const ciudades = await getCiudadesPorCodauto(codigoComunidadAutonoma);
        if (!cancelled) setCiudadesDisponibles(ciudades);
      } catch {
        if (!cancelled) setCiudadesDisponibles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codigoComunidadAutonoma]);

  // Opciones para el Autocomplete de Comunidad autónoma
  const opcionesComunidades = useMemo(() => {
    return CODIGOS_COMUNIDADES.map((codigo) => ({
      codigo,
      nombre: NOMBRE_COMUNIDAD_POR_CODIGO[codigo],
    }));
  }, []);
  
  // Valor seleccionado para Comunidad autónoma (para Autocomplete)
  const valorComunidadSeleccionada = useMemo(() => {
    if (codigoComunidadAutonoma >= 1 && codigoComunidadAutonoma <= 19) {
      return opcionesComunidades.find((c) => c.codigo === codigoComunidadAutonoma) || null;
    }
    return null;
  }, [codigoComunidadAutonoma, opcionesComunidades]);

  // Si la ciudad actual no está en la lista, añadirla para evitar warning de MUI
  const opcionesCiudad = useMemo(() => {
    if (!ciudad) return ciudadesDisponibles;
    if (ciudadesDisponibles.includes(ciudad)) return ciudadesDisponibles;
    return [ciudad, ...ciudadesDisponibles];
  }, [ciudad, ciudadesDisponibles]);
  
  // Refs para debounce
  const precioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alquilerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Sincronizar estados locales cuando cambia currentInput externamente (ej. revert)
  useEffect(() => {
    // Si el campo falta y el valor es 0, mostrar vacío
    setPrecioCompra(
      card.currentInput.precioCompra > 0 || !card.camposFaltantes?.precioCompra 
        ? card.currentInput.precioCompra.toString() 
        : ''
    );
    setAlquilerMensual(
      card.currentInput.alquilerMensual > 0 || !card.camposFaltantes?.alquilerMensual 
        ? card.currentInput.alquilerMensual.toString() 
        : ''
    );
    setCodigoComunidadAutonoma(card.currentInput.codigoComunidadAutonoma);
    setCiudad(card.ciudad || '');
    // Actualizar campos del inmueble solo si no estamos editando
    if (editingField !== 'inmueble') {
      setHabitacionesInput(card.habitaciones > 0 ? card.habitaciones.toString() : '');
      setMetrosCuadradosInput(card.metrosCuadrados > 0 ? card.metrosCuadrados.toString() : '');
      setBanosInput(card.banos > 0 ? card.banos.toString() : '');
    }
  }, [card.currentInput.precioCompra, card.currentInput.alquilerMensual, card.currentInput.codigoComunidadAutonoma, card.ciudad, card.habitaciones, card.metrosCuadrados, card.banos, card.camposFaltantes, editingField]);

  // Verificar si hay cambios pendientes (global y por campo) - comparación eficiente sin JSON.stringify
  const tieneCambios = useMemo(
    () => !inputsAreEqual(card.currentInput, card.originalInput),
    [card.currentInput, card.originalInput]
  );
  const precioCambiado = card.currentInput.precioCompra !== card.originalInput.precioCompra;
  const alquilerCambiado = card.currentInput.alquilerMensual !== card.originalInput.alquilerMensual;
  const habitacionesCambiado = card.habitaciones !== card.originalHabitaciones;
  const metrosCuadradosCambiado = card.metrosCuadrados !== card.originalMetrosCuadrados;
  const banosCambiado = card.banos !== card.originalBanos;

  // Deltas respecto al resultado original (solo cuando hay cambios y tenemos ambos resultados) - memoizado
  const { showDeltas, deltaRentabilidad, deltaCashflow, deltaRoce } = useMemo(() => {
    const showDeltas = tieneCambios && resultado && resultadoOriginal;
    if (!showDeltas) {
      return { showDeltas: false, deltaRentabilidad: 0, deltaCashflow: 0, deltaRoce: 0 };
    }
    const deltaRentabilidad = normalizePct(Number(resultado.rentabilidadNeta)) - normalizePct(Number(resultadoOriginal.rentabilidadNeta));
    const deltaCashflow = Number(resultado.cashflowFinal) - Number(resultadoOriginal.cashflowFinal);
    const roceCur = normalizePct(Number(resultado.roceFinal));
    const roceOrig = normalizePct(Number(resultadoOriginal.roceFinal));
    const deltaRoce = roceCur - roceOrig;
    return { showDeltas: true, deltaRentabilidad, deltaCashflow, deltaRoce };
  }, [tieneCambios, resultado, resultadoOriginal]);
  
  // Handlers con debounce - AUMENTADO a 1000ms para reducir llamadas a la API
  const handlePrecioChange = (valor: string) => {
    setPrecioCompra(valor);
    const numValor = parseFloat(valor);
    if (!isNaN(numValor) && numValor >= 0) {
      if (precioTimeoutRef.current) clearTimeout(precioTimeoutRef.current);
      precioTimeoutRef.current = setTimeout(() => {
        onInputChange?.('precioCompra', numValor);
      }, 1000); // Aumentado de 300ms a 1000ms
    }
  };
  
  const handleAlquilerChange = (valor: string) => {
    setAlquilerMensual(valor);
    const numValor = parseFloat(valor);
    if (!isNaN(numValor) && numValor >= 0) {
      if (alquilerTimeoutRef.current) clearTimeout(alquilerTimeoutRef.current);
      alquilerTimeoutRef.current = setTimeout(() => {
        onInputChange?.('alquilerMensual', numValor);
      }, 1000); // Aumentado de 300ms a 1000ms
    }
  };
  
  const handleComunidadChange = (codigo: number) => {
    if (codigo === 0) {
      setCodigoComunidadAutonoma(0);
      onInputChange?.('codigoComunidadAutonoma', 0);
      setCiudad('');
      onCiudadChange?.('');
      return;
    }
    setCodigoComunidadAutonoma(codigo);
    onInputChange?.('codigoComunidadAutonoma', codigo);
    // Evitar estado "inconsistente" (ciudad no pertenece a la nueva comunidad) mientras cargan ciudades
    setCiudad('');
    onCiudadChange?.('');
  };
  
  const handleCiudadChange = (nuevaCiudad: string) => {
    setCiudad(nuevaCiudad);
    onCiudadChange?.(nuevaCiudad);
  };
  
  const handleInmuebleFieldBlur = (campo: 'habitaciones' | 'metrosCuadrados' | 'banos', valor: string) => {
    // Si el campo está vacío, guardar como 0
    const numValor = valor === '' ? 0 : parseInt(valor, 10);
    if (!isNaN(numValor) && numValor >= 0) {
      // Llamar al handler para actualizar la tarjeta
      onInmuebleChange?.(campo, numValor);
      // Actualizar el estado local inmediatamente para reflejar el cambio
      if (campo === 'habitaciones') {
        setHabitacionesInput(numValor > 0 ? numValor.toString() : '');
      } else if (campo === 'metrosCuadrados') {
        setMetrosCuadradosInput(numValor > 0 ? numValor.toString() : '');
      } else if (campo === 'banos') {
        setBanosInput(numValor > 0 ? numValor.toString() : '');
      }
      // Cerrar modo edición solo si todos los campos del inmueble están completos
      const habitacionesOk = campo === 'habitaciones' ? numValor > 0 : (card.habitaciones > 0 || !campoFalta('habitaciones'));
      const metrosOk = campo === 'metrosCuadrados' ? numValor > 0 : (card.metrosCuadrados > 0 || !campoFalta('metrosCuadrados'));
      const banosOk = campo === 'banos' ? numValor > 0 : (card.banos > 0 || !campoFalta('banos'));
      if (habitacionesOk && metrosOk && banosOk) {
        setEditingField(null);
      }
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
  
  const handleRevertInmueble = (campo: 'habitaciones' | 'metrosCuadrados' | 'banos') => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRevertInmueble) {
      onRevertInmueble(campo);
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
      // Si el click ocurre dentro de un menú/popover de MUI (renderizado en Portal),
      // NO considerarlo como "click fuera" de la tarjeta.
      if (target?.closest?.('.MuiMenu-paper') || target?.closest?.('.MuiPopover-root') || target?.closest?.('.MuiModal-root')) {
        return;
      }
      if (cardRef.current?.contains(target)) {
        return;
      }
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
    
    // No permitir swipe para eliminar si estamos en la vista de favoritos
    if (isInFavoritesView) return;
    
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
    
    // No permitir eliminar si estamos en la vista de favoritos
    if (isInFavoritesView) {
      setSwipeOffset(0);
      touchStartX.current = null;
      touchStartY.current = null;
      return;
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
      className={`card-analisis estado-${card.estado}${isActive ? ' is-active' : ''}`}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        // Evitar abrir el detalle al interactuar con controles (Autocomplete, inputs, botones, etc.)
        if (
          target &&
          (target.closest('input, textarea, button, [role="button"]') ||
            target.closest('.MuiAutocomplete-root') ||
            target.closest('.MuiAutocomplete-popper') ||
            target.closest('.MuiAutocomplete-listbox'))
        ) {
          return;
        }
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
      <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
      {/* Desktop: Información horizontal */}
      <Box className="card-info-horizontal card-info-desktop" sx={{ position: 'relative', alignItems: 'center', minHeight: 32 }}>
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
          {onDelete && !isInFavoritesView && (
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
        <Box sx={{ flex: '1.2 1 0', minWidth: 0, minHeight: 32, display: 'flex', alignItems: 'center', pl: 0.5 }}>
          {editingField === 'inmueble' && onInmuebleChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="hab"
                value={habitacionesInput}
                onChange={(e) => setHabitacionesInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('habitaciones', habitacionesInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('habitaciones', habitacionesInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('habitaciones')}
                sx={{
                  width: 60,
                  '& .MuiInputBase-root': { minHeight: 28 },
                  '& .MuiInputBase-input': { fontSize: 13, textAlign: 'center', padding: '4px 8px' },
                  ...(campoFalta('habitaciones') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              <Typography component="span" sx={{ fontSize: 13, color: '#666' }}>·</Typography>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="m²"
                value={metrosCuadradosInput}
                onChange={(e) => setMetrosCuadradosInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('metrosCuadrados', metrosCuadradosInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('metrosCuadrados', metrosCuadradosInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('metrosCuadrados')}
                sx={{
                  width: 70,
                  '& .MuiInputBase-root': { minHeight: 28 },
                  '& .MuiInputBase-input': { fontSize: 13, textAlign: 'center', padding: '4px 8px' },
                  ...(campoFalta('metrosCuadrados') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              {metrosCuadradosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer metros cuadrados">
                  <IconButton size="small" onClick={handleRevertInmueble('metrosCuadrados')} aria-label="Deshacer metros cuadrados" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Typography component="span" sx={{ fontSize: 13, color: '#666' }}>·</Typography>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="baños"
                value={banosInput}
                onChange={(e) => setBanosInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('banos', banosInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('banos', banosInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('banos')}
                sx={{
                  width: 70,
                  '& .MuiInputBase-root': { minHeight: 28 },
                  '& .MuiInputBase-input': { fontSize: 13, textAlign: 'center', padding: '4px 8px' },
                  ...(campoFalta('banos') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              {banosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer baños">
                  <IconButton size="small" onClick={handleRevertInmueble('banos')} aria-label="Deshacer baños" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'nowrap', minWidth: 0 }}>
              <Typography 
                component="span" 
                variant="body2" 
                onClick={(e) => {
                  if ((campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) && onInmuebleChange) {
                    e.stopPropagation();
                    setEditingField('inmueble');
                  }
                }}
                sx={{ 
                  fontSize: 13, 
                  lineHeight: 1.4,
                  flexShrink: 1,
                  minWidth: 0,
                  ...(campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos') 
                    ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } 
                    : {})
                }}
              >
                {card.habitaciones || campoFalta('habitaciones') ? `${card.habitaciones || '?'} hab` : ''} 
                {card.habitaciones || campoFalta('habitaciones') ? ' · ' : ''}
                {card.metrosCuadrados || campoFalta('metrosCuadrados') ? `${card.metrosCuadrados || '?'} m²` : ''}
                {card.metrosCuadrados || campoFalta('metrosCuadrados') ? ' · ' : ''}
                {card.banos || campoFalta('banos') ? `${card.banos || '?'} ${card.banos === 1 ? 'baño' : 'baños'}` : ''}
                {(!card.habitaciones && !campoFalta('habitaciones')) && (!card.metrosCuadrados && !campoFalta('metrosCuadrados')) && (!card.banos && !campoFalta('banos')) && '—'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                {habitacionesCambiado && onRevertInmueble && (
                  <Tooltip title="Deshacer habitaciones">
                    <IconButton size="small" onClick={handleRevertInmueble('habitaciones')} aria-label="Deshacer habitaciones" sx={{ p: 0.15, minWidth: 20, width: 20, height: 20, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {metrosCuadradosCambiado && onRevertInmueble && (
                  <Tooltip title="Deshacer metros cuadrados">
                    <IconButton size="small" onClick={handleRevertInmueble('metrosCuadrados')} aria-label="Deshacer metros cuadrados" sx={{ p: 0.15, minWidth: 20, width: 20, height: 20, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {banosCambiado && onRevertInmueble && (
                  <Tooltip title="Deshacer baños">
                    <IconButton size="small" onClick={handleRevertInmueble('banos')} aria-label="Deshacer baños" sx={{ p: 0.15, minWidth: 20, width: 20, height: 20, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {onInmuebleChange && (isCardHovered || campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) && (
                  <Tooltip title={(campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) ? 'Completar datos del inmueble' : 'Editar datos del inmueble'}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setEditingField('inmueble'); }}
                      aria-label="Editar datos del inmueble"
                      sx={{ p: 0.15, minWidth: 20, width: 20, height: 20, color: (campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )}
        </Box>
        <Box sx={{ flex: '1.4 1 0', minWidth: 240, minHeight: 32, display: 'flex', alignItems: 'center', pl: 0.5 }}>
          {onInputChange ? (
            <Autocomplete
              size="small"
              openOnFocus
              options={opcionesComunidades}
              getOptionLabel={(option) => option.nombre}
              isOptionEqualToValue={(option, value) => option.codigo === value?.codigo}
              value={valorComunidadSeleccionada}
              onChange={(_, nuevaComunidad) => {
                if (nuevaComunidad) {
                  handleComunidadChange(nuevaComunidad.codigo);
                } else {
                  handleComunidadChange(0);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecciona comunidad"
                  error={campoFalta('codigoComunidadAutonoma')}
                  sx={{
                    fontSize: 14,
                    ...(campoFalta('codigoComunidadAutonoma')
                      ? {
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' },
                          '& .MuiInputBase-root': { 
                            backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                            color: prefersDarkMode ? '#fff' : '#000',
                          },
                        }
                      : {}),
                  }}
                />
              )}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': { minHeight: 28 },
                ...(prefersDarkMode ? {
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#3d3d3d',
                    color: '#e4e4e4',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#555',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#666',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#e4e4e4',
                  },
                } : {}),
              }}
              ListboxProps={{
                sx: {
                  maxHeight: 300,
                  ...(prefersDarkMode ? {
                    backgroundColor: '#2d2d2d',
                    color: '#e4e4e4',
                    '& .MuiAutocomplete-option': {
                      color: '#e4e4e4',
                      '&:hover': {
                        backgroundColor: '#3d3d3d',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: '#505050',
                      },
                    },
                  } : {}),
                },
              }}
            />
          ) : (
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: 14,
                ...(campoFalta('codigoComunidadAutonoma') ? estiloCampoFaltante : {}),
              }}
            >
              {card.currentInput.codigoComunidadAutonoma
                ? NOMBRE_COMUNIDAD_POR_CODIGO[card.currentInput.codigoComunidadAutonoma]
                : campoFalta('codigoComunidadAutonoma')
                  ? '⚠️ Falta'
                  : '—'}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 32, display: 'flex', alignItems: 'center', pl: 0.5 }}>
          {onCiudadChange ? (
            <Autocomplete
              size="small"
              openOnFocus
              options={opcionesCiudad}
              value={ciudad || null}
              onChange={(_, nuevaCiudad) => {
                handleCiudadChange(nuevaCiudad || '');
              }}
              disabled={!(codigoComunidadAutonoma >= 1 && codigoComunidadAutonoma <= 19)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecciona ciudad"
                  error={campoFalta('ciudad')}
                  sx={{
                    fontSize: 14,
                    ...(campoFalta('ciudad')
                      ? {
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' },
                          '& .MuiInputBase-root': { 
                            backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                            color: prefersDarkMode ? '#fff' : '#000',
                          },
                        }
                      : {}),
                  }}
                />
              )}
              sx={{
                minWidth: 180,
                width: '100%',
                '& .MuiInputBase-root': { minHeight: 28 },
                ...(prefersDarkMode ? {
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#3d3d3d',
                    color: '#e4e4e4',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#555',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#666',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#e4e4e4',
                  },
                } : {}),
              }}
              ListboxProps={{
                sx: {
                  maxHeight: 300,
                  ...(prefersDarkMode ? {
                    backgroundColor: '#2d2d2d',
                    color: '#e4e4e4',
                    '& .MuiAutocomplete-option': {
                      color: '#e4e4e4',
                      '&:hover': {
                        backgroundColor: '#3d3d3d',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: '#505050',
                      },
                    },
                  } : {}),
                },
              }}
            />
          ) : (
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: 14,
                ...(campoFalta('ciudad') ? estiloCampoFaltante : {}),
              }}
            >
              {card.ciudad || (campoFalta('ciudad') ? '⚠️ Falta' : '—')}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 32, pl: 0.5 }}>
          {(isEditing || editingField === 'precioCompra') && onInputChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 32 }}>
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
                error={campoFalta('precioCompra')}
                sx={{
                  width: '100%',
                  maxWidth: 120,
                  '& .MuiInputBase-root': { minHeight: 28 },
                  '& .MuiInputBase-input': { textAlign: 'right', fontSize: 14 },
                  ...(campoFalta('precioCompra') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
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
              <Typography 
                component="span" 
                variant="body2" 
                onClick={(e) => {
                  if (campoFalta('precioCompra') && onInputChange) {
                    e.stopPropagation();
                    setEditingField('precioCompra');
                  }
                }}
                sx={{ 
                  fontSize: 14,
                  ...(campoFalta('precioCompra') ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } : {})
                }}
              >
                {card.precioCompra > 0 ? formatEuro(card.precioCompra) : (campoFalta('precioCompra') ? '⚠️ Falta' : formatEuro(card.precioCompra))}
              </Typography>
              {precioCambiado && onRevertField && (
                <Tooltip title="Deshacer precio compra">
                  <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {onInputChange && (isCardHovered || campoFalta('precioCompra')) && (
                <Tooltip title={campoFalta('precioCompra') ? 'Completar precio compra' : 'Editar precio compra'}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setEditingField('precioCompra'); }}
                    aria-label="Editar precio compra"
                    sx={{ p: 0.25, color: campoFalta('precioCompra') ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 32, pl: 0.5 }}>
          {(isEditing || editingField === 'alquilerMensual') && onInputChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 32 }}>
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
                error={campoFalta('alquilerMensual')}
                sx={{
                  width: '100%',
                  maxWidth: 100,
                  '& .MuiInputBase-root': { minHeight: 28 },
                  '& .MuiInputBase-input': { textAlign: 'right', fontSize: 14 },
                  ...(campoFalta('alquilerMensual') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
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
              <Typography 
                component="span" 
                variant="body2" 
                onClick={(e) => {
                  if (campoFalta('alquilerMensual') && onInputChange) {
                    e.stopPropagation();
                    setEditingField('alquilerMensual');
                  }
                }}
                sx={{ 
                  fontSize: 14,
                  ...(campoFalta('alquilerMensual') ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } : {})
                }}
              >
                {card.alquilerEstimado > 0 ? formatEuro(card.alquilerEstimado) : (campoFalta('alquilerMensual') ? 'Alquiler' : formatEuro(card.alquilerEstimado))}/mes
              </Typography>
              {alquilerCambiado && onRevertField && (
                <Tooltip title="Deshacer alquiler estimado">
                  <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {onInputChange && (isCardHovered || campoFalta('alquilerMensual')) && (
                <Tooltip title={campoFalta('alquilerMensual') ? 'Completar alquiler estimado' : 'Editar alquiler estimado'}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setEditingField('alquilerMensual'); }}
                    aria-label="Editar alquiler estimado"
                    sx={{ p: 0.25, color: campoFalta('alquilerMensual') ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 32, display: 'flex', alignItems: 'center', flexWrap: 'wrap', pl: 0.5 }}>
          <Typography component="span" variant="body2" className="semaforo-value" sx={{ fontSize: 14, color: colorSemaforo }}>
            {card.rentabilidadNetaPct.toFixed(2)} %
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaRentabilidad} unit="%" />}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 32, display: 'flex', alignItems: 'center', flexWrap: 'wrap', pl: 0.5 }}>
          <Typography component="span" variant="body2" className="semaforo-value" sx={{ fontSize: 14, color: colorSemaforo }}>
            {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaCashflow} unit="€" />}
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 32, display: 'flex', alignItems: 'center', flexWrap: 'wrap', pl: 0.5 }}>
          <Typography component="span" variant="body2" className="semaforo-value" sx={{ fontSize: 14, color: colorSemaforo }}>
            {roceFinal !== null ? `${roceFinal.toFixed(2)} %` : '—'}
          </Typography>
          {showDeltas && <DeltaLabel delta={deltaRoce} unit="%" />}
        </Box>
      </Box>

      {/* Mobile: Información vertical compacta */}
      <Box className="card-info-mobile" sx={{ position: 'relative', pt: 1 }}>
        {/* Botones de acción - esquina superior derecha */}
        <Box sx={{ position: 'absolute', top: 0, right: 8, display: 'flex', gap: 1, zIndex: 10 }}>
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
        </Box>
        
        {/* Comunidad autónoma - primera fila, con espacio para los iconos */}
        <Box sx={{ mb: 1.5, pr: 10 }}>
          <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase' }}>Comunidad autónoma</Typography>
          {onInputChange ? (
            <Autocomplete
              size="small"
              fullWidth
              openOnFocus
              options={opcionesComunidades}
              getOptionLabel={(option) => option.nombre}
              isOptionEqualToValue={(option, value) => option.codigo === value?.codigo}
              value={valorComunidadSeleccionada}
              onChange={(_, nuevaComunidad) => {
                if (nuevaComunidad) {
                  handleComunidadChange(nuevaComunidad.codigo);
                } else {
                  handleComunidadChange(0);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecciona comunidad"
                  error={campoFalta('codigoComunidadAutonoma')}
                  sx={{
                    fontSize: 16,
                    ...(campoFalta('codigoComunidadAutonoma')
                      ? {
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' },
                          '& .MuiInputBase-root': { 
                            backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                            color: prefersDarkMode ? '#fff' : '#000',
                          },
                        }
                      : {}),
                  }}
                />
              )}
              sx={{
                width: '100%',
                ...(prefersDarkMode ? {
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#3d3d3d',
                    color: '#e4e4e4',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#555',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#666',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#e4e4e4',
                  },
                } : {}),
              }}
              ListboxProps={{
                sx: {
                  maxHeight: 300,
                  ...(prefersDarkMode ? {
                    backgroundColor: '#2d2d2d',
                    color: '#e4e4e4',
                    '& .MuiAutocomplete-option': {
                      color: '#e4e4e4',
                      '&:hover': {
                        backgroundColor: '#3d3d3d',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: '#505050',
                      },
                    },
                  } : {}),
                },
              }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                fontSize: 16,
                fontWeight: 600,
                ...(campoFalta('codigoComunidadAutonoma') ? estiloCampoFaltante : {}),
              }}
            >
              {card.currentInput.codigoComunidadAutonoma
                ? NOMBRE_COMUNIDAD_POR_CODIGO[card.currentInput.codigoComunidadAutonoma]
                : campoFalta('codigoComunidadAutonoma')
                  ? '⚠️ Falta'
                  : '—'}
            </Typography>
          )}
        </Box>
        
        {/* Ciudad - segunda fila */}
        <Box sx={{ mb: 1.5, pr: 8 }}>
          <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase' }}>Ciudad</Typography>
          {onCiudadChange ? (
            <Autocomplete
              size="small"
              fullWidth
              openOnFocus
              options={opcionesCiudad}
              value={ciudad || null}
              onChange={(_, nuevaCiudad) => {
                handleCiudadChange(nuevaCiudad || '');
              }}
              disabled={!(codigoComunidadAutonoma >= 1 && codigoComunidadAutonoma <= 19)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecciona ciudad"
                  error={campoFalta('ciudad')}
                  sx={{
                    fontSize: 16,
                    ...(campoFalta('ciudad')
                      ? {
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' },
                          '& .MuiInputBase-root': { 
                            backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                            color: prefersDarkMode ? '#fff' : '#000',
                          },
                        }
                      : {}),
                  }}
                />
              )}
              sx={{
                width: '100%',
                ...(prefersDarkMode ? {
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#3d3d3d',
                    color: '#e4e4e4',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#555',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#666',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#e4e4e4',
                  },
                } : {}),
              }}
              ListboxProps={{
                sx: {
                  maxHeight: 300,
                  ...(prefersDarkMode ? {
                    backgroundColor: '#2d2d2d',
                    color: '#e4e4e4',
                    '& .MuiAutocomplete-option': {
                      color: '#e4e4e4',
                      '&:hover': {
                        backgroundColor: '#3d3d3d',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: '#505050',
                      },
                    },
                  } : {}),
                },
              }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                fontSize: 16,
                fontWeight: 600,
                ...(campoFalta('ciudad') ? estiloCampoFaltante : {}),
              }}
            >
              {card.ciudad || (campoFalta('ciudad') ? '⚠️ Falta' : '—')}
            </Typography>
          )}
        </Box>
        
        {/* Inmueble - segunda fila */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Inmueble</Typography>
            {onInmuebleChange && (isCardHovered || campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) && (
              <Tooltip title={(campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) ? 'Completar datos del inmueble' : 'Editar datos del inmueble'}>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setEditingField('inmueble'); }}
                  aria-label="Editar datos del inmueble"
                  sx={{ p: 0.25, color: (campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {editingField === 'inmueble' && onInmuebleChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="hab"
                value={habitacionesInput}
                onChange={(e) => setHabitacionesInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('habitaciones', habitacionesInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('habitaciones', habitacionesInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('habitaciones')}
                sx={{
                  width: 80,
                  '& .MuiInputBase-root': { minHeight: 36 },
                  '& .MuiInputBase-input': { fontSize: 14, textAlign: 'center' },
                  ...(campoFalta('habitaciones') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              {habitacionesCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer habitaciones">
                  <IconButton size="small" onClick={handleRevertInmueble('habitaciones')} aria-label="Deshacer habitaciones" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Typography component="span" sx={{ fontSize: 14, color: '#666' }}>·</Typography>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="m²"
                value={metrosCuadradosInput}
                onChange={(e) => setMetrosCuadradosInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('metrosCuadrados', metrosCuadradosInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('metrosCuadrados', metrosCuadradosInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('metrosCuadrados')}
                sx={{
                  width: 90,
                  '& .MuiInputBase-root': { minHeight: 36 },
                  '& .MuiInputBase-input': { fontSize: 14, textAlign: 'center' },
                  ...(campoFalta('metrosCuadrados') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              {metrosCuadradosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer metros cuadrados">
                  <IconButton size="small" onClick={handleRevertInmueble('metrosCuadrados')} aria-label="Deshacer metros cuadrados" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Typography component="span" sx={{ fontSize: 14, color: '#666' }}>·</Typography>
              <TextField
                type="number"
                size="small"
                variant="outlined"
                placeholder="baños"
                value={banosInput}
                onChange={(e) => setBanosInput(e.target.value)}
                onBlur={() => {
                  handleInmuebleFieldBlur('banos', banosInput);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInmuebleFieldBlur('banos', banosInput);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputProps={{ min: 0, step: 1 }}
                error={campoFalta('banos')}
                sx={{
                  width: 90,
                  '& .MuiInputBase-root': { minHeight: 36 },
                  '& .MuiInputBase-input': { fontSize: 14, textAlign: 'center' },
                  ...(campoFalta('banos') ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: '#f44336',
                      backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                      color: prefersDarkMode ? '#fff' : '#000',
                    }
                  } : {})
                }}
              />
              {banosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer baños">
                  <IconButton size="small" onClick={handleRevertInmueble('banos')} aria-label="Deshacer baños" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography 
              variant="body2" 
              onClick={(e) => {
                if ((campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos')) && onInmuebleChange) {
                  e.stopPropagation();
                  setEditingField('inmueble');
                }
              }}
              sx={{ 
                fontSize: 14, 
                lineHeight: 1.4,
                ...(campoFalta('habitaciones') || campoFalta('metrosCuadrados') || campoFalta('banos') 
                  ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } 
                  : {})
              }}
            >
              {card.habitaciones || campoFalta('habitaciones') ? `${card.habitaciones || '?'} hab` : ''} 
              {card.habitaciones || campoFalta('habitaciones') ? ' · ' : ''}
              {card.metrosCuadrados || campoFalta('metrosCuadrados') ? `${card.metrosCuadrados || '?'} m²` : ''}
              {card.metrosCuadrados || campoFalta('metrosCuadrados') ? ' · ' : ''}
              {card.banos || campoFalta('banos') ? `${card.banos || '?'} ${card.banos === 1 ? 'baño' : 'baños'}` : ''}
                {(!card.habitaciones && !campoFalta('habitaciones')) && (!card.metrosCuadrados && !campoFalta('metrosCuadrados')) && (!card.banos && !campoFalta('banos')) && '—'}
              </Typography>
              {habitacionesCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer habitaciones">
                  <IconButton size="small" onClick={handleRevertInmueble('habitaciones')} aria-label="Deshacer habitaciones" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {metrosCuadradosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer metros cuadrados">
                  <IconButton size="small" onClick={handleRevertInmueble('metrosCuadrados')} aria-label="Deshacer metros cuadrados" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {banosCambiado && onRevertInmueble && (
                <Tooltip title="Deshacer baños">
                  <IconButton size="small" onClick={handleRevertInmueble('banos')} aria-label="Deshacer baños" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                    <UndoIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
        {/* Precio compra y Alquiler - tercera fila */}
        <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase' }}>Precio compra</Typography>
            {(isEditing || editingField === 'precioCompra') && onInputChange ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                  error={campoFalta('precioCompra')}
                  sx={{ 
                    flex: 1, 
                    '& .MuiInputBase-root': { minHeight: 36 }, 
                    '& .MuiInputBase-input': { fontSize: 14 },
                    ...(campoFalta('precioCompra') ? {
                      '& .MuiOutlinedInput-root': {
                        borderColor: '#f44336',
                        backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                        color: prefersDarkMode ? '#fff' : '#000',
                      }
                    } : {})
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography 
                  variant="body2" 
                  onClick={(e) => {
                    if (campoFalta('precioCompra') && onInputChange) {
                      e.stopPropagation();
                      setEditingField('precioCompra');
                    }
                  }}
                  sx={{ 
                    fontSize: 16, 
                    fontWeight: 500,
                    ...(campoFalta('precioCompra') ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } : {})
                  }}
                >
                  {card.precioCompra > 0 ? formatEuro(card.precioCompra) : (campoFalta('precioCompra') ? '⚠️ Falta' : formatEuro(card.precioCompra))}
                </Typography>
                {precioCambiado && onRevertField && (
                  <Tooltip title="Deshacer precio compra">
                    <IconButton size="small" onClick={handleRevertPrecio} aria-label="Deshacer precio compra" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {onInputChange && (
                  <Tooltip title={campoFalta('precioCompra') ? 'Completar precio compra' : 'Editar precio compra'}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); setEditingField('precioCompra'); }} 
                      aria-label="Editar precio compra" 
                      sx={{ p: 0.25, color: campoFalta('precioCompra') ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase' }}>Alquiler estimado</Typography>
            {(isEditing || editingField === 'alquilerMensual') && onInputChange ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                  error={campoFalta('alquilerMensual')}
                  sx={{ 
                    flex: 1, 
                    '& .MuiInputBase-root': { minHeight: 36 }, 
                    '& .MuiInputBase-input': { fontSize: 14 },
                    ...(campoFalta('alquilerMensual') ? {
                      '& .MuiOutlinedInput-root': {
                        borderColor: '#f44336',
                        backgroundColor: prefersDarkMode ? '#8b6914' : '#fff9c4',
                        color: prefersDarkMode ? '#fff' : '#000',
                      }
                    } : {})
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography 
                  variant="body2" 
                  onClick={(e) => {
                    if (campoFalta('alquilerMensual') && onInputChange) {
                      e.stopPropagation();
                      setEditingField('alquilerMensual');
                    }
                  }}
                  sx={{ 
                    fontSize: 16, 
                    fontWeight: 500,
                    ...(campoFalta('alquilerMensual') ? { ...estiloCampoFaltante, cursor: 'pointer', '&:hover': { opacity: 0.8 } } : {})
                  }}
                >
                  {card.alquilerEstimado > 0 ? formatEuro(card.alquilerEstimado) : (campoFalta('alquilerMensual') ? 'Alquiler' : formatEuro(card.alquilerEstimado))}/mes
                </Typography>
                {alquilerCambiado && onRevertField && (
                  <Tooltip title="Deshacer alquiler estimado">
                    <IconButton size="small" onClick={handleRevertAlquiler} aria-label="Deshacer alquiler estimado" sx={{ p: 0.25, color: '#c62828', '&:hover': { color: '#b71c1c' } }}>
                      <UndoIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {onInputChange && (
                  <Tooltip title={campoFalta('alquilerMensual') ? 'Completar alquiler estimado' : 'Editar alquiler estimado'}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); setEditingField('alquilerMensual'); }} 
                      aria-label="Editar alquiler estimado" 
                      sx={{ p: 0.25, color: campoFalta('alquilerMensual') ? '#f44336' : '#666', '&:hover': { color: 'primary.main' } }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </Box>
        {/* Métricas - cuarta fila */}
        <Box className="card-metrics-values" sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase', height: 28, lineHeight: '14px', display: 'flex', alignItems: 'flex-start' }}>Rentabilidad neta</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', minHeight: 24 }}>
              <Typography variant="body2" className="semaforo-value" sx={{ fontSize: 16, fontWeight: 600, color: colorSemaforo, lineHeight: 1.2 }}>
                {card.rentabilidadNetaPct.toFixed(2)} %
              </Typography>
              {showDeltas && <DeltaLabel delta={deltaRentabilidad} unit="%" />}
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase', height: 28, lineHeight: '14px', display: 'flex', alignItems: 'flex-start' }}>Cashflow</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', minHeight: 24 }}>
              <Typography variant="body2" className="semaforo-value" sx={{ fontSize: 16, fontWeight: 600, color: colorSemaforo, lineHeight: 1.2 }}>
                {cashflowFinal !== null ? formatEuro(cashflowFinal) : '—'}
              </Typography>
              {showDeltas && <DeltaLabel delta={deltaCashflow} unit="€" />}
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#666', mb: 0.25, textTransform: 'uppercase', height: 28, lineHeight: '14px', display: 'flex', alignItems: 'flex-start' }}>ROCE</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', minHeight: 24 }}>
              <Typography variant="body2" className="semaforo-value" sx={{ fontSize: 16, fontWeight: 600, color: colorSemaforo, lineHeight: 1.2 }}>
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

// Memoizar el componente para evitar re-renders innecesarios
export const CardAnalisis = memo(CardAnalisisComponent);
