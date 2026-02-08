import { useState, useEffect } from 'react';
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
      <h1
        style={{
          margin: '0 0 12px',
          fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#1a1a1a',
          maxWidth: 520,
        }}
      >
        Invertir en alquiler, sin hojas de Excel
      </h1>
      <p
        style={{
          margin: '0 0 28px',
          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
          color: '#666',
          maxWidth: 420,
          lineHeight: 1.45,
        }}
      >
        Pega el enlace de un piso y te decimos en segundos si merece la pena.
      </p>
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
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega aquí el enlace del anuncio"
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 16,
            border: '1px solid #ccc',
            borderRadius: 8,
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          aria-label="URL del anuncio"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          onClick={handleButtonClick}
          onTouchEnd={handleButtonClick}
          style={{
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600,
            border: 'none',
            borderRadius: 8,
            backgroundColor: loading || !url.trim() ? '#999' : '#1976d2',
            color: '#fff',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            minHeight: 48,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {loading ? 'Analizando...' : 'Analizar piso'}
        </button>
      </form>
      <p
        style={{
          margin: '24px 0 0',
          fontSize: 13,
          color: '#888',
        }}
      >
        Sin registros · Sin spam · Análisis instantáneo
      </p>
    </section>
  );
}
