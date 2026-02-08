import { Link } from 'react-router-dom';
import { type ReactNode } from 'react';

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto', minHeight: '60vh' }}>
      <Link to="/" style={{ color: '#1976d2', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 16 }}>
        ← Volver al inicio
      </Link>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 24, color: '#1a1a1a' }}>{title}</h1>
      <div style={{ lineHeight: 1.6, color: '#444' }}>{children}</div>
    </div>
  );
}
