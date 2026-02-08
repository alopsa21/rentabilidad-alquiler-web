import { LegalPage } from './LegalPage';

export function LegalPrivacidad() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        <strong>No recogemos datos personales.</strong> Esta aplicación no requiere registro ni cuenta de usuario.
      </p>
      <p>
        No almacenamos correos electrónicos ni datos identificables. Los únicos datos que se guardan son los que usted genera al usar la herramienta (por ejemplo, resultados de análisis), y se almacenan únicamente en su navegador mediante <strong>localStorage</strong>.
      </p>
      <p>
        Puede borrar en cualquier momento todos los datos generados limpiando el almacenamiento local de su navegador o usando la opción «Limpiar panel» dentro de la aplicación.
      </p>
      <p>
        No compartimos datos con terceros. Si en el futuro se incorporaran análisis o cookies, se indicaría en esta política y en la de cookies.
      </p>
    </LegalPage>
  );
}
