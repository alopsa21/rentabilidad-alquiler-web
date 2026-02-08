import { LegalPage } from './LegalPage';

export function LegalAviso() {
  return (
    <LegalPage title="Aviso legal">
      <p>
        <strong>Responsable:</strong> Rentabilidad Alquiler (herramienta educativa).
      </p>
      <p>
        <strong>Contacto:</strong>{' '}
        <a href="mailto:contacto@rentabilidadalquiler.es">contacto@rentabilidadalquiler.es</a>
      </p>
      <p>
        <strong>País:</strong> España
      </p>
      <p>
        Este proyecto es una herramienta educativa para estimar rentabilidades de alquiler. No constituye asesoramiento legal, fiscal ni financiero.
      </p>
    </LegalPage>
  );
}
