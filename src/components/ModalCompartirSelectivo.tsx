import { useEffect, useState, useMemo } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';

interface ModalCompartirSelectivoProps {
  isOpen: boolean;
  onClose: () => void;
  cards: AnalisisCard[];
  resultadosPorTarjeta: Record<string, RentabilidadApiResponse>;
  onShare: (cardIds: string[]) => void;
}

export function ModalCompartirSelectivo({
  isOpen,
  onClose,
  cards,
  resultadosPorTarjeta,
  onShare,
}: ModalCompartirSelectivoProps) {
  // Solo mostrar tarjetas que tengan resultado - MEMOIZADO para evitar recálculos
  const cardsConResultado = useMemo(
    () => cards.filter((card) => resultadosPorTarjeta[card.id]),
    [cards, resultadosPorTarjeta]
  );
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Resetear selección cuando se abre el modal - solo depende de isOpen
  useEffect(() => {
    if (isOpen) {
      // Por defecto, seleccionar todas las tarjetas con resultado
      const allIds = cards.filter((card) => resultadosPorTarjeta[card.id]).map((card) => card.id);
      setSelectedIds(new Set(allIds));
    }
  }, [isOpen, cards, resultadosPorTarjeta]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleToggleCard = (cardId: string) => {
    setSelectedIds((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(cardId)) {
        nuevo.delete(cardId);
      } else {
        nuevo.add(cardId);
      }
      return nuevo;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(cardsConResultado.map((card) => card.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCompartir = () => {
    if (selectedIds.size === 0) {
      return;
    }
    onShare(Array.from(selectedIds));
    onClose();
  };

  const formatEuro = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEstadoColor = (estado: string): 'success' | 'warning' | 'error' => {
    if (estado === 'verde') return 'success';
    if (estado === 'amarillo') return 'warning';
    return 'error';
  };

  if (!isOpen) return null;

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          backgroundColor: 'background.paper',
          width: '100%',
          maxWidth: 600,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
          <Typography variant="h6" component="h3">
            Seleccionar tarjetas para compartir
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {selectedIds.size} de {cardsConResultado.length} tarjetas seleccionadas
          </Typography>
        </Box>

        {/* Botones de selección rápida */}
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={handleSelectAll}>
            Seleccionar todas
          </Button>
          <Button size="small" variant="outlined" onClick={handleDeselectAll}>
            Deseleccionar todas
          </Button>
        </Box>

        {/* Lista de tarjetas */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          {cardsConResultado.map((card) => {
            const resultado = resultadosPorTarjeta[card.id];
            const isSelected = selectedIds.has(card.id);
            const rentabilidadNeta = resultado
              ? Number(resultado.rentabilidadNeta)
              : 0;
            const rentabilidadNetaPct =
              rentabilidadNeta > -1 && rentabilidadNeta < 1
                ? rentabilidadNeta * 100
                : rentabilidadNeta;

            return (
              <Box
                key={card.id}
                onClick={() => handleToggleCard(card.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => {}} // Controlado por el onClick del Box
                  sx={{ mr: 1.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {card.ciudad || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.habitaciones} hab · {card.metrosCuadrados} m²
                    </Typography>
                    <Chip
                      label={card.estado.toUpperCase()}
                      size="small"
                      color={getEstadoColor(card.estado)}
                      sx={{ fontSize: 10, height: 20, ml: 'auto' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Precio: {formatEuro(card.precioCompra)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Alquiler: {formatEuro(card.alquilerEstimado)}/mes
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          rentabilidadNetaPct >= 5
                            ? 'success.main'
                            : rentabilidadNetaPct >= 3
                            ? 'warning.main'
                            : 'error.main',
                        fontWeight: 600,
                      }}
                    >
                      {rentabilidadNetaPct.toFixed(2)}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Footer con botones */}
        <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCompartir}
            disabled={selectedIds.size === 0}
          >
            Compartir {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
