import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

interface ModalNotasProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes: string;
  onSave: (notes: string) => void;
}

export function ModalNotas({ isOpen, onClose, initialNotes, onSave }: ModalNotasProps) {
  const [notesDraft, setNotesDraft] = useState(initialNotes);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

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
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: prefersDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
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
          backgroundColor: prefersDarkMode ? '#1e1e1e' : '#fff',
          color: prefersDarkMode ? '#e4e4e4' : undefined,
          width: '100%',
          maxWidth: 420,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        <Box sx={{ px: 2, pt: 2, flexShrink: 0 }}>
          <Typography variant="h6" component="h3" sx={prefersDarkMode ? { color: '#fff' } : {}}>
            Notas sobre este piso
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, flex: 1, minHeight: 120 }}>
          <TextField
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Apunta aquí tus impresiones, visitas, llamadas…"
            multiline
            minRows={4}
            fullWidth
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: 14,
                ...(prefersDarkMode
                  ? {
                      backgroundColor: '#2d2d2d',
                      color: '#e4e4e4',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                    }
                  : {}),
              },
            }}
          />
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button variant="outlined" onClick={onClose} sx={prefersDarkMode ? { color: '#b0b0b0', borderColor: 'rgba(255,255,255,0.23)' } : {}}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={handleGuardar}>
            Guardar
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
