import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { STORAGE_KEY_URL } from '../constants/storage';

interface CompactSearchHeaderProps {
  onAnalizar: (url: string) => void;
  loading?: boolean;
}

export function CompactSearchHeader({ onAnalizar, loading = false }: CompactSearchHeaderProps) {
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
    <header
      className="compact-search-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <Box sx={{ maxWidth: '90%', width: '90%', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h6" component="h1" sx={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
          Rentabilidad Alquiler
        </Typography>
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <TextField
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega la URL del anuncio..."
            aria-label="URL del anuncio"
            size="small"
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !url.trim()}
            onClick={handleButtonClick}
            onTouchEnd={handleButtonClick}
            disableRipple
            sx={{
              whiteSpace: 'nowrap',
              minHeight: 40,
              outline: 'none',
              border: 'none',
              '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
              '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
              '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
            }}
          >
            {loading ? 'Analizando...' : 'Analizar'}
          </Button>
        </form>
      </Box>
    </header>
  );
}
