import { LegalPage } from './LegalPage';

export function LegalCookies() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Esta aplicación <strong>no utiliza cookies de seguimiento</strong> ni publicitarias.
      </p>
      <p>
        Se utiliza <strong>localStorage</strong> del navegador con fines técnicos (guardar sus análisis y preferencias de forma local). No se envía esta información a ningún servidor de terceros.
      </p>
      <p>
        En el futuro podría incorporarse un sistema de análisis de uso (analytics) para mejorar el producto. En ese caso se actualizaría esta política y se informaría del uso de cookies o tecnologías similares.
      </p>
    </LegalPage>
  );
}
