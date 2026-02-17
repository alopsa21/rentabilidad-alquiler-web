import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ClearIcon from '@mui/icons-material/Clear';
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
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <Box sx={{ maxWidth: '90%', width: '90%', margin: '0 auto', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
        <Typography variant="h6" component="h1" sx={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
          Rentabilidad Alquiler
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <TextField
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega la URL del anuncio..."
            aria-label="URL del anuncio"
            size="small"
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
              flex: 1, 
              minWidth: 0,
              width: { xs: '100%', sm: 'auto' },
              '& .MuiOutlinedInput-root': {
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
            color="primary"
            disabled={loading || !url.trim()}
            onClick={handleButtonClick}
            onTouchEnd={handleButtonClick}
            disableRipple
            sx={{
              whiteSpace: 'nowrap',
              minHeight: 40,
              minWidth: { xs: '100%', sm: 100 },
              width: { xs: '100%', sm: 'auto' },
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
            Analizar
          </Button>
        </Box>
      </Box>
    </header>
  );
}
