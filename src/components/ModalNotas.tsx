import { useEffect, useState } from 'react';

interface ModalNotasProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes: string;
  onSave: (notes: string) => void;
}

export function ModalNotas({ isOpen, onClose, initialNotes, onSave }: ModalNotasProps) {
  const [notesDraft, setNotesDraft] = useState(initialNotes);

  useEffect(() => {
    if (isOpen) {
      setNotesDraft(initialNotes);
    }
  }, [isOpen, initialNotes]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleGuardar = () => {
    onSave(notesDraft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: 420,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#333' }}>
            Notas sobre este piso
          </h3>
        </div>
        <div style={{ padding: 12, flex: 1, minHeight: 120 }}>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Escribe aquí tus apuntes..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 8,
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            autoFocus
          />
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              border: '1px solid #ccc',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              border: 'none',
              borderRadius: 8,
              background: '#1976d2',
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
