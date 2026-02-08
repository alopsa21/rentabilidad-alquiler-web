import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '24px 16px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fafafa',
        fontSize: 14,
        color: '#666',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
          <Link to="/legal/aviso" style={{ color: '#1976d2', textDecoration: 'none' }}>Aviso legal</Link>
          <Link to="/legal/privacidad" style={{ color: '#1976d2', textDecoration: 'none' }}>Privacidad</Link>
          <Link to="/legal/cookies" style={{ color: '#1976d2', textDecoration: 'none' }}>Cookies</Link>
          <Link to="/legal/disclaimer" style={{ color: '#1976d2', textDecoration: 'none' }}>Disclaimer</Link>
          <Link to="/contacto" style={{ color: '#1976d2', textDecoration: 'none' }}>Contacto</Link>
        </div>
        <div>© 2026 Rentabilidad Alquiler</div>
      </div>
    </footer>
  );
}
