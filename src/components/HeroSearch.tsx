import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ClearIcon from '@mui/icons-material/Clear';
import { STORAGE_KEY_URL } from '../constants/storage';

interface HeroSearchProps {
  onAnalizar: (url: string) => void;
  loading?: boolean;
}

export function HeroSearch({ onAnalizar, loading = false }: HeroSearchProps) {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_URL) ?? '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (url) {
        localStorage.setItem(STORAGE_KEY_URL, url);
      } else {
        localStorage.removeItem(STORAGE_KEY_URL);
      }
    } catch {
      // ignore
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (url.trim()) onAnalizar(url.trim());
  };

  const handleButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (url.trim()) onAnalizar(url.trim());
  };

  return (
    <section
      className="hero-search"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px 16px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" sx={{ mb: 1.5, maxWidth: 520, fontSize: { xs: '1.75rem', sm: '2.25rem' }, fontWeight: 700 }}>
        Invertir en alquiler, sin hojas de Excel
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5, maxWidth: 420 }}>
        Pega el enlace de un piso y te decimos en segundos si merece la pena.
      </Typography>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <TextField
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega aquí el enlace del anuncio"
          aria-label="URL del anuncio"
          fullWidth
          size="medium"
          InputProps={{
            endAdornment: url ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setUrl('')}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Borrar URL"
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              fontSize: 16,
              overflow: 'hidden',
            },
            '& .MuiInputBase-input': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !url.trim()}
          onClick={handleButtonClick}
          onTouchEnd={handleButtonClick}
          disableRipple
          sx={{
            py: 1.75,
            fontSize: 16,
            fontWeight: 600,
            minWidth: 140,
            outline: 'none',
            border: 'none',
            backgroundColor: loading ? '#1976d2' : '#1976d2',
            color: '#fff',
            '&:disabled': {
              backgroundColor: loading ? '#1976d2' : '#999',
              color: '#fff',
              opacity: loading ? 1 : 0.6,
              cursor: 'not-allowed',
            },
            '&:hover:not(:disabled)': {
              backgroundColor: '#1565c0',
            },
            '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
            '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
            '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
          }}
        >
          Analizar piso
        </Button>
      </form>
      <Typography variant="body2" color="text.disabled" sx={{ mt: 3 }}>
        Sin registros · Sin spam · Análisis instantáneo
      </Typography>
    </section>
  );
}
