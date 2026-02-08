import { LegalPage } from './LegalPage';

const CONTACT_EMAIL = 'contacto@rentabilidadalquiler.es';

export function Contacto() {
  return (
    <LegalPage title="Contacto">
      <p>
        Puede contactarnos en:
      </p>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#1976d2', fontWeight: 500 }}>
          {CONTACT_EMAIL}
        </a>
      </p>
      <p style={{ fontSize: 14, color: '#666' }}>
        Responderemos en la mayor brevedad posible.
      </p>
    </LegalPage>
  );
}
