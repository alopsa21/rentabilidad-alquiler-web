import { useEffect } from 'react';
import type { AnalisisCard } from '../types/analisis';
import type { RentabilidadApiResponse } from '../types/api';
import { DetalleAnalisis } from './DetalleAnalisis';

interface ModalDetalleProps {
  card: AnalisisCard;
  resultado: RentabilidadApiResponse;
  isOpen: boolean;
  onClose: () => void;
}

export function ModalDetalle({ card, resultado, isOpen, onClose }: ModalDetalleProps) {
  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-detalle-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        className="modal-detalle-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '100%',
          maxHeight: '90vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
          animation: 'slideUp 0.3s ease-out',
          boxSizing: 'border-box',
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar detalle"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 28,
            lineHeight: 1,
            cursor: 'pointer',
            color: '#666',
            zIndex: 10,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>

        {/* Contenido del detalle */}
        <div style={{ padding: '20px 16px 40px', boxSizing: 'border-box', maxWidth: '100%', overflow: 'hidden' }}>
          <DetalleAnalisis card={card} resultado={resultado} />
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
