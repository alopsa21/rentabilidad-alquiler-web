import { LegalPage } from './LegalPage';

export function LegalDisclaimer() {
  return (
    <LegalPage title="Disclaimer financiero">
      <p>
        Esta herramienta proporciona <strong>estimaciones orientativas</strong> y no constituye asesoramiento financiero, fiscal ni legal.
      </p>
      <p>
        Las cifras mostradas pueden no reflejar resultados reales. Los cálculos se basan en datos introducidos por el usuario y en fórmulas genéricas; no tienen en cuenta su situación personal ni la normativa aplicable en cada caso.
      </p>
      <p>
        Para decisiones de inversión o fiscalidad, consulte siempre con un profesional cualificado.
      </p>
    </LegalPage>
  );
}
