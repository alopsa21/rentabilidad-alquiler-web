import { useState, useEffect } from 'react';
import { STORAGE_KEY_URL } from '../constants/storage';

interface HeaderRentabilidadProps {
  onAnalizar: (url: string) => void;
  loading?: boolean;
  resetUrlTrigger?: number; // Cuando cambia, resetea la URL
}

export function HeaderRentabilidad({ onAnalizar, loading = false, resetUrlTrigger }: HeaderRentabilidadProps) {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_URL) ?? '';
    } catch {
      return '';
    }
  });

  // Resetear URL cuando cambia resetUrlTrigger
  useEffect(() => {
    if (resetUrlTrigger !== undefined && resetUrlTrigger > 0) {
      setUrl('');
      try {
        localStorage.removeItem(STORAGE_KEY_URL);
      } catch {
        // ignore
      }
    }
  }, [resetUrlTrigger]);

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
    onAnalizar(url);
  };

  return (
    <header
      className="header-rentabilidad"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '90%',
          width: '90%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap' }}>
          Rentabilidad Alquiler
        </h1>
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega la URL del anuncio..."
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 14,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
            aria-label="URL del anuncio"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              border: '1px solid #333',
              borderRadius: 6,
              backgroundColor: '#333',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
          >
            {loading ? 'Analizando...' : 'Analizar'}
          </button>
        </form>
      </div>
    </header>
  );
}
